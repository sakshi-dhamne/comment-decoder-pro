// Lightweight in-memory + cross-tab rate-limit signal for the Lovable AI Gateway.
// When any edge function reports a 429 / "service busy" / fallback response,
// we record a cooldown end timestamp so the UI can show a countdown.

const KEY = "ci_ai_cooldown_until";
const EVT = "ci-ai-cooldown-change";

export const DEFAULT_COOLDOWN_SECONDS = 60;

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
  const until = Date.now() + seconds * 1000;
  try {
    localStorage.setItem(KEY, String(until));
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
