import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCooldown } from "@/hooks/useCooldown";
import { getCooldownTotal } from "@/lib/rateLimitStore";

const AIRateLimitBanner = () => {
  const { active, secondsLeft } = useCooldown();
  if (!active) return null;

  const total = getCooldownTotal();
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            AI rate limit reached — quota temporarily exhausted
          </p>
          <p className="text-xs text-muted-foreground">
            The AI service is cooling down. New AI requests will resume automatically when the timer hits zero.
          </p>
          <Progress value={pct} className="h-1 mt-2" />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums text-primary">
          <Clock className="w-3.5 h-3.5" />
          {secondsLeft}s
        </div>
      </CardContent>
    </Card>
  );
};

export default AIRateLimitBanner;
