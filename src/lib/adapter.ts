import { extractImagesAndHandles } from "./extractor/extractor";
import { assertSafeUrl } from "./safeUrl";
import type { EventCard, ImageResult } from "./types";

const failed = (reason: string): ImageResult => ({ status: "failed", reason });

/** Runs the Task 1 extractor for one card (decisions 22 and 26, SPEC section 10). Never rejects. */
export async function findImageForCard(card: EventCard): Promise<ImageResult> {
  try {
    // The card comes from the browser, so the event page address is checked before it is fetched.
    await assertSafeUrl(card.url);
    const [result] = await extractImagesAndHandles([
      {
        id: card.id,
        title: card.title,
        eventUrl: card.url,
        eventUrlType: "external",
        sourceUrl: card.url,
        mishaHosted: false,
      },
    ]);
    if (!result) return failed("the image finder returned nothing");
    if (result.status === "resolved" && result.imageUrl) return { status: "resolved", imageUrl: result.imageUrl };
    return failed(result.failureReason || "no image found");
  } catch (err) {
    return failed((err as Error).message || "image lookup failed");
  }
}
