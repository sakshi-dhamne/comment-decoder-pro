import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCooldown } from "@/hooks/useCooldown";
import { DEFAULT_COOLDOWN_SECONDS } from "@/lib/rateLimitStore";

const AIRateLimitBanner = () => {
  const { active, secondsLeft } = useCooldown();
  if (!active) return null;

  const pct = Math.max(0, Math.min(100, ((DEFAULT_COOLDOWN_SECONDS - secondsLeft) / DEFAULT_COOLDOWN_SECONDS) * 100));

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            AI rate limit reached
          </p>
          <p className="text-xs text-muted-foreground">
            Lovable AI Gateway is cooling down. New AI requests will resume shortly.
          </p>
          <Progress value={pct} className="h-1 mt-2" />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums text-warning">
          <Clock className="w-3.5 h-3.5" />
          {secondsLeft}s
        </div>
      </CardContent>
    </Card>
  );
};

export default AIRateLimitBanner;
