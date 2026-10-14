// Browser cache of found images, keyed by event URL (decision 23). No server store.
// Every call tolerates storage being missing or throwing: the page then just looks images up every time.

const PREFIX = "teg:image:";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const isWebUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);

export function readCachedImage(eventUrl: string): string | null {
  try {
    const raw = storage()?.getItem(PREFIX + eventUrl);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { imageUrl?: unknown } | null;
    return isWebUrl(parsed?.imageUrl) ? parsed.imageUrl : null;
  } catch {
    return null;
  }
}

/** Only resolved results are ever stored. A failed lookup is never cached. */
export function cacheResolvedImage(eventUrl: string, imageUrl: string): void {
  if (!isWebUrl(imageUrl)) return;
  try {
    storage()?.setItem(PREFIX + eventUrl, JSON.stringify({ imageUrl }));
  } catch {
    // Storage full or blocked: carry on without the cache.
  }
}

export function forgetCachedImage(eventUrl: string): void {
  try {
    storage()?.removeItem(PREFIX + eventUrl);
  } catch {
    // Nothing to do.
  }
}
