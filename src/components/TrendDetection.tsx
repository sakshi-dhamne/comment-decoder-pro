import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";
import type { TrendingTopic } from "@/types/analysis";

interface TrendDetectionProps {
  trendingTopics?: TrendingTopic[];
  keywords: { word: string; count: number }[];
}

const signalConfig = {
  rising: { icon: TrendingUp, label: "Rising", className: "bg-positive/10 text-positive border-positive/20" },
  steady: { icon: Minus, label: "Steady", className: "bg-muted text-muted-foreground border-border" },
  declining: { icon: TrendingDown, label: "Declining", className: "bg-negative/10 text-negative border-negative/20" },
};

const TrendDetection = ({ trendingTopics, keywords }: TrendDetectionProps) => {
  return (
    <div className="space-y-6">
      {/* AI-detected trends */}
      {trendingTopics && trendingTopics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Topic Trends</h3>
          <div className="grid gap-2">
            {trendingTopics.map((trend, i) => {
              const config = signalConfig[trend.signal] || signalConfig.steady;
              const SignalIcon = config.icon;
              return (
                <Card key={i} className="hover:border-primary/20 transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <SignalIcon className={`w-4 h-4 shrink-0 ${trend.signal === "rising" ? "text-positive" : trend.signal === "declining" ? "text-negative" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground">{trend.topic}</span>
                          <Badge className={`text-[10px] border ${config.className}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{trend.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyword frequency */}
      {keywords.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Keyword Frequency</h3>
          <div className="space-y-1.5">
            {keywords.slice(0, 15).map((k) => {
              const maxCount = keywords[0]?.count || 1;
              const pct = Math.round((k.count / maxCount) * 100);
              return (
                <div key={k.word} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-24 truncate font-medium">{k.word}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{k.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!trendingTopics || trendingTopics.length === 0) && keywords.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No trend data available.</p>
      )}
    </div>
  );
};

export default TrendDetection;
