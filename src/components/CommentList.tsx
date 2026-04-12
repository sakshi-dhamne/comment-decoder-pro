import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareReply } from "lucide-react";
import AutoReplyGenerator from "@/components/AutoReplyGenerator";

interface Comment {
  author: string;
  text: string;
  likeCount: number;
  sentiment: "positive" | "negative" | "neutral";
  category?: string;
  publishedAt: string;
}

const sentimentStyles: Record<string, string> = {
  positive: "bg-positive/10 text-positive border-positive/20",
  negative: "bg-negative/10 text-negative border-negative/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

const CommentList = ({ comments, videoTitle }: { comments: Comment[]; videoTitle?: string }) => {
  const [filter, setFilter] = useState<string>("all");
  const [showCount, setShowCount] = useState(20);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const filtered = filter === "all" ? comments : comments.filter(c => c.sentiment === filter);
  const visible = filtered.slice(0, showCount);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "positive", "neutral", "negative"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(f); setShowCount(20); }}
            className="capitalize"
          >
            {f} {f === "all" ? `(${comments.length})` : `(${comments.filter(c => c.sentiment === f).length})`}
          </Button>
        ))}
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {visible.map((c, i) => (
          <div key={i}>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{c.author}</span>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs border ${sentimentStyles[c.sentiment]}`}>
                    {c.sentiment}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setReplyingTo(replyingTo === i ? null : i)}
                  >
                    <MessageSquareReply className="w-3 h-3 mr-1" /> Reply
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{c.text}</p>
              {c.likeCount > 0 && (
                <span className="text-xs text-muted-foreground mt-1 inline-block">👍 {c.likeCount}</span>
              )}
            </div>
            {replyingTo === i && (
              <div className="mt-2">
                <AutoReplyGenerator
                  comment={c}
                  videoTitle={videoTitle}
                  onClose={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {visible.length < filtered.length && (
        <Button variant="outline" size="sm" onClick={() => setShowCount(s => s + 20)}>
          Show more ({filtered.length - visible.length} remaining)
        </Button>
      )}
    </div>
  );
};

export default CommentList;
