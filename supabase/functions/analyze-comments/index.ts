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

// AI-powered sentiment analysis using Lovable AI Gateway
async function analyzeSentimentBatch(
  comments: { author: string; text: string; likeCount: number; publishedAt: string }[],
  apiKey: string
): Promise<("positive" | "negative" | "neutral")[]> {
  const BATCH_SIZE = 50;
  const allSentiments: ("positive" | "negative" | "neutral")[] = [];

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    const numberedComments = batch.map((c, idx) => `${idx + 1}. ${c.text.slice(0, 200)}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a sentiment classifier. For each numbered YouTube comment, respond with ONLY the sentiment label. Output exactly one word per line: "positive", "negative", or "neutral". No numbering, no extra text. The number of output lines MUST equal the number of input comments.`
          },
          {
            role: "user",
            content: `Classify the sentiment of each comment:\n\n${numberedComments}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`AI Gateway error [${response.status}], falling back to keyword analysis for this batch`);
      // Fallback to simple keyword analysis
      for (const c of batch) {
        allSentiments.push(keywordSentiment(c.text));
      }
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const lines = content.split("\n").map((l: string) => l.trim().toLowerCase()).filter((l: string) => l);

    for (let j = 0; j < batch.length; j++) {
      const line = lines[j] || "";
      if (line.includes("positive")) {
        allSentiments.push("positive");
      } else if (line.includes("negative")) {
        allSentiments.push("negative");
      } else {
        allSentiments.push("neutral");
      }
    }
  }

  return allSentiments;
}

// Fallback keyword-based sentiment
function keywordSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = ["love", "great", "awesome", "amazing", "excellent", "fantastic", "best", "good", "perfect", "thank", "thanks", "helpful", "nice", "cool", "wow", "happy", "enjoy", "❤", "👍", "🔥", "😍", "💯"];
  const neg = ["hate", "terrible", "awful", "worst", "bad", "horrible", "boring", "waste", "trash", "stupid", "annoying", "disappointing", "sucks", "useless", "fake", "cringe", "👎", "😡", "🤮", "💩"];
  let p = 0, n = 0;
  for (const w of pos) if (lower.includes(w)) p++;
  for (const w of neg) if (lower.includes(w)) n++;
  if (p > n) return "positive";
  if (n > p) return "negative";
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

  const phraseMap = new Map<string, { count: number; comments: Set<string> }>();

  for (const c of comments) {
    const words = c.text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const seen = new Set<string>();

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

  const minCount = Math.max(2, Math.floor(comments.length * 0.02));
  const sorted = [...phraseMap.entries()]
    .filter(([_, v]) => v.count >= minCount)
    .sort((a, b) => {
      const aIsBigram = a[0].includes(" ") ? 1 : 0;
      const bIsBigram = b[0].includes(" ") ? 1 : 0;
      if (aIsBigram !== bIsBigram) return bIsBigram - aIsBigram;
      return b[1].count - a[1].count;
    });

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    // Analyze sentiment - use AI if available, otherwise fallback to keywords
    let analyzed;
    if (LOVABLE_API_KEY) {
      const sentiments = await analyzeSentimentBatch(comments, LOVABLE_API_KEY);
      analyzed = comments.map((c, i) => ({ ...c, sentiment: sentiments[i] }));
    } else {
      analyzed = comments.map(c => ({ ...c, sentiment: keywordSentiment(c.text) }));
    }

    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const c of analyzed) {
      sentimentCounts[c.sentiment as "positive" | "negative" | "neutral"]++;
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
