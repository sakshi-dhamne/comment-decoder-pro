import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression config for the Comment Insights dashboard.
 * Baselines live next to each spec under __screenshots__/.
 * Run: bunx playwright test -c playwright.visual.config.ts
 * Update baselines: bunx playwright test -c playwright.visual.config.ts --update-snapshots
 */
export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    // Disable animations for stable screenshots.
    launchOptions: { args: ["--force-prefers-reduced-motion"] },
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02, // tolerate 2% pixel diff (fonts / anti-aliasing)
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
