import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("@/lib/extractor/extractor", () => ({ extractImagesAndHandles: vi.fn() }));
import { lookup } from "node:dns/promises";
import { extractImagesAndHandles } from "@/lib/extractor/extractor";
import { findImageForCard } from "@/lib/adapter";
import type { EventCard } from "@/lib/types";

const extract = vi.mocked(extractImagesAndHandles);
const card: EventCard = { id: "tinker-2026-10-20", title: "Tinker Tuesday", url: "https://example.com/tinker", date: "2026-10-20", tags: ["making"] };

beforeEach(() => {
  (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => vi.clearAllMocks());

describe("findImageForCard", () => {
  it("maps a card to the seven fields exactly as SPEC section 10 says", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "resolved", imageUrl: "https://img.example.com/a.jpg" }]);
    await findImageForCard(card);
    expect(extract).toHaveBeenCalledWith([
      {
        id: card.id,
        title: card.title,
        eventUrl: card.url,
        eventUrlType: "external",
        sourceUrl: card.url,
        mishaHosted: false,
      },
    ]);
    const sent = extract.mock.calls[0][0][0];
    expect(sent.embeddedImageUrl).toBeUndefined();
  });
  it("sends a one-item list", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "failed", failureReason: "x" }]);
    await findImageForCard(card);
    expect(extract.mock.calls[0][0]).toHaveLength(1);
  });
  it("returns resolved with the imageUrl", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "resolved", imageUrl: "https://img.example.com/a.jpg", instagramHandle: "x" }]);
    expect(await findImageForCard(card)).toEqual({ status: "resolved", imageUrl: "https://img.example.com/a.jpg" });
  });
  it("returns failed with the reason, and drops the instagram handle", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "failed", failureReason: "no usable image found on page", instagramHandle: "x" }]);
    expect(await findImageForCard(card)).toEqual({ status: "failed", reason: "no usable image found on page" });
  });
  it("gives a default reason when the extractor gives none", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "failed" }]);
    const r = await findImageForCard(card);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.reason.length).toBeGreaterThan(0);
  });
  it("treats 'resolved' without an imageUrl as failed", async () => {
    extract.mockResolvedValue([{ eventId: card.id, status: "resolved" }]);
    expect((await findImageForCard(card)).status).toBe("failed");
  });
  it("turns a thrown error into failed, never a rejection", async () => {
    extract.mockRejectedValue(new Error("boom"));
    expect(await findImageForCard(card)).toEqual({ status: "failed", reason: "boom" });
  });
  it("turns an empty result list into failed", async () => {
    extract.mockResolvedValue([]);
    expect((await findImageForCard(card)).status).toBe("failed");
  });
  it("refuses an unsafe event url without running the extractor", async () => {
    const r = await findImageForCard({ ...card, url: "http://127.0.0.1:8080/admin" });
    expect(r.status).toBe("failed");
    expect(extract).not.toHaveBeenCalled();
  });
});
