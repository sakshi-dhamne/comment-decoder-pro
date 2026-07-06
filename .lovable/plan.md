## Transcript × Comments Timeline

Link what viewers *said* to what happened *in the video*, so creators can see exactly which moments triggered praise, confusion, or complaints.

### What the user gets

A new **Timeline** tab in the results dashboard:

```text
0:00 ──●───●─────●●●───────●──────●─────── 12:34
       │   │      │        │       │
    Intro Demo  Pricing  Bug talk  Outro
    +18   +42   -31 😡   -57 🐛    +9
```

- Horizontal video timeline with clustered "reaction markers" (color = sentiment, size = comment volume).
- Hover/click a marker → panel showing the transcript excerpt at that timestamp **plus** the top comments referencing it.
- Section summary chips: "Pricing (4:10-5:30): 31 negative reactions — viewers confused about tiers."
- AI suggestions per hotspot: "Add a pinned comment clarifying pricing" / "Re-cut intro — 12 viewers said it's too long".

### How comments get mapped to moments

Two signals combined:
1. **Explicit timestamps** in comments (`3:42 that transition is 🔥`) — parsed with regex.
2. **Semantic matching** for comments without timestamps — embed each transcript chunk (~30s windows) and each comment, then assign the comment to the best-matching chunk above a similarity threshold. Unmatched comments stay in a "general" bucket.

### Technical plan

**Backend**
- New edge function `fetch-transcript`: pulls YouTube transcript via `youtube-transcript` (npm) with a fallback to timedtext scraping. Caches transcript JSON on `analysis_reports.result.transcript`.
- Extend `analyze-comments`:
  - After comments are fetched, run the timestamp regex pass.
  - For unmatched comments, batch-embed via Lovable AI Gateway (`google/text-embedding-004`), embed 30s transcript chunks the same way, cosine-match, keep matches ≥ 0.72.
  - Group results into "hotspots" (contiguous chunks with ≥ N reactions) and ask Gemini Flash for a 1-line summary + 1 suggestion per hotspot.
  - Return new `timeline` block in the result payload.

**Types** (`src/types/analysis.ts`)
```ts
timeline?: {
  duration: number;
  chunks: { start: number; end: number; text: string }[];
  hotspots: {
    start: number; end: number;
    sentiment: { positive: number; negative: number; neutral: number };
    commentIds: number[];
    summary: string;
    suggestion: string;
  }[];
  commentTimestamps: Record<number, number>; // comment index → seconds
}
```

**Frontend**
- New `src/components/TimelineView.tsx`: SVG/HTML timeline, markers, hover panel, hotspot cards.
- New `src/components/TranscriptViewer.tsx`: scrollable transcript with current chunk highlighted.
- Add "Timeline" tab in `src/pages/Index.tsx` between Insights and Comments.
- Include timeline hotspots + top-quoted moments in the PDF report (`src/lib/generateReport.ts`) — new "Moments that mattered" section with a mini bar chart.

**Cost / limits**
- Embeddings only run for comments without an explicit timestamp, capped at the same top-N cap analyze-comments already uses.
- Transcript fetch is cached in `analysis_reports` so re-opening a report is free.
- Videos with no available transcript degrade gracefully: timestamp-only mapping + a small "Transcript unavailable" notice.

### Files touched

- new: `supabase/functions/fetch-transcript/index.ts`
- edit: `supabase/functions/analyze-comments/index.ts` (embedding + hotspot pass)
- edit: `src/types/analysis.ts`
- new: `src/components/TimelineView.tsx`, `src/components/TranscriptViewer.tsx`
- edit: `src/pages/Index.tsx` (new tab)
- edit: `src/lib/generateReport.ts` (Moments section)
- migration: none — reuses `analysis_reports.result` jsonb

### Open questions

1. Should the Timeline tab be part of the free tier or gated behind the same daily quota as analysis?
2. For videos with no transcript (music, non-English, disabled captions), do you want us to attempt Whisper transcription via an edge function (extra cost) or just fall back to timestamp-only mapping?
