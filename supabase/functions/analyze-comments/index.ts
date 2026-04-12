const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BodySchema = z.object({
  videoUrl: z.string().min(1).max(500).optional(),
  videoUrls: z.array(z.string().min(1).max(500)).max(5).optional(),
}).refine(d => d.videoUrl || (d.videoUrls && d.videoUrls.length > 0), {
  message: "Provide videoUrl or videoUrls",
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
  let page = 0;
  while (page < 5) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&textFormat=plainText${pageToken ? `&pageToken=${pageToken}` : ""}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error [${res.status}]: ${await res.text()}`);
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
    if (data.nextPageToken) { pageToken = data.nextPageToken; page++; } else break;
  }
  return comments;
}

async function fetchVideoInfo(videoId: string, apiKey: string) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
  const data = await res.json();
  const snippet = data.items?.[0]?.snippet;
  const stats = data.items?.[0]?.statistics;
  if (!snippet) return null;
  return {
    title: snippet.title,
    channelTitle: snippet.channelTitle,
    thumbnail: snippet.thumbnails?.medium?.url,
    viewCount: stats?.viewCount,
    commentCount: stats?.commentCount,
  };
}

// AI sentiment batch analysis
async function analyzeSentimentBatch(
  comments: { text: string }[],
  apiKey: string
): Promise<("positive" | "negative" | "neutral")[]> {
  const BATCH_SIZE = 50;
  const batches: { text: string }[][] = [];
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    batches.push(comments.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(batches.map(async (batch) => {
    const numbered = batch.map((c, idx) => `${idx + 1}. ${c.text.slice(0, 200)}`).join("\n");
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `Classify each numbered comment sentiment. Output one word per line: "positive", "negative", or "neutral". No numbering.` },
            { role: "user", content: numbered },
          ],
        }),
      });
      if (!response.ok) throw new Error("AI error");
      const data = await response.json();
      const lines = (data.choices?.[0]?.message?.content?.trim() || "").split("\n").map((l: string) => l.trim().toLowerCase());
      return batch.map((_, j) => {
        const line = lines[j] || "";
        return (line.includes("positive") ? "positive" : line.includes("negative") ? "negative" : "neutral") as "positive" | "negative" | "neutral";
      });
    } catch {
      return batch.map(c => keywordSentiment(c.text));
    }
  }));

  return batchResults.flat();
}

function keywordSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = ["love", "great", "awesome", "amazing", "excellent", "fantastic", "best", "good", "perfect", "thank", "thanks", "helpful", "nice", "cool", "wow", "happy", "enjoy", "❤", "👍", "🔥", "😍", "💯"];
  const neg = ["hate", "terrible", "awful", "worst", "bad", "horrible", "boring", "waste", "trash", "stupid", "annoying", "disappointing", "sucks", "useless", "fake", "cringe", "👎", "😡", "🤮", "💩"];
  let p = 0, n = 0;
  for (const w of pos) if (lower.includes(w)) p++;
  for (const w of neg) if (lower.includes(w)) n++;
  return p > n ? "positive" : n > p ? "negative" : "neutral";
}

// AI-powered categorization
async function categorizeComments(
  comments: { text: string }[],
  apiKey: string
): Promise<("praise" | "complaint" | "question" | "suggestion" | "spam" | "other")[]> {
  const BATCH_SIZE = 50;
  const batches: { text: string }[][] = [];
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    batches.push(comments.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(batches.map(async (batch) => {
    const numbered = batch.map((c, idx) => `${idx + 1}. ${c.text.slice(0, 200)}`).join("\n");
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `Classify each numbered YouTube comment into exactly one category. Output one word per line: "praise", "complaint", "question", "suggestion", "spam", or "other". No numbering, no extra text.` },
            { role: "user", content: numbered },
          ],
        }),
      });
      if (!response.ok) throw new Error("AI error");
      const data = await response.json();
      const lines = (data.choices?.[0]?.message?.content?.trim() || "").split("\n").map((l: string) => l.trim().toLowerCase());
      const valid = ["praise", "complaint", "question", "suggestion", "spam", "other"] as const;
      return batch.map((_, j) => {
        const line = lines[j] || "";
        return (valid.find(v => line.includes(v)) || "other") as "praise" | "complaint" | "question" | "suggestion" | "spam" | "other";
      });
    } catch {
      return batch.map(c => {
        const t = c.text.toLowerCase();
        if (t.includes("?")) return "question" as const;
        if (["love", "great", "awesome", "amazing", "best"].some(w => t.includes(w))) return "praise" as const;
        if (["hate", "bad", "worst", "terrible", "boring"].some(w => t.includes(w))) return "complaint" as const;
        if (["should", "suggest", "would be nice", "please add"].some(w => t.includes(w))) return "suggestion" as const;
        return "other" as const;
      });
    }
  }));

  return batchResults.flat();
}

// AI-powered insights generation (enhanced)
async function generateInsights(
  comments: { text: string; sentiment: string; category: string }[],
  sentiment: { positive: number; negative: number; neutral: number },
  topicsData: { topic: string; count: number }[],
  apiKey: string
) {
  const total = comments.length;
  const sampleComments = comments.slice(0, 100).map(c => `[${c.sentiment}/${c.category}] ${c.text.slice(0, 150)}`).join("\n");
  const topTopics = topicsData.slice(0, 10).map(t => `"${t.topic}" (${t.count})`).join(", ");

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        tools: [{
          type: "function",
          function: {
            name: "provide_insights",
            description: "Provide structured insights, content ideas, and trend analysis from YouTube comments",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                likes: { type: "array", items: { type: "string" }, description: "3-5 things audience likes" },
                dislikes: { type: "array", items: { type: "string" }, description: "3-5 things audience dislikes" },
                complaints: { type: "array", items: { type: "string" }, description: "Top 3-5 complaints" },
                recommendations: { type: "array", items: { type: "string" }, description: "3-5 actionable recommendations" },
                nextSteps: { type: "array", items: { type: "object", properties: { action: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, rationale: { type: "string" } }, required: ["action", "priority", "rationale"] }, description: "5 'What to do next' actions with priority and rationale" },
                contentIdeas: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, type: { type: "string", enum: ["video", "short", "community_post", "live_stream"] } }, required: ["title", "description", "type"] }, description: "5 content ideas from audience questions and requests" },
                faqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] }, description: "5 FAQs from comments with suggested answers" },
                trendingTopics: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, signal: { type: "string", enum: ["rising", "steady", "declining"] }, description: { type: "string" } }, required: ["topic", "signal", "description"] }, description: "5-8 trending topics with signal direction" },
              },
              required: ["summary", "likes", "dislikes", "complaints", "recommendations", "nextSteps", "contentIdeas", "faqs", "trendingTopics"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "provide_insights" } },
        messages: [
          { role: "system", content: "You analyze YouTube comments and provide actionable insights, content strategy, and trend analysis for creators. Be specific and data-driven. For nextSteps, give concrete actions the creator should take immediately." },
          { role: "user", content: `Analyze ${total} comments (${sentiment.positive} positive, ${sentiment.negative} negative, ${sentiment.neutral} neutral).\n\nTop topics: ${topTopics}\n\nComments:\n${sampleComments}` },
        ],
      }),
    });
    if (!response.ok) throw new Error("AI error");
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) return JSON.parse(toolCall.function.arguments);
    throw new Error("No tool call");
  } catch (e) {
    console.error("Insights generation failed:", e);
    const pct = (n: number) => Math.round(n / total * 100);
    return {
      summary: `Analyzed ${total} comments: ${pct(sentiment.positive)}% positive, ${pct(sentiment.negative)}% negative, ${pct(sentiment.neutral)}% neutral.`,
      likes: ["Content quality", "Presentation style"],
      dislikes: ["Could not generate detailed dislikes"],
      complaints: ["Could not generate detailed complaints"],
      recommendations: ["Continue creating quality content", "Engage with your audience in comments"],
      nextSteps: [{ action: "Review audience feedback manually", priority: "high", rationale: "AI analysis unavailable" }],
      contentIdeas: [{ title: "Follow-up video based on top questions", description: "Address frequently asked questions", type: "video" }],
      faqs: [{ question: "See comments for common questions", answer: "Review manually" }],
      trendingTopics: [{ topic: topicsData[0]?.topic || "general", signal: "steady", description: "Most discussed topic" }],
    };
  }
}

// Topic/keyword extraction
function extractTopics(comments: { text: string }[]): { topic: string; count: number; comments: string[] }[] {
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
      const aB = a[0].includes(" ") ? 1 : 0;
      const bB = b[0].includes(" ") ? 1 : 0;
      if (aB !== bB) return bB - aB;
      return b[1].count - a[1].count;
    });

  const selected: { topic: string; count: number; comments: string[] }[] = [];
  const usedWords = new Set<string>();
  for (const [phrase, data] of sorted) {
    if (selected.length >= 10) break;
    const words = phrase.split(" ");
    if (words.length === 1 && usedWords.has(phrase)) continue;
    selected.push({ topic: phrase, count: data.count, comments: [...data.comments].slice(0, 3) });
    words.forEach(w => usedWords.add(w));
  }
  return selected;
}

// Extract top keywords with frequency for tag cloud
function extractKeywords(comments: { text: string }[]): { word: string; count: number }[] {
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
  const freq = new Map<string, number>();
  for (const c of comments) {
    const words = c.text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const seen = new Set<string>();
    for (const w of words) {
      if (!seen.has(w)) { seen.add(w); freq.set(w, (freq.get(w) || 0) + 1); }
    }
  }
  return [...freq.entries()]
    .filter(([_, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));
}

async function analyzeVideo(videoUrl: string, ytKey: string, aiKey: string | undefined) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${videoUrl}`);

  const video = await fetchVideoInfo(videoId, ytKey);
  if (!video) throw new Error("Video not found or is private.");

  const rawComments = await fetchComments(videoId, ytKey);
  if (rawComments.length === 0) throw new Error("No comments found. Comments may be disabled.");

  // Sentiment + Categories in parallel
  let sentiments: ("positive" | "negative" | "neutral")[];
  let categories: ("praise" | "complaint" | "question" | "suggestion" | "spam" | "other")[];
  if (aiKey) {
    [sentiments, categories] = await Promise.all([
      analyzeSentimentBatch(rawComments, aiKey),
      categorizeComments(rawComments, aiKey),
    ]);
  } else {
    sentiments = rawComments.map(c => keywordSentiment(c.text));
    categories = rawComments.map(c => {
      const t = c.text.toLowerCase();
      if (t.includes("?")) return "question";
      if (["love", "great", "awesome", "amazing", "best"].some(w => t.includes(w))) return "praise";
      if (["hate", "bad", "worst", "terrible"].some(w => t.includes(w))) return "complaint";
      if (["should", "suggest", "please add"].some(w => t.includes(w))) return "suggestion";
      return "other";
    });
  }

  const analyzed = rawComments.map((c, i) => ({ ...c, sentiment: sentiments[i], category: categories[i] }));

  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  for (const c of analyzed) sentimentCounts[c.sentiment]++;

  const categoryCounts: Record<string, number> = {};
  for (const c of analyzed) categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;

  // Category samples
  const categorySamples: Record<string, string[]> = {};
  for (const cat of ["praise", "complaint", "question", "suggestion", "spam", "other"]) {
    categorySamples[cat] = analyzed
      .filter(c => c.category === cat)
      .slice(0, 3)
      .map(c => c.text.slice(0, 150));
  }

  const topics = extractTopics(analyzed);
  const keywords = extractKeywords(analyzed);

  // AI insights (needs topics for trend analysis)
  const insights = aiKey
    ? await generateInsights(analyzed, sentimentCounts, topics, aiKey)
    : {
        summary: `${analyzed.length} comments analyzed: ${Math.round(sentimentCounts.positive / analyzed.length * 100)}% positive, ${Math.round(sentimentCounts.negative / analyzed.length * 100)}% negative.`,
        likes: ["Content quality"],
        dislikes: ["No AI analysis available"],
        complaints: ["No AI analysis available"],
        recommendations: ["Enable AI for detailed insights"],
        nextSteps: [{ action: "Enable AI for detailed analysis", priority: "high", rationale: "Get actionable insights" }],
        contentIdeas: [{ title: "Review comments manually", description: "AI not available", type: "video" }],
        faqs: [{ question: "Enable AI for FAQs", answer: "N/A" }],
        trendingTopics: [{ topic: topics[0]?.topic || "general", signal: "steady", description: "Top topic" }],
      };

  return {
    video,
    totalAnalyzed: analyzed.length,
    sentiment: sentimentCounts,
    categories: categoryCounts,
    categorySamples,
    topics,
    keywords,
    insights,
    comments: analyzed.slice(0, 200),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: "YouTube API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urls = parsed.data.videoUrls || [parsed.data.videoUrl!];

    if (urls.length === 1) {
      const result = await analyzeVideo(urls[0], YOUTUBE_API_KEY, LOVABLE_API_KEY);

      // Save report server-side using service role
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, serviceKey);
        const vidMatch = urls[0].match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
        const videoId = vidMatch?.[1] || "unknown";
        await sb.from("analysis_reports").insert({
          video_id: videoId,
          video_url: urls[0],
          video_title: result.video?.title || null,
          channel_title: result.video?.channelTitle || null,
          thumbnail: result.video?.thumbnail || null,
          result: result as any,
        });
      } catch (e) {
        console.error("Failed to save report:", e);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Multi-video comparison (parallel)
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          return await analyzeVideo(url, YOUTUBE_API_KEY, LOVABLE_API_KEY);
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Failed", videoUrl: url };
        }
      })
    );

    return new Response(JSON.stringify({ comparison: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
