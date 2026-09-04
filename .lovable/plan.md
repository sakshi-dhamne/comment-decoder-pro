# Plan: Recreate & deliver the research-doc generator (`gen.py`)

## Why the file is gone
The previous turn drafted the generator at `/tmp/research_doc/gen.py` but never ran or QA'd it. `/tmp` is ephemeral and is cleared between sessions, so the script — and the research PDF it would have produced — no longer exist. Nothing was ever persisted.

## What I'll do
1. **Recreate the generator script** — a ReportLab-based Python script (`gen.py`) that builds the research document covering:
   - System architecture & technology stack
   - Data flow (frontend → Edge Functions → AI Gateway → YouTube API)
   - Backend Edge Functions (`analyze-comments`, `generate-reply`, `check-report-quota`, `admin-usage`)
   - Data model & security (RLS, session isolation, quota logs)
   - NLP methodology (hybrid keyword + dedupe + Gemini Flash pipeline)
   - Caching, quotas, reliability/fallbacks
   - Auto-reply generation, insights, transcripts/timeline
   - Limitations, QA results, future work
2. **Save the script to a persistent location** — `/mnt/documents/research-gen.py` so you can download and keep the `.py` file itself.
3. **Run it** to generate `/mnt/documents/youtube-comment-insights-research.pdf`.
4. **QA the PDF** — convert each page to an image and inspect for layout/overflow/font issues; fix the script and re-run until clean.
5. **Deliver both files** as chat attachments so you can open the PDF and download the `.py`.

## What I'll reference
- `supabase/functions/*/index.ts` (analyze-comments, generate-reply, check-report-quota, admin-usage)
- `src/lib/*` (usageTracking, saveReport, generateReport, downloadReport, replyCache, sessionId)
- `src/pages/*` (App routes, Index dashboard)
- Project memory notes (NLP, backend architecture, security, caching, storage)

## Out of scope
- No changes to the actual app codebase or backend (this only produces a documentation PDF + its generator script).
