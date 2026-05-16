// Google AdSense configuration.
// Publisher ID is read from VITE_ADSENSE_CLIENT when present, otherwise
// falls back to the project owner's verified publisher account.
export const ADSENSE_CLIENT: string =
  (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ||
  "ca-pub-2911682905564566";

// Map of internal ad slot name -> AdSense slot ID.
// While slots are unconfigured, AdSlot.tsx falls back to the existing
// in-house sponsored promo so placements never render blank.
// Override via env: VITE_ADSENSE_SLOT_BELOW_SEARCH, etc.
export const ADSENSE_SLOTS: Record<string, string | undefined> = {
  below_search: import.meta.env.VITE_ADSENSE_SLOT_BELOW_SEARCH as string | undefined,
  between_stats_tabs: import.meta.env.VITE_ADSENSE_SLOT_BETWEEN as string | undefined,
  above_history: import.meta.env.VITE_ADSENSE_SLOT_ABOVE_HISTORY as string | undefined,
};

// Auto Ads: when no manual slot is configured we still let Google place ads
// automatically via the page-level <script> in index.html.
export const ADSENSE_AUTO_ADS = true;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function pushAd() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    // Silently ignore — usually means script blocked or already pushed.
    console.warn("[adsense] push failed", e);
  }
}
