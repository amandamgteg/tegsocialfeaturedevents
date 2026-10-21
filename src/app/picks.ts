import { cardKey } from "@/lib/window";
import type { EventCard, FeedEvent } from "@/lib/types";

// Amanda's picks, kept in her own browser, selections keyed by card key, pasted images by event URL (decision 10).
// Kept apart from the cache of found images, so "Start over" can clear one without the other.
export const PICKS_KEY = "teg:picks";

export type StoredPicks = { selected: string[]; pasted: Record<string, string> };

const isWebUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Never throws. Missing, blocked or corrupt data gives an empty result. */
export function loadPicks(): StoredPicks {
  try {
    const raw = storage()?.getItem(PICKS_KEY);
    if (!raw) return { selected: [], pasted: {} };
    const parsed = JSON.parse(raw) as { selected?: unknown; pasted?: unknown } | null;
    const selected = Array.isArray(parsed?.selected) ? parsed.selected.filter((s): s is string => typeof s === "string") : [];
    const pasted: Record<string, string> = {};
    if (parsed?.pasted && typeof parsed.pasted === "object" && !Array.isArray(parsed.pasted)) {
      for (const [url, image] of Object.entries(parsed.pasted)) if (isWebUrl(image)) pasted[url] = image;
    }
    return { selected, pasted };
  } catch {
    return { selected: [], pasted: {} };
  }
}

export function savePicks(picks: StoredPicks): void {
  try {
    // Nothing to remember means nothing stored.
    if (picks.selected.length === 0 && Object.keys(picks.pasted).length === 0) return clearPicks();
    storage()?.setItem(PICKS_KEY, JSON.stringify(picks));
  } catch {
    // Storage full or blocked: carry on without remembering.
  }
}

export function clearPicks(): void {
  try {
    storage()?.removeItem(PICKS_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * Checks saved picks against today's feed. An event that has left the feed (or is no longer starred) drops out.
 * A pick outside the current window is kept if its image is on hand (decision 9), because without one
 * it could not be downloaded.
 */
export function restorePicks(
  stored: StoredPicks,
  feed: FeedEvent[],
  windowCards: EventCard[],
  readCachedImage: (eventUrl: string) => string | null,
): { selected: Set<string>; pasted: Record<string, string> } {
  const inFeed = new Set(feed.filter((e) => e.starred).map(cardKey));
  const urlsInFeed = new Set(feed.filter((e) => e.starred).map((e) => e.url));
  const inWindow = new Set(windowCards.map((c) => c.key));
  const urlOfKey = (key: string) => key.split("#")[0];
  const pasted = Object.fromEntries(Object.entries(stored.pasted).filter(([url]) => urlsInFeed.has(url)));
  const selected = new Set(
    stored.selected.filter(
      (key) => inFeed.has(key) && (inWindow.has(key) || urlOfKey(key) in pasted || readCachedImage(urlOfKey(key)) !== null),
    ),
  );
  return { selected, pasted };
}
