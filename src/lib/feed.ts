import type { FeedEvent } from "./types";

const FEED_URL = "https://toronto-event-generator.pages.dev/events.json";

const malformed = (why: string) => new Error(`TEG feed is malformed: ${why}`);

export async function fetchFeed(): Promise<FeedEvent[]> {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`TEG feed request failed with status ${res.status}`);
  let body: unknown;
  try {
    body = JSON.parse(await res.text());
  } catch {
    throw malformed("response is not valid JSON");
  }
  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) throw malformed("no events list");
  return events.map((raw, i) => {
    const e = raw as Record<string, unknown>;
    for (const k of ["id", "title", "url", "date"]) {
      if (typeof e?.[k] !== "string") throw malformed(`event ${i} is missing "${k}"`);
    }
    return {
      id: e.id as string,
      title: e.title as string,
      url: e.url as string,
      date: e.date as string,
      tags: Array.isArray(e.tags) ? (e.tags as string[]) : [],
      starred: e["misha-star"] === true,
    };
  });
}
