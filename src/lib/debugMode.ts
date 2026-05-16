// Debug flag — gates owner-only UI (token usage panel, upgrade prompt, etc.)
// so it doesn't appear on the published site until we're ready to ship.
//
// Enable:  visit any page with ?debug=1  (persists in localStorage)
// Disable: visit any page with ?debug=0
const KEY = "ci_debug_mode";

function readFromUrl(): boolean | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("debug");
  if (p === "1" || p === "true") return true;
  if (p === "0" || p === "false") return false;
  return null;
}

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const fromUrl = readFromUrl();
  if (fromUrl !== null) {
    try {
      localStorage.setItem(KEY, fromUrl ? "1" : "0");
    } catch {}
    return fromUrl;
  }
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
