// Centralized feature flags. Default OFF in production.
//
// To enable a flag, set the corresponding env var to "true" in your
// deployment environment (e.g. `.env.local` for local dev, or your hosting
// provider's environment settings), then rebuild:
//
//   VITE_FEATURE_USAGE_LIMITS=true   # enables free-tier daily limit + "Go Pro" upgrade prompts
//
// Vite only exposes variables prefixed with VITE_ to the client bundle.
// After changing env vars you must restart `bun run dev` (or redeploy).

const flag = (name: string): boolean =>
  (import.meta.env[name] as string | undefined)?.toLowerCase() === "true";

export const FEATURE_USAGE_LIMITS = flag("VITE_FEATURE_USAGE_LIMITS");
