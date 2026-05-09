// Local-first usage gating + ad analytics. Ready to migrate to backend later.
const DAILY_KEY = "ci_daily_usage";
const PREMIUM_KEY = "ci_is_premium";
const AD_EVENTS_KEY = "ci_ad_events";

export const FREE_DAILY_LIMIT = 5;

interface DailyUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): DailyUsage {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const u = JSON.parse(raw) as DailyUsage;
      if (u.date === today()) return u;
    }
  } catch {
    // Ignore storage errors
  }
  return { date: today(), count: 0 };
}

export function getRemainingAnalyses(): number {
  if (isPremium()) return Infinity;
  const u = readUsage();
  return Math.max(0, FREE_DAILY_LIMIT - u.count);
}

export function getUsedToday(): number {
  return readUsage().count;
}

export function canAnalyze(): boolean {
  return isPremium() || readUsage().count < FREE_DAILY_LIMIT;
}

export function recordAnalysis(): void {
  if (isPremium()) return;
  const u = readUsage();
  u.count += 1;
  localStorage.setItem(DAILY_KEY, JSON.stringify(u));
}

export function isPremium(): boolean {
  return localStorage.getItem(PREMIUM_KEY) === "true";
}

export function setPremium(v: boolean): void {
  localStorage.setItem(PREMIUM_KEY, v ? "true" : "false");
}

// --- Ad analytics (basic, local) ---
export interface AdEvent {
  slot: string;
  type: "impression" | "click";
  ts: number;
}

export function trackAdEvent(slot: string, type: "impression" | "click"): void {
  try {
    const raw = localStorage.getItem(AD_EVENTS_KEY);
    const arr: AdEvent[] = raw ? JSON.parse(raw) : [];
    arr.push({ slot, type, ts: Date.now() });
    // Cap at last 500 to keep storage small
    const trimmed = arr.slice(-500);
    localStorage.setItem(AD_EVENTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function getAdStats(): { impressions: number; clicks: number; ctr: number } {
  try {
    const raw = localStorage.getItem(AD_EVENTS_KEY);
    const arr: AdEvent[] = raw ? JSON.parse(raw) : [];
    const impressions = arr.filter((e) => e.type === "impression").length;
    const clicks = arr.filter((e) => e.type === "click").length;
    return { impressions, clicks, ctr: impressions ? clicks / impressions : 0 };
  } catch {
    return { impressions: 0, clicks: 0, ctr: 0 };
  }
}
