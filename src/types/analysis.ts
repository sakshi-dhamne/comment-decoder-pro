export interface AnalysisResult {
  video: {
    title: string;
    channelTitle: string;
    thumbnail: string;
    viewCount: string;
    commentCount: string;
  };
  totalAnalyzed: number;
  sentiment: { positive: number; negative: number; neutral: number };
  categories: Record<string, number>;
  categorySamples: Record<string, string[]>;
  topics: { topic: string; count: number; comments: string[] }[];
  keywords: { word: string; count: number }[];
  insights: {
    summary: string;
    likes: string[];
    dislikes: string[];
    complaints: string[];
    recommendations: string[];
  };
  comments: {
    author: string;
    text: string;
    likeCount: number;
    sentiment: "positive" | "negative" | "neutral";
    category: string;
    publishedAt: string;
  }[];
}
