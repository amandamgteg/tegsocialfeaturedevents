import type { DateWindow, EventCard, FeedEvent } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today (the browser's local date, decision 5) through today+14. */
export function defaultWindow(today: Date): DateWindow {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  return { start: ymd(today), end: ymd(end) };
}

/** Starred events in the window, one card per url, soonest first (decisions 1, 5, 7). */
export function buildCards(feed: FeedEvent[], w: DateWindow): EventCard[] {
  const firstByUrl = new Map<string, FeedEvent>();
  for (const e of feed) {
    if (!e.starred || e.date < w.start || e.date > w.end) continue;
    const seen = firstByUrl.get(e.url);
    if (!seen || e.date < seen.date) firstByUrl.set(e.url, e);
  }
  return [...firstByUrl.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .map(({ id, title, url, date, tags }) => ({ id, title, url, date, tags }));
}
