import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import type { NextStep } from "@/types/analysis";

interface AIInsightsProps {
  insights: {
    summary: string;
    likes: string[];
    dislikes: string[];
    complaints: string[];
    recommendations: string[];
    nextSteps?: NextStep[];
  };
}

const priorityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const AIInsights = ({ insights }: AIInsightsProps) => {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{insights.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* What to Do Next */}
      {insights.nextSteps && insights.nextSteps.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              What to Do Next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.nextSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{step.action}</span>
                    <Badge className={`text-[10px] border ${priorityStyles[step.priority]}`}>
                      {step.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.rationale}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Likes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-positive" />
              What Audiences Like
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.likes.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="bg-positive/10 text-positive border-positive/20 shrink-0 text-xs">+</Badge>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dislikes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-negative" />
              What Audiences Dislike
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.dislikes.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="bg-negative/10 text-negative border-negative/20 shrink-0 text-xs">−</Badge>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Complaints */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Key Complaints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.complaints.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-orange-500 shrink-0">⚠</span>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Actionable Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.recommendations.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary shrink-0 font-bold text-xs">{i + 1}.</span>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIInsights;
