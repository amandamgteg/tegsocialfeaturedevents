export type FeedEvent = { id: string; title: string; url: string; date: string; tags: string[]; starred: boolean };
export type EventCard = { id: string; title: string; url: string; date: string; tags: string[] };
export type ImageResult = { status: "resolved"; imageUrl: string } | { status: "failed"; reason: string };
export type DateWindow = { start: string; end: string }; // YYYY-MM-DD
