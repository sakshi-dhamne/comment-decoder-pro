import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, MessageSquare, TrendingUp, BarChart3, Youtube, Share2, Sparkles, Tag, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MultiUrlInput from "@/components/MultiUrlInput";
import SentimentChart from "@/components/SentimentChart";
import TopicList from "@/components/TopicList";
import CommentList from "@/components/CommentList";
import VideoInfo from "@/components/VideoInfo";
import AIInsights from "@/components/AIInsights";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import KeywordCloud from "@/components/KeywordCloud";
import ComparisonView from "@/components/ComparisonView";
import ReportHistory from "@/components/ReportHistory";
import { downloadJSON, downloadCSV } from "@/lib/downloadReport";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import type { AnalysisResult } from "@/types/analysis";

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResults, setComparisonResults] = useState<(AnalysisResult | { error: string; videoUrl: string })[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const { toast } = useToast();

  const handleAnalyzeSingle = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setComparisonResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-comments", {
        body: { videoUrl: url },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
      // Report is saved server-side in the edge function
      setReportRefreshKey((k) => k + 1);
    } catch (e: any) {
      const msg = e?.message || "Failed to analyze comments";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeMultiple = async (urls: string[]) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setComparisonResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-comments", {
        body: { videoUrls: urls },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.comparison) {
        setComparisonResults(data.results);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to analyze";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (!result) return;
    const shareData = {
      title: `Comment Insights: ${result.video.title}`,
      text: `${result.totalAnalyzed} comments analyzed — ${Math.round(result.sentiment.positive / result.totalAnalyzed * 100)}% positive`,
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      toast({ title: "Copied to clipboard", description: "Report link copied!" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Youtube className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Comment Insights</h1>
              <p className="text-sm text-muted-foreground">AI-powered sentiment, categorization & trend analysis</p>
            </div>
            <ThemeToggle />
          </div>
          <MultiUrlInput onSubmitSingle={handleAnalyzeSingle} onSubmitMultiple={handleAnalyzeMultiple} isLoading={isLoading} />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        {/* Loading */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing comments with AI...</p>
            <p className="text-xs text-muted-foreground mt-1">Sentiment, categorization, and insights generation</p>
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

        {/* Comparison Results */}
        <AnimatePresence>
          {comparisonResults && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <GitCompareArrows className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Multi-Video Comparison</h2>
              </div>
              <ComparisonView results={comparisonResults} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single Video Results */}
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
                  { label: "Topics", value: result.topics.length, icon: BarChart3 },
                  { label: "Categories", value: Object.keys(result.categories).filter(k => result.categories[k] > 0).length, icon: Tag },
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

              {/* Tabbed Dashboard */}
              <Tabs defaultValue="insights" className="space-y-4">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="insights" className="gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Insights
                  </TabsTrigger>
                  <TabsTrigger value="sentiment" className="gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Sentiment
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Categories
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Trends
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Comments
                  </TabsTrigger>
                </TabsList>

                {/* AI Insights Tab */}
                <TabsContent value="insights">
                  <AIInsights insights={result.insights} />
                </TabsContent>

                {/* Sentiment Tab */}
                <TabsContent value="sentiment">
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
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Comment Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CategoryBreakdown categories={result.categories} categorySamples={result.categorySamples} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Trends Tab */}
                <TabsContent value="trends">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Keyword Cloud</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <KeywordCloud keywords={result.keywords} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Topics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TopicList topics={result.topics.slice(0, 10)} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Comments</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleShare}>
                          <Share2 className="w-3 h-3 mr-1" /> Share
                        </Button>
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
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !comparisonResults && !isLoading && !error && (
          <div className="text-center py-12 space-y-3">
            <Youtube className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Paste a YouTube URL above to get started</p>
            <p className="text-xs text-muted-foreground">Or compare multiple videos side-by-side</p>
          </div>
        )}

        {/* Report History - always visible when not loading */}
        {!isLoading && (
          <ReportHistory
            onLoad={(data) => { setResult(data); setComparisonResults(null); setError(null); }}
            refreshKey={reportRefreshKey}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
