import home from "@/assets/blog-home.png";
import dashboard from "@/assets/blog-dashboard.png";
import sentiment from "@/assets/blog-sentiment.png";
import categories from "@/assets/blog-categories.png";
import keywords from "@/assets/blog-keywords.png";
import trends from "@/assets/blog-trends.png";
import comments from "@/assets/blog-comments.png";
import autoreply from "@/assets/blog-autoreply.png";
import compare from "@/assets/blog-compare.png";
import ideas from "@/assets/blog-ideas.png";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  cover: string;
  sections: Array<
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "img"; src: string; alt: string; caption?: string }
  >;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "getting-started",
    title: "Getting started with Comment Decoder Pro",
    description:
      "A walkthrough of analyzing your first YouTube video — from pasting a URL to reading the sentiment breakdown.",
    date: "May 24, 2026",
    readTime: "4 min read",
    cover: home,
    sections: [
      { type: "p", text: "Comment Decoder Pro turns a YouTube comment section into a structured report. No signup, no install — paste a URL and you get sentiment scores, recurring topics, content ideas, and trend signals in under a minute." },

      { type: "h2", text: "Step 1 — Paste a video URL" },
      { type: "p", text: "Open the home page. You will see a single input field and an Analyze button. Paste any public YouTube video URL (long youtube.com/watch?v=… form or the short youtu.be/… form both work) and hit Analyze." },
      { type: "img", src: home, alt: "Home page with URL input and Analyze button", caption: "The home page: paste a URL and click Analyze." },

      { type: "h2", text: "Step 2 — Wait for the pipeline to run" },
      { type: "p", text: "Behind the scenes the app fetches the comments via the YouTube Data API, runs a fast keyword pre-classifier, deduplicates near-identical comments, and sends a single batched request to Google's Gemini Flash model for sentiment and topic labelling. A second call generates higher-level insights like content ideas and FAQs." },
      { type: "p", text: "The first run for a given video usually completes in 30–60 seconds. Repeat lookups within 24 hours are served from cache and return instantly." },

      { type: "h2", text: "Step 3 — Read the overview dashboard" },
      { type: "p", text: "The result loads into a tabbed dashboard. The Insights tab is your starting point: a one-line summary, what audiences like and dislike, key complaints, and recommended next actions." },
      { type: "img", src: dashboard, alt: "Analyzed dashboard with video info, stats and insights", caption: "The main dashboard after a video is analyzed — stats, insights and recent reports." },

      { type: "h2", text: "Step 4 — Dive into sentiment" },
      { type: "p", text: "Click the Sentiment tab for a positive / neutral / negative breakdown with a clickable donut chart. The chart is interactive — pick any slice to filter the comment list down to that sentiment." },
      { type: "img", src: sentiment, alt: "Sentiment breakdown chart with top topics", caption: "Sentiment breakdown sits next to the top topics, so you can spot which themes drive each mood." },

      { type: "h2", text: "Step 5 — Explore categories and keywords" },
      { type: "p", text: "The Categories tab buckets comments into Praise, Complaints, Questions, Suggestions, Spam and Other — with example comments under each. The Keywords tab gives you the raw words and phrases people are using most." },
      { type: "img", src: categories, alt: "Comment categories bar chart with example comments", caption: "Categories tab: how many comments fall into each bucket, plus 2–3 examples per category." },
      { type: "img", src: keywords, alt: "Keyword cloud", caption: "The keyword cloud surfaces what specific terms the audience keeps repeating." },

      { type: "h2", text: "Tips" },
      { type: "p", text: "Videos with more than ~500 comments give the most reliable signal. Very new uploads may have too few comments for the topic clusters to settle. The 24-hour cache means you can revisit the same report without spending API quota." },
    ],
  },

  {
    slug: "comparing-videos",
    title: "Compare up to 5 YouTube videos side by side",
    description:
      "Use the multi-video comparison view to benchmark a new upload against your back catalog or against a competitor.",
    date: "May 22, 2026",
    readTime: "3 min read",
    cover: compare,
    sections: [
      { type: "p", text: "Single-video analysis is great for one upload, but creators usually want context: is this video doing better or worse than my last three? Is the sentiment trending up? Comment Decoder Pro lets you compare up to five videos in one view." },

      { type: "h2", text: "Switch into compare mode" },
      { type: "p", text: "From the home page, click the Compare Videos button next to Analyze. The single URL input is replaced by a stack of multi-URL inputs." },
      { type: "img", src: home, alt: "Home page with Compare Videos button visible", caption: "The Compare Videos button sits right next to Analyze." },

      { type: "h2", text: "Add your URLs" },
      { type: "p", text: "Paste between 2 and 5 YouTube URLs. Use Add URL to bring up more rows, or the × to remove one. Each row is validated independently — you'll see an error inline if a URL isn't a real YouTube link." },
      { type: "img", src: compare, alt: "Multi-URL comparison input form", caption: "Compare mode: stack 2–5 URLs, hit Compare." },

      { type: "h2", text: "What the comparison shows" },
      { type: "p", text: "When you hit Compare, every video is analyzed in parallel. You get a single dashboard that lines them up side-by-side." },
      { type: "ul", items: [
        "Sentiment bars for every video next to each other",
        "Top topics per video aligned in columns, so you can spot what only appears in one",
        "Comment volume and a per-video positive-percent comparison",
        "A summary highlighting which video over-indexes on praise, questions, or complaints",
      ]},
      { type: "img", src: sentiment, alt: "Sentiment chart used as comparison reference", caption: "Each video gets its own sentiment donut — easy to scan across." },
      { type: "img", src: categories, alt: "Categories chart for comparison", caption: "Compare which video pulled more questions vs. praise vs. complaints." },

      { type: "h2", text: "When this is useful" },
      { type: "p", text: "Best used for A/B style review: a new format vs. your usual format, a sponsored video vs. an organic one, your video vs. a competitor's on the same topic. The fastest way to find out what your audience actually responded to." },
    ],
  },

  {
    slug: "auto-reply-tips",
    title: "Using the auto-reply generator without sounding like a bot",
    description:
      "Three tones, one tip — how to use AI-suggested replies as a starting point rather than a copy-paste shortcut.",
    date: "May 20, 2026",
    readTime: "3 min read",
    cover: autoreply,
    sections: [
      { type: "p", text: "The auto-reply generator gives you three drafted replies for any individual comment — friendly, professional, and witty. It is fast, but it is also obvious when a creator pastes AI output verbatim. Here is how to use it well." },

      { type: "h2", text: "Open the Comments tab" },
      { type: "p", text: "Every analyzed comment lives in the Comments tab, with sentiment tags and filters across the top. Use the Positive / Neutral / Negative chips to narrow down — replies usually matter most under the negative and questioning ones." },
      { type: "img", src: comments, alt: "Comments tab with sentiment filters and reply buttons", caption: "Each comment has a Reply button on the right." },

      { type: "h2", text: "Click Reply on any comment" },
      { type: "p", text: "Hitting Reply opens an inline panel pinned under the comment. You pick a tone — Friendly, Professional, or Witty — and click Generate Replies." },
      { type: "img", src: autoreply, alt: "Auto-reply generator with tone picker", caption: "Pick a tone, then Generate Replies." },

      { type: "h2", text: "How it works under the hood" },
      { type: "p", text: "The model receives the original comment plus a small amount of context about the video and the tone you picked. It returns three short drafts. You copy the one closest to what you want and edit from there." },

      { type: "h2", text: "Three rules for natural-sounding replies" },
      { type: "ul", items: [
        "Always edit at least one sentence. The drafts are intentionally generic — your voice is what makes a reply land.",
        "Drop the formal sign-offs. The model leans polite; real comment replies are casual.",
        "Use the witty tone sparingly. It works for fans, less so for genuine questions or complaints.",
      ]},
      { type: "img", src: sentiment, alt: "Sentiment chart highlighting negative comments to prioritize", caption: "Tip: filter to Negative first — these are the replies that move the needle." },
      { type: "img", src: categories, alt: "Categories chart highlighting Questions", caption: "Then jump to the Questions category — those replies are the easiest wins." },

      { type: "h2", text: "What it is good for" },
      { type: "p", text: "Bulk-answering similar questions, breaking writer's block on a long comment, and keeping a consistent tone across replies when you are tired. It is not a replacement for actually reading the comment." },
    ],
  },

  {
    slug: "how-sentiment-analysis-works",
    title: "How sentiment analysis actually works on YouTube comments",
    description:
      "A plain-English walkthrough of how a comment gets labelled positive, negative, or neutral — and why short YouTube comments are uniquely hard.",
    date: "May 18, 2026",
    readTime: "5 min read",
    cover: sentiment,
    sections: [
      { type: "p", text: "Sentiment analysis sounds simple — is this comment happy or angry? — but YouTube comments are one of the messiest text sources online. Slang, sarcasm, emoji, multilingual fragments, and comments that are just \"🔥🔥🔥\" all show up. Here's what's actually happening when Comment Decoder Pro tags a comment." },

      { type: "h2", text: "Stage 1 — Cheap keyword pre-classification" },
      { type: "p", text: "Before anything touches an LLM, every comment runs through a small keyword and emoji scorer. Strongly polar comments (\"this is amazing\", \"trash video\", \"❤️\", \"👎\") get a confident label immediately. Roughly 30–40% of comments on a typical video can be classified this way, which saves both latency and AI tokens." },
      { type: "img", src: sentiment, alt: "Sentiment donut chart showing positive, neutral and negative split", caption: "The donut chart you see is the merged output of the keyword pass and the LLM pass." },

      { type: "h2", text: "Stage 2 — Deduplication" },
      { type: "p", text: "Viral videos generate huge amounts of near-duplicate comments (\"first\", \"who's here in 2026\", the same emoji string). We hash and cluster these so the model only sees one representative per group. The full count is preserved for the stats — but the AI doesn't waste a token on the 400th \"first!\" comment." },

      { type: "h2", text: "Stage 3 — Batched LLM labelling" },
      { type: "p", text: "What's left — the ambiguous middle — gets sent to Google Gemini Flash in batches. The model is asked to return a sentiment label, a topic tag, and a short reason, all in a structured JSON shape. Batching is what keeps the cost low: one API call labels dozens of comments at once instead of one per call." },
      { type: "img", src: comments, alt: "Comment list with per-comment sentiment tags", caption: "Each labelled comment shows its sentiment tag — that's the merged output of all three stages." },

      { type: "h2", text: "Why YouTube comments are uniquely hard" },
      { type: "ul", items: [
        "Sarcasm: \"oh yeah this was definitely worth 12 minutes\" is technically positive vocabulary but actually negative.",
        "Length: most comments are under 15 words; there's barely any context to work with.",
        "Code-switching: English / Hindi / Spanish in the same comment is normal.",
        "Emoji-only comments where the meaning depends entirely on which emoji is used.",
        "Inside jokes and references to the video that an AI hasn't seen.",
      ]},

      { type: "h2", text: "How to read the results responsibly" },
      { type: "p", text: "Treat the percentage split as a directional signal, not a verdict. A 60/30/10 split tells you the room is mostly happy. A 30/30/40 split tells you something is genuinely off and you should read the negative bucket. Don't read too much into a 2% week-over-week swing." },
      { type: "img", src: categories, alt: "Comment categories bar chart", caption: "Pair sentiment with categories — \"40% negative\" matters more when half of those are in Complaints." },

      { type: "h2", text: "The honest limitations" },
      { type: "p", text: "Best results come from English-dominant videos with at least a few hundred comments. Sentiment accuracy on heavily ironic communities (gaming, sports, politics) sits lower than on tutorial or product-review channels. We surface a confidence indicator in the AI Usage panel so you know when a video was easy or hard to read." },
    ],
  },

  {
    slug: "comment-data-for-content-planning",
    title: "5 ways to use comment data for content planning",
    description:
      "Concrete ways to turn the dashboard into a content calendar — from FAQ-driven videos to follow-up topic ideas.",
    date: "May 16, 2026",
    readTime: "4 min read",
    cover: ideas,
    sections: [
      { type: "p", text: "A sentiment report is interesting. A content calendar is useful. Here are five concrete ways creators we've talked to turn the dashboard's output into their next 30 days of uploads." },

      { type: "h2", text: "1. Make the FAQ tab your next video" },
      { type: "p", text: "The Ideas tab surfaces frequently asked questions across the whole comment thread. If three different commenters ask the same thing, that's a video idea — or at least a pinned-comment answer. The questions are pre-clustered, so you don't have to manually scroll 600 comments to find them." },
      { type: "img", src: ideas, alt: "Ideas tab showing content ideas and FAQs", caption: "The Ideas tab is the cheapest content brief you'll ever get." },

      { type: "h2", text: "2. Mine the Questions category for shorts" },
      { type: "p", text: "Open the Categories tab and click into Questions. Every question that doesn't deserve a full video is a perfect 30-second Short or community post. A single popular video can usually fuel a week of Shorts this way." },
      { type: "img", src: categories, alt: "Categories chart with the Questions bucket highlighted", caption: "The Questions bucket is a Shorts goldmine." },

      { type: "h2", text: "3. Use Complaints to fix the next upload" },
      { type: "p", text: "Audio too quiet? Intro too long? Sponsor placement felt clumsy? Complaints almost always cluster around something specific. Skim the top 5–10 complaints and you'll have a punch-list for the next thumbnail, edit, or script." },
      { type: "img", src: dashboard, alt: "Dashboard with Key Complaints panel visible", caption: "The Insights tab summarises complaints into a short, scannable list." },

      { type: "h2", text: "4. Compare a winner against a flop" },
      { type: "p", text: "Use the multi-video comparison view to put a video that went well next to one that underperformed — same channel, same audience. The sentiment and topic differences usually point to one or two specific things you changed (length, topic, tone)." },
      { type: "img", src: compare, alt: "Compare mode multi-URL input", caption: "Compare mode is the fastest forensic tool for a flop." },
      { type: "img", src: sentiment, alt: "Sentiment chart used for comparison", caption: "Look at the negative percentage shift — that's usually where the diagnosis lives." },

      { type: "h2", text: "5. Track recurring keywords as a content radar" },
      { type: "p", text: "The Trends tab shows what topics and keywords keep climbing across your latest videos. Recurring high-frequency keywords are your audience telling you what they want more of, without you having to ask." },
      { type: "img", src: trends, alt: "Trend detection with keyword frequency", caption: "Words that keep getting bigger across uploads are your next series." },

      { type: "h2", text: "Put it on a cadence" },
      { type: "p", text: "Most creators get the most value from this when they run a report 48 hours after every upload, then a second one a week later to see how sentiment evolved. That's two reports per video, takes ten minutes, and quietly becomes the most data-driven part of their workflow." },
    ],
  },
];

export const getPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
