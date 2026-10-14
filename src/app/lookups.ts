import type { EventCard, ImageResult } from "@/lib/types";
import type { ImageStates } from "./CardList";
import { cacheResolvedImage, readCachedImage } from "./imageCache";
import { runLookups } from "./lookupRunner";

type Find = (card: EventCard) => Promise<ImageResult>;
type OnResult = (cardId: string, result: ImageResult) => void;

/** Look up cards, remembering each image that is found. A failed lookup is never remembered. */
function lookUp(cards: EventCard[], find: Find, onResult: OnResult): Promise<void> {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return runLookups(cards, find, (id, result) => {
    if (result.status === "resolved") cacheResolvedImage(byId.get(id)!.url, result.imageUrl);
    onResult(id, result);
  });
}

/** First load: cached cards are answered at once with no lookup; the rest are looked up. */
export function lookupCards(cards: EventCard[], find: Find, onResult: OnResult): Promise<void> {
  const uncached: EventCard[] = [];
  for (const card of cards) {
    const imageUrl = readCachedImage(card.url);
    if (imageUrl) onResult(card.id, { status: "resolved", imageUrl });
    else uncached.push(card);
  }
  return lookUp(uncached, find, onResult);
}

/** Retry: only cards whose lookup failed. Resolved and still-running cards are left alone. */
export function retryFailed(cards: EventCard[], images: ImageStates, find: Find, onResult: OnResult): Promise<void> {
  const failed = cards.filter((c) => {
    const state = images[c.id];
    return state !== undefined && state !== "loading" && state.status === "failed";
  });
  return lookUp(failed, find, onResult);
}
