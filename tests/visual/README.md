# Visual regression tests

Playwright-based pixel-diff coverage for the main dashboard and Insights tabs.

## Layout

- `playwright.visual.config.ts` — chromium desktop config, 2% pixel-diff tolerance.
- `tests/visual/dashboard.spec.ts` — one spec per visual surface.
- `tests/fixtures/analysis-result.json` — canned analysis result seeded into localStorage so tests are hermetic.
- `tests/visual/__screenshots__/` — baseline PNGs (generated on first run).

## Commands

```bash
# Run against the local dev server (must be started separately).
bunx playwright test -c playwright.visual.config.ts

# Regenerate baselines after intentional UI changes.
bunx playwright test -c playwright.visual.config.ts --update-snapshots

# Point at a different URL (e.g. preview deploy).
PLAYWRIGHT_BASE_URL=https://preview.example.com \
  bunx playwright test -c playwright.visual.config.ts
```

## What's captured

1. Home / empty state (before any analysis runs).
2. Each `[role="tab"]` inside the Insights area, after a fixture result is seeded via `localStorage`.

Diff reports land in `playwright-report/` when a run fails.
