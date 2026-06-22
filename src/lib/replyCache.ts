// Client-side cache for generated replies so users can switch tones or reopen
// the reply panel without burning another server call.
const CACHE_KEY_PREFIX = "ci_reply_cache_v1";

function hashComment(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

function cacheKey(commentText: string, videoTitle?: string): string {
  return `${CACHE_KEY_PREFIX}_${hashComment(commentText + (videoTitle || ""))}`;
}

interface CachedReplies {
  [tone: string]: string[];
}

function readCache(commentText: string, videoTitle?: string): CachedReplies {
  try {
    const raw = localStorage.getItem(cacheKey(commentText, videoTitle));
    if (raw) return JSON.parse(raw) as CachedReplies;
  } catch {
    // ignore
  }
  return {};
}

function writeCache(commentText: string, videoTitle: string | undefined, cache: CachedReplies): void {
  try {
    localStorage.setItem(cacheKey(commentText, videoTitle), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function getCachedReplies(
  commentText: string,
  tone: string,
  videoTitle?: string
): string[] | null {
  const cache = readCache(commentText, videoTitle);
  const replies = cache[tone];
  return replies && replies.length ? replies : null;
}

export function setCachedReplies(
  commentText: string,
  tone: string,
  replies: string[],
  videoTitle?: string
): void {
  const cache = readCache(commentText, videoTitle);
  cache[tone] = replies;
  writeCache(commentText, videoTitle, cache);
}

export function hasAnyCachedReplies(commentText: string, videoTitle?: string): boolean {
  const cache = readCache(commentText, videoTitle);
  return Object.values(cache).some((arr) => arr && arr.length > 0);
}
