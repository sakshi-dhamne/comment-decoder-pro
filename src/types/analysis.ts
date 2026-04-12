export interface NextStep {
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface ContentIdea {
  title: string;
  description: string;
  type: "video" | "short" | "community_post" | "live_stream";
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface TrendingTopic {
  topic: string;
  signal: "rising" | "steady" | "declining";
  description: string;
}

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
    nextSteps?: NextStep[];
    contentIdeas?: ContentIdea[];
    faqs?: FAQ[];
    trendingTopics?: TrendingTopic[];
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
