import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, BarChart3 } from "lucide-react";
import { FREE_DAILY_LIMIT, getUsedToday } from "@/lib/usageTracking";

interface UpgradePromptProps {
  variant?: "banner" | "card";
  onDismiss?: () => void;
}

const UpgradePrompt = ({ variant = "card" }: UpgradePromptProps) => {
  const used = getUsedToday();

  if (variant === "banner") {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-foreground">
            <span className="font-medium">Daily limit reached</span> ({used}/{FREE_DAILY_LIMIT}).
            Upgrade for unlimited analyses.
          </span>
        </div>
        <Button size="sm" variant="default" className="h-8">
          <Crown className="w-3 h-3 mr-1" /> Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-amber-500/5">
      <CardContent className="py-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-primary/10">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">You've used your free analyses</h3>
          <p className="text-sm text-muted-foreground">
            {used}/{FREE_DAILY_LIMIT} analyses used today. Upgrade to Pro for unlimited access.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground max-w-md mx-auto pt-2">
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-primary" />
            <span>Unlimited</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Deeper AI</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Crown className="w-4 h-4 text-primary" />
            <span>No ads</span>
          </div>
        </div>
        <Button className="mt-2">
          <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro
        </Button>
        <p className="text-xs text-muted-foreground">Limit resets at midnight.</p>
      </CardContent>
    </Card>
  );
};

export default UpgradePrompt;
