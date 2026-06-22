// Lightweight in-memory + cross-tab rate-limit signal for the Lovable AI Gateway.
// When any edge function reports a 429 / "service busy" / fallback response,
// we record a cooldown end timestamp so the UI can show a countdown.

const KEY = "ci_ai_cooldown_until";
const EVT = "ci-ai-cooldown-change";

export const DEFAULT_COOLDOWN_SECONDS = 60;
const TOTAL_KEY = "ci_ai_cooldown_total";

export function getCooldownTotal(): number {
  try {
    const raw = localStorage.getItem(TOTAL_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_COOLDOWN_SECONDS;
  } catch {
    return DEFAULT_COOLDOWN_SECONDS;
  }
}

export function getCooldownUntil(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts < Date.now()) return 0;
    return ts;
  } catch {
    return 0;
  }
}

export function startCooldown(seconds: number = DEFAULT_COOLDOWN_SECONDS): number {
  const safe = Math.max(5, Math.min(3600, Math.ceil(seconds)));
  const until = Date.now() + safe * 1000;
  try {
    localStorage.setItem(KEY, String(until));
    localStorage.setItem(TOTAL_KEY, String(safe));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
  return until;
}

export function clearCooldown(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

export function subscribeCooldown(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
