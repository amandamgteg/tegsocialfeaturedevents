export type FeedEvent = { id: string; title: string; url: string; date: string; tags: string[]; starred: boolean; recurring: boolean };
/** `date` is the first date shown, `dates` all dates shown. `key` tells cards apart for picking: url, plus the date for a repeating event. */
export type EventCard = { id: string; key: string; title: string; url: string; date: string; dates: string[]; tags: string[] };
export type ImageResult = { status: "resolved"; imageUrl: string } | { status: "failed"; reason: string };
export type DateWindow = { start: string; end: string }; // YYYY-MM-DD
