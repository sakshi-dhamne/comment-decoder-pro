import heroApp from "@/assets/blog-hero-app.png";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  cover: string;
  /** Each section is rendered in order. Either a paragraph or a screenshot block. */
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
      "A 2-minute walkthrough of analyzing your first YouTube video — from pasting a URL to reading the sentiment breakdown.",
    date: "May 24, 2026",
    readTime: "3 min read",
    cover: heroApp,
    sections: [
      { type: "p", text: "Comment Decoder Pro turns a YouTube comment section into a structured report. No signup, no install — paste a URL and you get sentiment scores, recurring topics, content ideas, and trend signals in under a minute." },
      { type: "h2", text: "Step 1 — Paste a video URL" },
      { type: "p", text: "Open the home page. You will see a single input field and an Analyze button. Paste any public YouTube video URL (long youtube.com/watch?v=… form or the short youtu.be/… form both work) and hit Analyze." },
      { type: "img", src: heroApp, alt: "Comment Decoder Pro home page with the URL input visible", caption: "The home page: paste a URL and click Analyze." },
      { type: "h2", text: "Step 2 — Wait for the pipeline to run" },
      { type: "p", text: "Behind the scenes the app fetches the comments via the YouTube Data API, runs a fast keyword pre-classifier, deduplicates near-identical comments, and sends a single batched request to Google's Gemini Flash model for sentiment and topic labelling. A second call generates higher-level insights like content ideas and FAQs." },
      { type: "p", text: "The first run for a given video usually completes in 30–60 seconds. Repeat lookups within 24 hours are served from cache and return instantly." },
      { type: "h2", text: "Step 3 — Read the dashboard" },
      { type: "p", text: "The result loads into a tabbed dashboard. Each tab focuses on a different angle:" },
      { type: "ul", items: [
        "Sentiment — overall positive / negative / neutral split with an interactive chart",
        "Categories — comments grouped by topic (questions, praise, complaints, suggestions, etc.)",
        "Trends — what is being discussed more or less over time",
        "Ideas — new content suggestions surfaced from audience asks",
        "FAQs — recurring questions you should probably answer in a pinned comment",
        "Comments — the raw list, filterable by sentiment and topic",
        "Auto-reply — generate a context-aware reply to any single comment in three tones",
      ]},
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
    readTime: "2 min read",
    cover: heroApp,
    sections: [
      { type: "p", text: "Single-video analysis is great for one upload, but creators usually want context: is this video doing better or worse than my last three? Is the sentiment trending up? Comment Decoder Pro lets you compare up to five videos in one view." },
      { type: "h2", text: "How to start a comparison" },
      { type: "p", text: "On the home page, click Compare Videos next to the Analyze button. You will get a multi-input panel where you can paste 2 to 5 YouTube URLs. Hit Compare and each video is analyzed in parallel." },
      { type: "img", src: heroApp, alt: "Home page showing the Compare Videos button", caption: "The Compare Videos button sits next to Analyze on the home page." },
      { type: "h2", text: "What you get back" },
      { type: "ul", items: [
        "Side-by-side sentiment bars for every video",
        "Top topics per video, aligned so you can spot what only appears in one",
        "Comment volume and engagement comparison",
        "A summary highlighting which video over-indexes on praise, questions, or complaints",
      ]},
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
    readTime: "2 min read",
    cover: heroApp,
    sections: [
      { type: "p", text: "The auto-reply generator gives you three drafted replies for any individual comment — friendly, professional, and witty. It is fast, but it is also obvious when a creator pastes AI output verbatim. Here is how to use it well." },
      { type: "h2", text: "How it works" },
      { type: "p", text: "Open any comment from the Comments tab and click Generate reply. The model receives the original comment plus a small amount of context about the video. It returns three short drafts in different tones. Pick one, edit, send." },
      { type: "img", src: heroApp, alt: "Comment Decoder Pro dashboard", caption: "Replies are generated per-comment from the dashboard." },
      { type: "h2", text: "Three rules for natural-sounding replies" },
      { type: "ul", items: [
        "Always edit at least one sentence. The drafts are intentionally generic — your voice is what makes a reply land.",
        "Drop the formal sign-offs. The model leans polite; real comment replies are casual.",
        "Use the witty tone sparingly. It works for fans, less so for genuine questions or complaints.",
      ]},
      { type: "h2", text: "What it is good for" },
      { type: "p", text: "Bulk-answering similar questions, breaking writer's block on a long comment, and keeping a consistent tone across replies when you are tired. It is not a replacement for actually reading the comment." },
    ],
  },
];

export const getPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
