const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BodySchema = z.object({
  videoUrl: z.string().min(1).max(500).optional(),
  videoUrls: z.array(z.string().min(1).max(500)).max(3).optional(),
  sessionId: z.string().min(1).max(100).optional(),
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
    if (!res.ok) {
      console.error(`YouTube API error [${res.status}]:`, await res.text());
      throw new Error("Failed to fetch YouTube comments");
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
// Token usage tracker
const tokenTracker = { inputTokens: 0, outputTokens: 0, aiCalls: 0, skippedByKeyword: 0, skippedByDedup: 0 };

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Sanitize a single comment for inclusion in a numbered AI prompt:
// strip control chars/newlines/quotes that would break line-based parsing or enable prompt injection.
function sanitizeForPrompt(text: string, max = 150): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[`"]+/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

// Text preprocessing: strip URLs, repeated chars, filler
function preprocessText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")           // URLs
    .replace(/(.)\1{3,}/g, "$1$1")             // repeated chars (e.g. "sooooo" → "soo")
    .replace(/\b(um|uh|like|basically|literally|actually|honestly)\b/gi, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}


// Strong keyword match for obvious sentiment (high confidence only)
function strongKeywordSentiment(text: string): "positive" | "negative" | null {
  const lower = text.toLowerCase();
  const strongPos = ["love", "amazing", "awesome", "excellent", "fantastic", "best ever", "perfect", "incredible", "brilliant", "masterpiece", "❤", "😍", "💯", "🔥", "👍"];
  const strongNeg = ["hate", "terrible", "awful", "worst", "horrible", "garbage", "trash", "disgusting", "pathetic", "🤮", "💩", "👎", "😡"];
  let p = 0, n = 0;
  for (const w of strongPos) if (lower.includes(w)) p++;
  for (const w of strongNeg) if (lower.includes(w)) n++;
  // Only classify if clear signal (no mixed signals)
  if (p >= 2 && n === 0) return "positive";
  if (n >= 2 && p === 0) return "negative";
  if (p >= 1 && n === 0 && lower.length < 60) return "positive";
  if (n >= 1 && p === 0 && lower.length < 60) return "negative";
  return null; // ambiguous → send to AI
}

// Deduplicate near-identical comments
function deduplicateComments(comments: { text: string; originalIndex: number }[]): { unique: { text: string; originalIndex: number }[]; dupMap: Map<number, number> } {
  const seen = new Map<string, number>(); // normalized → first index in unique array
  const unique: { text: string; originalIndex: number }[] = [];
  const dupMap = new Map<number, number>(); // originalIndex of dup → originalIndex of first

  for (const c of comments) {
    const norm = c.text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (seen.has(norm)) {
      dupMap.set(c.originalIndex, seen.get(norm)!);
      tokenTracker.skippedByDedup++;
    } else {
      seen.set(norm, c.originalIndex);
      unique.push(c);
    }
  }
  return { unique, dupMap };
}

// AI sentiment batch analysis (hybrid: keyword pre-filter + dedup + AI for ambiguous)
async function analyzeSentimentBatch(
  comments: { text: string }[],
  apiKey: string
): Promise<("positive" | "negative" | "neutral")[]> {
  const results: ("positive" | "negative" | "neutral")[] = new Array(comments.length);

  // Phase 1: keyword pre-classification
  const ambiguousIndices: number[] = [];
  for (let i = 0; i < comments.length; i++) {
    const kw = strongKeywordSentiment(comments[i].text);
    if (kw) {
      results[i] = kw;
      tokenTracker.skippedByKeyword++;
    } else {
      ambiguousIndices.push(i);
    }
  }

  if (ambiguousIndices.length === 0) return results;

  // Phase 2: dedup ambiguous comments
  const ambiguous = ambiguousIndices.map(i => ({ text: preprocessText(comments[i].text), originalIndex: i }));
  const { unique, dupMap } = deduplicateComments(ambiguous);

  // Phase 3: AI classification on unique ambiguous comments only
  const BATCH_SIZE = 50;
  const batches: { text: string; originalIndex: number }[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    batches.push(unique.slice(i, i + BATCH_SIZE));
  }

  const aiResults = new Map<number, "positive" | "negative" | "neutral">();

  await Promise.all(batches.map(async (batch) => {
    const numbered = batch.map((c, idx) => `${idx + 1}. ${sanitizeForPrompt(c.text)}`).join("\n");
    const inputTokens = estimateTokens(numbered) + 25; // +system prompt
    tokenTracker.inputTokens += inputTokens;
    tokenTracker.aiCalls++;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          "Content-Type": "application/json",
        },

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
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      tokenTracker.outputTokens += estimateTokens(content);
      const lines = content.split("\n").map((l: string) => l.trim().toLowerCase());
      batch.forEach((c, j) => {
        const line = lines[j] || "";
        aiResults.set(c.originalIndex, (line.includes("positive") ? "positive" : line.includes("negative") ? "negative" : "neutral"));
      });
    } catch {
      batch.forEach(c => aiResults.set(c.originalIndex, keywordSentiment(c.text)));
    }
  }));

  // Assign AI results to ambiguous comments
  for (const idx of ambiguousIndices) {
    if (aiResults.has(idx)) {
      results[idx] = aiResults.get(idx)!;
    } else if (dupMap.has(idx)) {
      // Copy result from the original dedup'd comment
      results[idx] = aiResults.get(dupMap.get(idx)!) || keywordSentiment(comments[idx].text);
    } else {
      results[idx] = keywordSentiment(comments[idx].text);
    }
  }

  return results;
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

// AI-powered categorization (with preprocessing + dedup)
async function categorizeComments(
  comments: { text: string }[],
  apiKey: string
): Promise<("praise" | "complaint" | "question" | "suggestion" | "spam" | "other")[]> {
  const preprocessed = comments.map((c, i) => ({ text: preprocessText(c.text), originalIndex: i }));
  const { unique, dupMap } = deduplicateComments(preprocessed);

  const BATCH_SIZE = 50;
  const batches: { text: string; originalIndex: number }[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    batches.push(unique.slice(i, i + BATCH_SIZE));
  }

  const catResults = new Map<number, "praise" | "complaint" | "question" | "suggestion" | "spam" | "other">();

  await Promise.all(batches.map(async (batch) => {
    const numbered = batch.map((c, idx) => `${idx + 1}. ${sanitizeForPrompt(c.text)}`).join("\n");
    const inputTokens = estimateTokens(numbered) + 30;
    tokenTracker.inputTokens += inputTokens;
    tokenTracker.aiCalls++;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          "Content-Type": "application/json",
        },

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
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      tokenTracker.outputTokens += estimateTokens(content);
      const lines = content.split("\n").map((l: string) => l.trim().toLowerCase());
      const valid = ["praise", "complaint", "question", "suggestion", "spam", "other"] as const;
      batch.forEach((c, j) => {
        const line = lines[j] || "";
        catResults.set(c.originalIndex, (valid.find(v => line.includes(v)) || "other"));
      });
    } catch {
      batch.forEach(c => {
        const t = c.text.toLowerCase();
        if (t.includes("?")) catResults.set(c.originalIndex, "question");
        else if (["love", "great", "awesome", "amazing", "best"].some(w => t.includes(w))) catResults.set(c.originalIndex, "praise");
        else if (["hate", "bad", "worst", "terrible", "boring"].some(w => t.includes(w))) catResults.set(c.originalIndex, "complaint");
        else if (["should", "suggest", "would be nice", "please add"].some(w => t.includes(w))) catResults.set(c.originalIndex, "suggestion");
        else catResults.set(c.originalIndex, "other");
      });
    }
  }));

  return comments.map((_, i) => {
    if (catResults.has(i)) return catResults.get(i)!;
    if (dupMap.has(i)) return catResults.get(dupMap.get(i)!) || "other";
    return "other";
  });
}

// AI-powered insights generation (enhanced)
async function generateInsights(
  comments: { text: string; sentiment: string; category: string }[],
  sentiment: { positive: number; negative: number; neutral: number },
  topicsData: { topic: string; count: number }[],
  apiKey: string
) {
  const total = comments.length;
  const sampleComments = comments.slice(0, 60).map(c => `[${c.sentiment}/${c.category}] ${sanitizeForPrompt(c.text, 120)}`).join("\n");
  const topTopics = topicsData.slice(0, 10).map(t => `"${t.topic}" (${t.count})`).join(", ");

  const userContent = `Analyze ${total} comments (${sentiment.positive} positive, ${sentiment.negative} negative, ${sentiment.neutral} neutral).\n\nTop topics: ${topTopics}\n\nComments:\n${sampleComments}`;
  const insightInputTokens = estimateTokens(userContent) + 80;
  tokenTracker.inputTokens += insightInputTokens;

  const tools = [{
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
  }];

  const messages = [
    { role: "system", content: "You analyze YouTube comments and provide actionable insights, content strategy, and trend analysis for creators. Be specific and data-driven. For nextSteps, give concrete actions the creator should take immediately." },
    { role: "user", content: userContent },
  ];

  const tryModel = async (model: string) => {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model,
        tools,
        tool_choice: { type: "function", function: { name: "provide_insights" } },
        messages,
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(`Insights AI gateway error (${model}): status=${response.status} body=${errBody.slice(0, 500)}`);
      throw new Error(`AI gateway ${response.status}`);
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    tokenTracker.outputTokens += estimateTokens(toolCall.function.arguments);
    return JSON.parse(toolCall.function.arguments);
  };

  try {
    tokenTracker.aiCalls++;
    try {
      return await tryModel("google/gemini-2.5-flash");
    } catch (primaryErr) {
      console.error("Primary insights model failed, trying fallback:", primaryErr);
      tokenTracker.aiCalls++;
      return await tryModel("google/gemini-2.5-flash-lite");
    }
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

/* ─────────────── Timeline / Transcript ─────────────── */

interface TranscriptCue { start: number; end: number; text: string }

// Parse ISO 8601 duration (PT#H#M#S) to seconds
function parseIsoDuration(iso: string | undefined | null): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

// Fetch video contentDetails.duration (best-effort)
async function fetchVideoDuration(videoId: string, apiKey: string): Promise<number> {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseIsoDuration(data.items?.[0]?.contentDetails?.duration);
  } catch { return 0; }
}

// Fetch YouTube transcript via public timedtext endpoints (best-effort, no auth)
async function fetchTranscript(videoId: string): Promise<TranscriptCue[] | null> {
  try {
    // 1. Get watch page to discover caption tracks
    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" },
    });
    if (!watch.ok) return null;
    const html = await watch.text();
    const match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) return null;
    let tracks: any[];
    try { tracks = JSON.parse(match[1]); } catch { return null; }
    if (!Array.isArray(tracks) || !tracks.length) return null;

    // Prefer English (manual > asr), else first available
    const pick = tracks.find(t => t.languageCode === "en" && t.kind !== "asr")
              || tracks.find(t => t.languageCode === "en")
              || tracks[0];
    if (!pick?.baseUrl) return null;

    const capRes = await fetch(`${pick.baseUrl}&fmt=json3`);
    if (!capRes.ok) return null;
    const capJson = await capRes.json();
    const events: any[] = capJson.events || [];
    const cues: TranscriptCue[] = [];
    for (const ev of events) {
      if (!ev.segs) continue;
      const start = (ev.tStartMs || 0) / 1000;
      const dur = (ev.dDurationMs || 0) / 1000;
      const text = ev.segs.map((s: any) => s.utf8 || "").join("").replace(/\s+/g, " ").trim();
      if (!text) continue;
      cues.push({ start, end: start + dur, text });
    }
    return cues.length ? cues : null;
  } catch (e) {
    console.error("Transcript fetch failed:", e);
    return null;
  }
}

// Extract first timestamp (in seconds) from a comment, if any
function parseCommentTimestamp(text: string, maxDuration: number): number | null {
  // Match H:MM:SS or M:SS or MM:SS at word boundaries
  const re = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/;
  const m = text.match(re);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1]) : 0;
  const mm = parseInt(m[2]);
  const ss = parseInt(m[3]);
  if (ss >= 60 || mm >= 60) return null;
  const secs = h * 3600 + mm * 60 + ss;
  if (maxDuration > 0 && secs > maxDuration + 30) return null;
  return secs;
}

// Chunk transcript cues into windows of ~windowSec seconds
function chunkTranscript(cues: TranscriptCue[], windowSec = 30): { start: number; end: number; text: string }[] {
  if (!cues.length) return [];
  const chunks: { start: number; end: number; text: string }[] = [];
  const duration = cues[cues.length - 1].end;
  let windowStart = 0;
  while (windowStart < duration) {
    const windowEnd = windowStart + windowSec;
    const parts = cues.filter(c => c.start < windowEnd && c.end > windowStart).map(c => c.text);
    if (parts.length) {
      chunks.push({
        start: windowStart,
        end: Math.min(windowEnd, duration),
        text: parts.join(" ").replace(/\s+/g, " ").trim(),
      });
    }
    windowStart = windowEnd;
  }
  return chunks;
}

function buildTimeline(
  comments: { text: string; sentiment: "positive" | "negative" | "neutral" }[],
  cues: TranscriptCue[] | null,
  duration: number,
): {
  duration: number;
  hasTranscript: boolean;
  chunks: { start: number; end: number; text: string }[];
  hotspots: any[];
  commentTimestamps: Record<number, number>;
  unmappedCount: number;
} {
  const hasTranscript = !!(cues && cues.length);
  const chunks = hasTranscript ? chunkTranscript(cues!, 30) : [];
  const effDuration = duration || (hasTranscript ? cues![cues!.length - 1].end : 0);

  // Map comments with explicit timestamps
  const commentTimestamps: Record<number, number> = {};
  const chunkBuckets = new Map<number, number[]>(); // chunkIndex -> [commentIndex]

  comments.forEach((c, i) => {
    const ts = parseCommentTimestamp(c.text, effDuration);
    if (ts == null) return;
    commentTimestamps[i] = ts;
    if (!chunks.length) return;
    let ci = chunks.findIndex(ch => ts >= ch.start && ts < ch.end);
    if (ci < 0) ci = ts < chunks[0].start ? 0 : chunks.length - 1;
    if (!chunkBuckets.has(ci)) chunkBuckets.set(ci, []);
    chunkBuckets.get(ci)!.push(i);
  });

  const mappedCount = Object.keys(commentTimestamps).length;
  const unmappedCount = comments.length - mappedCount;

  // Build hotspots: contiguous chunks with >=2 reactions get merged
  const hotspots: any[] = [];
  const sortedChunkIndices = [...chunkBuckets.keys()].sort((a, b) => a - b);
  let cur: { start: number; end: number; commentIndices: number[]; chunkIdx: number[] } | null = null;
  for (const ci of sortedChunkIndices) {
    const bucket = chunkBuckets.get(ci)!;
    if (bucket.length < 1) continue;
    const chunk = chunks[ci];
    if (cur && ci - cur.chunkIdx[cur.chunkIdx.length - 1] <= 1) {
      cur.end = chunk.end;
      cur.commentIndices.push(...bucket);
      cur.chunkIdx.push(ci);
    } else {
      if (cur) hotspots.push(cur);
      cur = { start: chunk.start, end: chunk.end, commentIndices: [...bucket], chunkIdx: [ci] };
    }
  }
  if (cur) hotspots.push(cur);

  // Enrich hotspots with sentiment, transcript text, suggestion
  const enriched = hotspots
    .filter(h => h.commentIndices.length >= 2)
    .map(h => {
      const sentiment = { positive: 0, negative: 0, neutral: 0 };
      h.commentIndices.forEach((i: number) => { sentiment[comments[i].sentiment]++; });
      const transcript = h.chunkIdx.map((ci: number) => chunks[ci].text).join(" ").slice(0, 600);
      let suggestion = "";
      const dom = sentiment.positive >= sentiment.negative && sentiment.positive >= sentiment.neutral
        ? "positive" : sentiment.negative >= sentiment.neutral ? "negative" : "neutral";
      if (dom === "positive") suggestion = "High-engagement moment — feature this clip in shorts or a highlight reel.";
      else if (dom === "negative") suggestion = "Viewers pushed back here — consider a pinned comment clarifying this section.";
      else suggestion = "This moment sparked discussion — reply to the top comments to keep engagement going.";
      return {
        start: Math.round(h.start),
        end: Math.round(h.end),
        transcript,
        sentiment,
        commentIndices: h.commentIndices,
        suggestion,
      };
    })
    .sort((a, b) => b.commentIndices.length - a.commentIndices.length)
    .slice(0, 10);

  return {
    duration: effDuration,
    hasTranscript,
    chunks,
    hotspots: enriched,
    commentTimestamps,
    unmappedCount,
  };
}

async function analyzeVideo(videoUrl: string, ytKey: string, aiKey: string | undefined) {

  // Reset token tracker for this analysis
  tokenTracker.inputTokens = 0;
  tokenTracker.outputTokens = 0;
  tokenTracker.aiCalls = 0;
  tokenTracker.skippedByKeyword = 0;
  tokenTracker.skippedByDedup = 0;

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
    comments: analyzed,
    // tokenUsage intentionally omitted from public response (internal metric)
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
      console.error("Validation error:", parsed.error.flatten());
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urls = parsed.data.videoUrls || [parsed.data.videoUrl!];
    const sessionId = parsed.data.sessionId || "anonymous";

    if (urls.length === 1) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);
      const vidMatch = urls[0].match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      const videoId = vidMatch?.[1] || "unknown";

      // Check for cached report within 24 hours (any session)
      const CACHE_MS = 24 * 60 * 60 * 1000;
      const { data: cachedRows } = await sb
        .from("analysis_reports")
        .select("result, created_at, session_id")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(1);

      const cached = cachedRows?.[0] ?? null;

      if (cached && (Date.now() - new Date(cached.created_at).getTime() < CACHE_MS)) {
        // Save a copy for the current session so it shows up in their Recent Reports
        if (cached.session_id !== sessionId) {
          try {
            const r = cached.result as any;
            await sb.from("analysis_reports").upsert({
              video_id: videoId,
              video_url: urls[0],
              video_title: r?.video?.title || null,
              channel_title: r?.video?.channelTitle || null,
              thumbnail: r?.video?.thumbnail || null,
              result: r,
              session_id: sessionId,
              created_at: new Date().toISOString(),
            }, { onConflict: "video_id,session_id" });
          } catch (e) {
            console.error("Failed to mirror cached report:", e);
          }
        }
        return new Response(JSON.stringify(cached.result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await analyzeVideo(urls[0], YOUTUBE_API_KEY, LOVABLE_API_KEY);

      // Upsert report (unique on video_id + session_id)
      try {
        await sb.from("analysis_reports").upsert({
          video_id: videoId,
          video_url: urls[0],
          video_title: result.video?.title || null,
          channel_title: result.video?.channelTitle || null,
          thumbnail: result.video?.thumbnail || null,
          result: result as any,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        }, { onConflict: "video_id,session_id" });
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
          console.error("Comparison video failed:", e);
          return { error: "Failed to analyze video", videoUrl: url };
        }
      })
    );

    return new Response(JSON.stringify({ comparison: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An error occurred while processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
