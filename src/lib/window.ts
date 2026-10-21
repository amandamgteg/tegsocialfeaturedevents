import type { DateWindow, EventCard, FeedEvent } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today (the browser's local date, decision 5) through today+14. */
export function defaultWindow(today: Date): DateWindow {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  return { start: ymd(today), end: ymd(end) };
}

/** The picking key for an event: its url, plus its date when it repeats (each date is its own event). */
export const cardKey = (e: Pick<FeedEvent, "url" | "date" | "recurring">) => (e.recurring ? `${e.url}#${e.date}` : e.url);

/**
 * Starred events in the window, soonest first (decisions 1, 5, 7).
 * A repeating event gets one card per date. Any other events sharing a link get one card listing all their dates.
 */
export function buildCards(feed: FeedEvent[], w: DateWindow): EventCard[] {
  const cards = new Map<string, EventCard>();
  for (const e of [...feed].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!e.starred || e.date < w.start || e.date > w.end) continue;
    const key = cardKey(e);
    const seen = cards.get(key);
    if (seen) seen.dates.push(e.date);
    else cards.set(key, { id: e.id, key, title: e.title, url: e.url, date: e.date, dates: [e.date], tags: e.tags });
  }
  return [...cards.values()].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

const MAX_DAYS_AHEAD = 30; // decision 4

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Only the end is limited to today+30. The start can be any earlier date. A window is never backwards. */
export function clampWindow(w: DateWindow, today: Date): DateWindow {
  const max = ymd(addDays(today, MAX_DAYS_AHEAD));
  const start = w.start > max ? max : w.start;
  let end = w.end > max ? max : w.end;
  if (end < start) end = start;
  return { start, end };
}

/** The tags in these cards, sorted. Worked out before any tag is picked (decision 3). */
export function tagOptions(cards: EventCard[]): string[] {
  return [...new Set(cards.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b));
}

/** No tags means everything. Several tags match ANY of them (decision 2). */
export function filterByTags(cards: EventCard[], tags: string[]): EventCard[] {
  if (tags.length === 0) return cards;
  return cards.filter((c) => c.tags.some((t) => tags.includes(t)));
}
