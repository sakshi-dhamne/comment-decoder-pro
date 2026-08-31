import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Copy, Check, MessageSquareReply, Loader2, Clock, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startCooldown } from "@/lib/rateLimitStore";
import { useCooldown } from "@/hooks/useCooldown";
import {
  canGenerateReply,
  recordReplyGeneration,
  getRemainingReplies,
  getUsedRepliesToday,
  FREE_REPLY_DAILY_LIMIT,
  isPremium,
} from "@/lib/usageTracking";
import { getCachedReplies, setCachedReplies } from "@/lib/replyCache";

interface AutoReplyGeneratorProps {
  comment: {
    author: string;
    text: string;
  };
  videoTitle?: string;
  onClose: () => void;
}

type Tone = "friendly" | "professional" | "witty";

const toneEmoji: Record<Tone, string> = {
  friendly: "😊",
  professional: "💼",
  witty: "😏",
};

const fallbackReplies: Record<Tone, string[]> = {
  friendly: [
    "Thanks so much for sharing your thoughts! 😊 I really appreciate you watching and joining the conversation.",
    "I appreciate the comment! Glad to have you here, and thanks for taking the time to watch. 🙌",
    "Thanks for being part of the community! Your support and feedback mean a lot. 😊",
  ],
  professional: [
    "Thank you for your comment. I appreciate you taking the time to watch and share your perspective.",
    "Thanks for the feedback. I appreciate your engagement and will keep this in mind for future videos.",
    "Thank you for watching and contributing to the discussion. Your input is appreciated.",
  ],
  witty: [
    "Now that’s a comment worth pinning in spirit, if not literally. Thanks for watching!",
    "Appreciate you dropping by the comments section — the algorithm sends its regards.",
    "Thanks for the comment! The pixels and I both appreciate the support.",
  ],
};

const AutoReplyGenerator = ({ comment, videoTitle, onClose }: AutoReplyGeneratorProps) => {
  const [tone, setTone] = useState<Tone>("friendly");
  const [replies, setReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const { toast } = useToast();
  const cooldown = useCooldown();

  const premium = isPremium();
  const remaining = premium ? Infinity : getRemainingReplies();
  const used = premium ? 0 : getUsedRepliesToday();
  const quotaPct = premium ? 0 : Math.min(100, (used / FREE_REPLY_DAILY_LIMIT) * 100);


  useEffect(() => {
    const cached = getCachedReplies(comment.text, tone, videoTitle);
    if (cached) {
      setReplies(cached);
    } else {
      setReplies([]);
    }
  }, [comment.text, tone, videoTitle]);

  const showLocalLimitWarning = () => {
    toast({
      title: "Daily reply limit reached",
      description: `Free tier allows ${FREE_REPLY_DAILY_LIMIT} AI replies/day. Upgrade for unlimited.`,
      variant: "destructive",
    });
  };


  const generateReplies = async () => {
    if (cooldown.active) return;
    if (!isPremium() && !canGenerateReply()) {
      showLocalLimitWarning();
      return;
    }
    const cached = getCachedReplies(comment.text, tone, videoTitle);
    if (cached) {
      setReplies(cached);
      return;
    }

    setIsLoading(true);
    setUsedFallback(false);
    try {
      const { getSessionId } = await import("@/lib/sessionId");
      const { data, error } = await supabase.functions.invoke("generate-reply", {
        body: { commentText: comment.text, tone, videoTitle, sessionId: getSessionId() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const gotReplies = data.replies || fallbackReplies[tone];
      setReplies(gotReplies);
      setCachedReplies(comment.text, tone, gotReplies, videoTitle);

      if (!data?.fallback) {
        recordReplyGeneration();
      }

      if (data?.fallback) {

        setUsedFallback(true);
        startCooldown(typeof data?.retryAfter === "number" ? data.retryAfter : undefined);
        toast({
          title: "Using backup replies",
          description: data.warning || "AI is busy, so backup replies were shown instead.",
        });
      }
    } catch (e: any) {
      const message = String(e?.message || "");
      const isBusy = message.includes("429") || message.toLowerCase().includes("service is busy");
      if (isBusy) startCooldown();
      toast({
        title: isBusy ? "AI is busy" : "Error",
        description: isBusy
          ? "Rate limit hit. A cooldown timer is now showing on the button."
          : e?.message || "Failed to generate replies",
        variant: isBusy ? "default" : "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyReply = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: "Copied!", description: "Reply copied to clipboard" });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const outOfQuota = !premium && remaining <= 0;
  const disabled = isLoading || cooldown.active || outOfQuota;

  const remainingLabel = premium ? "unlimited" : String(remaining);


  return (
    <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareReply className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Reply to {comment.author}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-7">
          Close
        </Button>
      </div>

      <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 italic">
        "{comment.text.slice(0, 200)}{comment.text.length > 200 ? "..." : ""}"
      </p>

      {/* Tone selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tone:</span>
        {(["friendly", "professional", "witty"] as Tone[]).map((t) => (
          <Button
            key={t}
            variant={tone === t ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setTone(t)}
            disabled={isLoading}
          >
            {toneEmoji[t]} {t}
          </Button>
        ))}
      </div>

      {/* Quota indicator */}
      {!premium && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI replies today</span>
            <span className={remaining === 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
              {used}/{FREE_REPLY_DAILY_LIMIT} used
            </span>
          </div>
          <Progress value={quotaPct} className="h-1" />
        </div>
      )}


      {outOfQuota && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            You’ve used your {FREE_REPLY_DAILY_LIMIT} free AI replies today. Come back tomorrow or upgrade for unlimited.
          </p>
        </div>
      )}

      {usedFallback && (
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-2.5">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            AI is at capacity — these are backup replies. Generated replies will return once the cooldown resets.
          </p>
        </div>
      )}

      <Button
        onClick={generateReplies}
        disabled={disabled}
        size="sm"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...
          </>
        ) : cooldown.active ? (
          <>
            <Clock className="w-3 h-3 mr-1" /> AI cooling down — retry in {cooldown.secondsLeft}s
          </>
        ) : outOfQuota ? (
          <>
            <AlertCircle className="w-3 h-3 mr-1" /> Daily limit reached
          </>
        ) : (
          <>
            <MessageSquareReply className="w-3 h-3 mr-1" /> Generate Replies ({remainingLabel})
          </>
        )}


      </Button>


      {/* Generated replies */}
      {replies.length > 0 && (
        <div className="space-y-2">
          {replies.map((reply, i) => (
            <Card key={i} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground flex-1">{reply}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={copiedIdx === i ? "Reply copied to clipboard" : "Copy reply to clipboard"}
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => copyReply(reply, i)}
                  >
                    {copiedIdx === i ? (
                      <Check className="w-3.5 h-3.5 text-positive" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoReplyGenerator;
