import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, MessageSquare, TrendingUp, BarChart3, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UrlInput from "@/components/UrlInput";
import SentimentChart from "@/components/SentimentChart";
import TopicList from "@/components/TopicList";
import CommentList from "@/components/CommentList";
import VideoInfo from "@/components/VideoInfo";
import { downloadJSON, downloadCSV } from "@/lib/downloadReport";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  video: { title: string; channelTitle: string; thumbnail: string; viewCount: string; commentCount: string };
  totalAnalyzed: number;
  sentiment: { positive: number; negative: number; neutral: number };
  topics: { topic: string; count: number; comments: string[] }[];
  comments: { author: string; text: string; likeCount: number; sentiment: "positive" | "negative" | "neutral"; publishedAt: string }[];
}

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-comments", {
        body: { videoUrl: url },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to analyze comments";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Youtube className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Comment Insights</h1>
              <p className="text-sm text-muted-foreground">Analyze sentiment & topics from YouTube comments</p>
            </div>
          </div>
          <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        {/* Loading */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Fetching & analyzing comments...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
          </motion.div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-6 text-center">
                <p className="text-destructive font-medium">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Video Info */}
              <Card>
                <CardContent className="pt-6">
                  <VideoInfo video={result.video} totalAnalyzed={result.totalAnalyzed} />
                </CardContent>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Analyzed", value: result.totalAnalyzed, icon: MessageSquare },
                  { label: "Positive", value: `${Math.round((result.sentiment.positive / result.totalAnalyzed) * 100)}%`, icon: TrendingUp },
                  { label: "Topics Found", value: result.topics.length, icon: BarChart3 },
                  { label: "Avg Likes", value: Math.round(result.comments.reduce((s, c) => s + c.likeCount, 0) / result.comments.length), icon: TrendingUp },
                ].map((s, i) => (
                  <Card key={i}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <s.icon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sentiment & Topics */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sentiment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SentimentChart sentiment={result.sentiment} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TopicList topics={result.topics} />
                  </CardContent>
                </Card>
              </div>

              {/* Comments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Comments</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadCSV(result.comments, "comments.csv")}>
                      <Download className="w-3 h-3 mr-1" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadJSON(result, "report.json")}>
                      <Download className="w-3 h-3 mr-1" /> JSON
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CommentList comments={result.comments} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="text-center py-20 space-y-3">
            <Youtube className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Paste a YouTube URL above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
