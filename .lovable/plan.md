## Goal
Replace the CSV "Download Report" with a polished, human-readable **PDF report**, and cap PDF downloads to **3 per session per day** tracked in the database.

## 1. Styled PDF report (client-side)

Generate in the browser with `jspdf` + `jspdf-autotable` (small, no server round-trip, keeps the button snappy).

Report structure:
```text
┌─────────────────────────────────────────┐
│  Comment Insights Report                │  ← branded header w/ date
├─────────────────────────────────────────┤
│  Video: <title>                         │
│  Channel · Views · Comments · Analyzed  │
├─────────────────────────────────────────┤
│  Executive Summary   (insights.summary) │
├─────────────────────────────────────────┤
│  Sentiment Breakdown                    │
│    ● Positive  62%  ▇▇▇▇▇▇▇            │  ← colored bars
│    ● Neutral   25%  ▇▇▇                 │
│    ● Negative  13%  ▇▇                  │
├─────────────────────────────────────────┤
│  Top Topics            (table)          │
│  Categories            (table)          │
│  Likes / Dislikes / Complaints (lists)  │
│  Recommendations & Next Steps           │
├─────────────────────────────────────────┤
│  Comments & AI Replies (table)          │
│    Author │ Sentiment │ Comment │ Reply │
└─────────────────────────────────────────┘
Footer: page X of Y · comment-decoder-pro
```

- Uses semantic colors from the app's design tokens (positive/negative/neutral).
- Auto page breaks, wrapped cells, alternating row shading.
- Filename: `insights-<video-title-slug>-<date>.pdf`.

## 2. Server-side 3/day limit

**Heads-up on the tradeoff:** the backend has no standard rate-limiting primitive, so this is an ad-hoc counter — reliable per `session_id`, but a user who rotates sessions can bypass it. Confirming you're OK with that before I build.

New table `public.report_download_log`:
- `session_id text`, `downloaded_at timestamptz default now()`
- indexed on `(session_id, downloaded_at)`
- RLS enabled; only edge function (service role) touches it

New edge function `check-report-quota`:
- Input: `sessionId`
- Counts rows for that session in the last 24h
- Returns `{ allowed: boolean, used: number, remaining: number, resetsAt: iso }`
- If allowed, inserts a new log row and returns the quota

Flow when user clicks **Download Report**:
1. Call `check-report-quota` first
2. If `allowed === false` → toast "Daily limit reached (3/day). Resets at HH:MM." and abort
3. If allowed → generate + download the PDF, show `used/3` in the button label

## 3. UI changes
- Remove the old CSV/JSON export buttons from the Comments tab header (keep just the new **Download Report (PDF)** button — cleaner). Confirm if you'd rather keep them.
- Button shows remaining quota: `Download Report · 2/3 left today`.
- Disabled + reset-time tooltip when exhausted.

## Files
- **new:** `src/lib/generateReport.ts` — jsPDF builder
- **new:** `supabase/functions/check-report-quota/index.ts`
- **new migration:** `report_download_log` table + grants + RLS
- **edit:** `src/pages/Index.tsx` — swap CSV button for PDF button + quota display
- **edit:** `package.json` — add `jspdf`, `jspdf-autotable`
- **delete:** `src/lib/downloadReport.ts::downloadFullReportCSV` (or keep as fallback)

## Open questions
1. Confirm the "session-scoped, bypassable" tradeoff is acceptable, or would you rather wait until auth is added for a true per-user limit?
2. Keep the old CSV/JSON export buttons, or replace them entirely with the PDF button?