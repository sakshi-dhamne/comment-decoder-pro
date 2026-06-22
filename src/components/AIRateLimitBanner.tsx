import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCooldown } from "@/hooks/useCooldown";
import { getCooldownTotal } from "@/lib/rateLimitStore";
import { isPremium } from "@/lib/usageTracking";

const AIRateLimitBanner = () => {
  const { active, secondsLeft } = useCooldown();
  if (!active) return null;

  const total = getCooldownTotal();
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3 px-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            AI is at capacity — cooling down
          </p>
          <p className="text-xs text-muted-foreground">
            Generated replies and analyses will resume automatically. Backup replies are still available during this window.
          </p>
          <Progress value={pct} className="h-1 mt-2" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums text-primary">
            <Clock className="w-3.5 h-3.5" />
            {secondsLeft}s
          </div>
          {!isPremium() && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Upgrade for priority access
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIRateLimitBanner;

