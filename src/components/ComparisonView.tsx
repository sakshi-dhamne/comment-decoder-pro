import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { AnalysisResult } from "@/types/analysis";

interface ComparisonViewProps {
  results: (AnalysisResult | { error: string; videoUrl: string })[];
}

const COLORS = ["hsl(0, 72%, 51%)", "hsl(210, 80%, 55%)", "hsl(142, 71%, 45%)", "hsl(45, 90%, 50%)", "hsl(280, 60%, 55%)"];

const ComparisonView = ({ results }: ComparisonViewProps) => {
  const valid = results.filter((r): r is AnalysisResult => !("error" in r));
  const errors = results.filter((r): r is { error: string; videoUrl: string } => "error" in r);

  if (valid.length === 0) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center">
          <p className="text-destructive">All videos failed to analyze.</p>
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-muted-foreground mt-1">{e.videoUrl}: {e.error}</p>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Sentiment comparison chart
  const sentimentData = [
    {
      name: "Positive",
      ...Object.fromEntries(valid.map((r, i) => [`v${i}`, Math.round(r.sentiment.positive / r.totalAnalyzed * 100)])),
    },
    {
      name: "Neutral",
      ...Object.fromEntries(valid.map((r, i) => [`v${i}`, Math.round(r.sentiment.neutral / r.totalAnalyzed * 100)])),
    },
    {
      name: "Negative",
      ...Object.fromEntries(valid.map((r, i) => [`v${i}`, Math.round(r.sentiment.negative / r.totalAnalyzed * 100)])),
    },
  ];

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="py-3">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive">Failed: {e.videoUrl} — {e.error}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Video Cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(valid.length, 3)}, 1fr)` }}>
        {valid.map((r, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <Badge variant="secondary" className="text-xs">Video {i + 1}</Badge>
              </div>
              <img src={r.video.thumbnail} alt={r.video.title} className="w-full rounded-md" />
              <h3 className="text-sm font-semibold text-foreground line-clamp-2">{r.video.title}</h3>
              <p className="text-xs text-muted-foreground">{r.video.channelTitle}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{r.totalAnalyzed} comments</span>
                <span>{Math.round(r.sentiment.positive / r.totalAnalyzed * 100)}% positive</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sentiment Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Comparison (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={sentimentData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {valid.map((r, i) => (
                  <Bar
                    key={i}
                    dataKey={`v${i}`}
                    name={r.video.title.slice(0, 30)}
                    fill={COLORS[i]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Topic Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Topic Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(valid.length, 3)}, 1fr)` }}>
            {valid.map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm font-medium text-foreground">{r.video.title.slice(0, 25)}...</span>
                </div>
                {r.topics.slice(0, 5).map((t, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{t.topic}</Badge>
                    <span className="text-xs text-muted-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights per video */}
      {valid.map((r, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              AI Insights: {r.video.title.slice(0, 50)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{r.insights.summary}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Top Recommendations</p>
                {r.insights.recommendations.slice(0, 3).map((rec, j) => (
                  <p key={j} className="text-xs text-muted-foreground">• {rec}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Key Complaints</p>
                {r.insights.complaints.slice(0, 3).map((c, j) => (
                  <p key={j} className="text-xs text-muted-foreground">• {c}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ComparisonView;
