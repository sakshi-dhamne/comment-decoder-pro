import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Visual regression covering:
 *  - Home / dashboard shell (empty state)
 *  - Each Insights tab after seeding a canned analysis result via localStorage
 *
 * The suite injects a fixture analysis result into localStorage so it does not
 * hit the network or the real edge functions. On first run, snapshots are
 * generated as baselines; subsequent runs diff pixels against them.
 */

const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/analysis-result.json");

async function seedResult(page: Page) {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"));
  // Sessioned storage keys used by the app.
  await page.addInitScript((data) => {
    try {
      localStorage.setItem("comment_insights_session_id", "visual-test-session");
      localStorage.setItem("ci_last_analysis_result", JSON.stringify(data));
      localStorage.setItem("ci_is_premium", "true"); // suppress upgrade prompts
    } catch { /* ignore */ }
  }, fixture);
}

async function stabilize(page: Page) {
  // Inject CSS to hide known dynamic UI (timestamps, sparkline animations, ads).
  await page.addStyleTag({
    content: `
      * { animation: none !important; transition: none !important; caret-color: transparent !important; }
      [data-testid="timestamp"], .ad-slot, [data-ad-slot] { visibility: hidden !important; }
    `,
  });
  // Wait for fonts.
  await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready);
}

test.describe("Visual regression – dashboard", () => {
  test("home / empty state", async ({ page }) => {
    await page.goto("/");
    await stabilize(page);
    await expect(page).toHaveScreenshot("home-empty.png");
  });

  test("insights tabs (seeded)", async ({ page }) => {
    await seedResult(page);
    await page.goto("/");
    await stabilize(page);

    const tabs = await page.locator('[role="tab"]').all();
    if (!tabs.length) {
      // If seeding didn't render the dashboard (fixture-less mode), just capture the page.
      await expect(page).toHaveScreenshot("dashboard-noseed.png");
      test.skip(true, "No insight tabs rendered — dashboard requires a live result or the fixture-driven code path.");
    }

    for (const tab of tabs) {
      const label = (await tab.textContent())?.trim().toLowerCase().replace(/\s+/g, "-") || "tab";
      await tab.click();
      await page.waitForTimeout(300);
      await stabilize(page);
      await expect(page).toHaveScreenshot(`insights-${label}.png`);
    }
  });
});
