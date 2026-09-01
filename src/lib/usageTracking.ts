// Client-side usage counters are for UI display only — the authoritative daily limits
// are enforced server-side by the edge functions. Never trust these values for gating.
const DAILY_KEY = "ci_daily_usage";
const REPLY_DAILY_KEY = "ci_reply_daily_usage";
const AD_EVENTS_KEY = "ci_ad_events";

export const FREE_DAILY_LIMIT = 5;
export const FREE_REPLY_DAILY_LIMIT = 3;

interface DailyUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(key: string): DailyUsage {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const u = JSON.parse(raw) as DailyUsage;
      if (u.date === today()) return u;
    }
  } catch {
    // Ignore storage errors
  }
  return { date: today(), count: 0 };
}

function writeUsage(key: string, u: DailyUsage): void {
  try {
    localStorage.setItem(key, JSON.stringify(u));
  } catch {
    // Ignore storage errors
  }
}

export function getRemainingAnalyses(): number {
  if (isPremium()) return Infinity;
  const u = readUsage(DAILY_KEY);
  return Math.max(0, FREE_DAILY_LIMIT - u.count);
}

export function getUsedToday(): number {
  return readUsage(DAILY_KEY).count;
}

export function canAnalyze(): boolean {
  return isPremium() || readUsage(DAILY_KEY).count < FREE_DAILY_LIMIT;
}

export function recordAnalysis(): void {
  if (isPremium()) return;
  const u = readUsage(DAILY_KEY);
  u.count += 1;
  writeUsage(DAILY_KEY, u);
}

export function getRemainingReplies(): number {
  if (isPremium()) return Infinity;
  const u = readUsage(REPLY_DAILY_KEY);
  return Math.max(0, FREE_REPLY_DAILY_LIMIT - u.count);
}

export function getUsedRepliesToday(): number {
  return readUsage(REPLY_DAILY_KEY).count;
}

export function canGenerateReply(): boolean {
  return isPremium() || readUsage(REPLY_DAILY_KEY).count < FREE_REPLY_DAILY_LIMIT;
}

export function recordReplyGeneration(): void {
  if (isPremium()) return;
  const u = readUsage(REPLY_DAILY_KEY);
  u.count += 1;
  writeUsage(REPLY_DAILY_KEY, u);
}

// Premium entitlement is NOT client-controlled. There is no client-side flag that can
// unlock unlimited usage: quotas are enforced server-side in the edge functions
// (analyze-comments / generate-reply / check-report-quota). Until a verified
// server-side entitlement exists, everyone is on the free tier.
export function isPremium(): boolean {
  return false;
}

export function resetDailyUsage(): void {
  writeUsage(DAILY_KEY, { date: today(), count: 0 });
  writeUsage(REPLY_DAILY_KEY, { date: today(), count: 0 });
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
