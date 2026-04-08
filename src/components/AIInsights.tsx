import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles } from "lucide-react";

interface AIInsightsProps {
  insights: {
    summary: string;
    likes: string[];
    dislikes: string[];
    complaints: string[];
    recommendations: string[];
  };
}

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
