import type { EventCard, ImageResult } from "@/lib/types";

export const LOOKUPS_AT_A_TIME = 5; // decision 22

/** Looks up every card, a few at a time, reporting each result as soon as it arrives. */
export async function runLookups(
  cards: EventCard[],
  find: (card: EventCard) => Promise<ImageResult>,
  onResult: (cardId: string, result: ImageResult) => void,
  limit: number = LOOKUPS_AT_A_TIME,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < cards.length) {
      const card = cards[next++];
      let result: ImageResult;
      try {
        result = await find(card);
      } catch (err) {
        result = { status: "failed", reason: (err as Error).message || "lookup failed" };
      }
      onResult(card.id, result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, cards.length) }, worker));
}
