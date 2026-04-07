const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  videoUrl: z.string().min(1).max(500),
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchComments(videoId: string, apiKey: string): Promise<any[]> {
  const comments: any[] = [];
  let pageToken = "";
  const maxPages = 5;
  let page = 0;

  while (page < maxPages) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&textFormat=plainText${pageToken ? `&pageToken=${pageToken}` : ""}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube API error [${res.status}]: ${err}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const snippet = item.snippet?.topLevelComment?.snippet;
      if (snippet) {
        comments.push({
          author: snippet.authorDisplayName,
          text: snippet.textDisplay,
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt,
        });
      }
    }
    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      page++;
    } else {
      break;
    }
  }
  return comments;
}

// Simple sentiment analysis using keyword matching
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const positiveWords = [
    "love", "great", "awesome", "amazing", "excellent", "fantastic", "wonderful",
    "best", "good", "perfect", "beautiful", "brilliant", "outstanding", "incredible",
    "thank", "thanks", "helpful", "useful", "nice", "cool", "wow", "superb",
    "happy", "enjoy", "enjoyed", "favorite", "favourite", "recommend", "impressive",
    "❤", "👍", "🔥", "😍", "🎉", "💯", "👏", "✨", "😊", "🙌",
  ];
  const negativeWords = [
    "hate", "terrible", "awful", "worst", "bad", "horrible", "boring",
    "waste", "trash", "garbage", "stupid", "dumb", "annoying", "disappointing",
    "disappointed", "sucks", "poor", "ugly", "useless", "wrong", "fake",
    "dislike", "clickbait", "scam", "cringe", "overrated", "mediocre",
    "👎", "😡", "🤮", "💩", "😤", "😠",
  ];

  let posScore = 0;
  let negScore = 0;
  for (const w of positiveWords) {
    if (lower.includes(w)) posScore++;
  }
  for (const w of negativeWords) {
    if (lower.includes(w)) negScore++;
  }

  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

// Simple topic extraction using TF-IDF-like approach
function extractTopics(comments: { text: string; sentiment: string }[]): { topic: string; count: number; comments: string[] }[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "because", "but", "and",
    "or", "if", "while", "about", "up", "it", "its", "he", "she", "they",
    "them", "his", "her", "their", "this", "that", "these", "those", "i",
    "me", "my", "we", "us", "our", "you", "your", "what", "which", "who",
    "whom", "im", "dont", "ive", "like", "really", "one", "get", "got",
    "make", "know", "think", "see", "go", "come", "want", "look", "use",
    "also", "much", "even", "still", "way", "well", "back", "going",
    "video", "watch", "watching", "watched", "youtube", "channel", "subscribe",
  ]);

  // Extract bigrams and significant words
  const phraseMap = new Map<string, { count: number; comments: Set<string> }>();

  for (const c of comments) {
    const words = c.text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const seen = new Set<string>();

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!seen.has(bigram)) {
        seen.add(bigram);
        const entry = phraseMap.get(bigram) || { count: 0, comments: new Set() };
        entry.count++;
        entry.comments.add(c.text.slice(0, 120));
        phraseMap.set(bigram, entry);
      }
    }

    // Unigrams
    for (const w of words) {
      if (!seen.has(w)) {
        seen.add(w);
        const entry = phraseMap.get(w) || { count: 0, comments: new Set() };
        entry.count++;
        entry.comments.add(c.text.slice(0, 120));
        phraseMap.set(w, entry);
      }
    }
  }

  // Prefer bigrams, then unigrams, filter by min count
  const minCount = Math.max(2, Math.floor(comments.length * 0.02));
  const sorted = [...phraseMap.entries()]
    .filter(([_, v]) => v.count >= minCount)
    .sort((a, b) => {
      // Prefer bigrams
      const aIsBigram = a[0].includes(" ") ? 1 : 0;
      const bIsBigram = b[0].includes(" ") ? 1 : 0;
      if (aIsBigram !== bIsBigram) return bIsBigram - aIsBigram;
      return b[1].count - a[1].count;
    });

  // Deduplicate: remove unigrams that are part of selected bigrams
  const selected: { topic: string; count: number; comments: string[] }[] = [];
  const usedWords = new Set<string>();

  for (const [phrase, data] of sorted) {
    if (selected.length >= 5) break;
    const words = phrase.split(" ");
    if (words.length === 1 && usedWords.has(phrase)) continue;
    selected.push({
      topic: phrase,
      count: data.count,
      comments: [...data.comments].slice(0, 3),
    });
    words.forEach(w => usedWords.add(w));
  }

  return selected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: "YouTube API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(parsed.data.videoUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL. Please provide a valid YouTube video link." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch video info
    const videoInfoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`);
    const videoInfo = await videoInfoRes.json();
    const videoSnippet = videoInfo.items?.[0]?.snippet;
    const videoStats = videoInfo.items?.[0]?.statistics;

    if (!videoSnippet) {
      return new Response(JSON.stringify({ error: "Video not found or is private." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch comments
    const comments = await fetchComments(videoId, YOUTUBE_API_KEY);

    if (comments.length === 0) {
      return new Response(JSON.stringify({ error: "No comments found. Comments may be disabled for this video." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze sentiment
    const analyzed = comments.map(c => ({
      ...c,
      sentiment: analyzeSentiment(c.text),
    }));

    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const c of analyzed) {
      sentimentCounts[c.sentiment]++;
    }

    // Extract topics
    const topics = extractTopics(analyzed);

    return new Response(JSON.stringify({
      video: {
        title: videoSnippet.title,
        channelTitle: videoSnippet.channelTitle,
        thumbnail: videoSnippet.thumbnails?.medium?.url,
        viewCount: videoStats?.viewCount,
        commentCount: videoStats?.commentCount,
      },
      totalAnalyzed: analyzed.length,
      sentiment: sentimentCounts,
      topics,
      comments: analyzed.slice(0, 200),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
