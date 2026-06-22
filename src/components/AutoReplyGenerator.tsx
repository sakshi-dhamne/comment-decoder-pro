import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, MessageSquareReply, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startCooldown } from "@/lib/rateLimitStore";
import { useCooldown } from "@/hooks/useCooldown";

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

const AutoReplyGenerator = ({ comment, videoTitle, onClose }: AutoReplyGeneratorProps) => {
  const [tone, setTone] = useState<Tone>("friendly");
  const [replies, setReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { toast } = useToast();
  const cooldown = useCooldown();

  const generateReplies = async () => {
    if (cooldown.active) return;
    setIsLoading(true);
    setReplies([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reply", {
        body: { commentText: comment.text, tone, videoTitle },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setReplies(data.replies || []);
      if (data?.fallback) {
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
          >
            {toneEmoji[t]} {t}
          </Button>
        ))}
      </div>

      <Button
        onClick={generateReplies}
        disabled={isLoading || cooldown.active}
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
        ) : (
          <>
            <MessageSquareReply className="w-3 h-3 mr-1" /> Generate Replies
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
