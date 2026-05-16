# YouTube Comment Insights

AI-powered analysis dashboard for YouTube video comments. Paste a URL and get sentiment breakdowns, topic clustering, content ideas, FAQs, trend detection, keyword clouds, and AI-generated reply suggestions — all in a clean, fast, minimalist UI.

**Live app:** https://comment-decoder-pro.lovable.app

---

## Features

- **Sentiment analysis** — Hybrid pipeline (keyword pre-classification + deduplication + Gemini Flash) to cut AI token usage by ~60–80% while staying accurate.
- **7-tab dashboard** — Insights · Ideas · Trends · Sentiment · Categories · Keywords · Comments.
- **Multi-video comparison** — Side-by-side analysis for up to 3 YouTube URLs.
- **Auto-reply generator** — Context-aware reply drafts in three tones (friendly, professional, witty).
- **Content ideas & FAQs** — AI-extracted video ideas and recurring questions from your audience.
- **Trend detection** — Surfaces emerging topics and keyword momentum.
- **Interactive sentiment chart** — Click a slice to drill into the top comments behind it.
- **Report history** — Reports persisted in Lovable Cloud per session.
- **24-hour cross-session cache** — Same URL within 24h returns the stored report instead of re-analyzing.
- **Exports & sharing** — Download CSV / JSON, copy a shareable link.
- **Token usage panel** — Owner-only debug view showing AI calls, tokens, and estimated cost.
- **Light & dark themes** — Light by default; toggle persisted in `localStorage`.
- **Monetization** — Non-intrusive Google AdSense + house promos, hidden for premium users.
- **Free-tier gating** — 5 analyses/day for free users with upgrade prompt.

---

## Tech stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, Framer Motion, Recharts
- **Backend:** Lovable Cloud (Supabase) — Postgres + Edge Functions (Deno)
- **AI:** Lovable AI Gateway → Google Gemini 2.5 Flash / Flash-Lite
- **APIs:** YouTube Data API v3
- **Ads:** Google AdSense (`ca-pub-2911682905564566`)

---

## Project structure

```
src/
  components/        # Dashboard widgets, charts, ad slots, UI primitives
  pages/             # Index.tsx (main dashboard), NotFound.tsx
  lib/               # adsense, usageTracking, sessionId, downloadReport, saveReport
  integrations/
    supabase/        # Auto-generated client + types (do not edit)
  types/             # AnalysisResult and shared types
supabase/
  functions/
    analyze-comments/  # Main analysis pipeline
    generate-reply/    # Reply generation
public/
  ads.txt            # AdSense site verification
```

---

## Local development

```bash
bun install
bun run dev
```

Open http://localhost:5173.

> The Lovable Cloud backend (`VITE_SUPABASE_*` env vars) is provisioned automatically — no manual `.env` setup needed when working inside Lovable.

---

## Environment variables

Auto-managed by Lovable Cloud:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Backend URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |

Optional AdSense overrides (set to enable manually-placed ad units):

| Variable | Purpose |
|---|---|
| `VITE_ADSENSE_CLIENT` | Publisher ID (defaults to `ca-pub-2911682905564566`) |
| `VITE_ADSENSE_SLOT_BELOW_SEARCH` | Slot ID — banner below the search bar |
| `VITE_ADSENSE_SLOT_BETWEEN` | Slot ID — native ad between stats and tabs |
| `VITE_ADSENSE_SLOT_ABOVE_HISTORY` | Slot ID — native ad above report history |

Edge Function secrets (configured in Lovable Cloud):

- `YOUTUBE_API_KEY` — YouTube Data API v3 key
- `LOVABLE_API_KEY` — Lovable AI Gateway (auto-provisioned)

---

## Deployment

The app deploys automatically through Lovable. Edge Functions deploy on save — no manual `supabase functions deploy` needed.

---

## License

Private project. All rights reserved.
