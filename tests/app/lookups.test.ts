// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupCards, retryFailed } from "@/app/lookups";
import { readCachedImage, cacheResolvedImage } from "@/app/imageCache";
import type { EventCard, ImageResult } from "@/lib/types";
import type { ImageStates } from "@/app/CardList";

const card = (i: number, over: Partial<EventCard> = {}): EventCard => ({
  id: `e${i}`,
  title: `T${i}`,
  url: `https://events.example.com/${i}`,
  date: "2026-10-20",
  tags: [],
  ...over,
});
const cards = (n: number) => Array.from({ length: n }, (_, i) => card(i));
const ok = (id: string): ImageResult => ({ status: "resolved", imageUrl: `https://img.example.com/${id}.jpg` });
const bad: ImageResult = { status: "failed", reason: "nothing" };

beforeEach(() => {
  localStorage.clear();
});

describe("lookupCards (first load)", () => {
  it("makes no lookup for a card with a cached result, and reports the cached image", async () => {
    cacheResolvedImage("https://events.example.com/0", "https://img.example.com/cached.jpg");
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    const got: Record<string, ImageResult> = {};
    await lookupCards(cards(2), find, (id, r) => (got[id] = r));
    expect(find).toHaveBeenCalledTimes(1);
    expect(find.mock.calls[0][0].id).toBe("e1");
    expect(got.e0).toEqual({ status: "resolved", imageUrl: "https://img.example.com/cached.jpg" });
  });
  it("reports cached results before any lookup finishes", () => {
    cacheResolvedImage("https://events.example.com/0", "https://img.example.com/cached.jpg");
    const got: string[] = [];
    void lookupCards(cards(1), () => new Promise(() => {}), (id) => got.push(id));
    expect(got).toEqual(["e0"]); // synchronous: no lookup delay after a reload
  });
  it("finds a cache hit by event URL even when the card id is different", async () => {
    cacheResolvedImage("https://events.example.com/0", "https://img.example.com/cached.jpg");
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    await lookupCards([card(0, { id: "a-different-id" })], find, () => {});
    expect(find).not.toHaveBeenCalled();
  });
  it("stores resolved results, under the event URL", async () => {
    await lookupCards(cards(1), async (c) => ok(c.id), () => {});
    expect(readCachedImage("https://events.example.com/0")).toBe("https://img.example.com/e0.jpg");
  });
  it("never stores a failed result", async () => {
    await lookupCards(cards(1), async () => bad, () => {});
    expect(readCachedImage("https://events.example.com/0")).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it("never stores a lookup that threw", async () => {
    await lookupCards(cards(1), async () => {
      throw new Error("down");
    }, () => {});
    expect(localStorage.length).toBe(0);
  });
  it("still works, looking everything up, when storage throws", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    const got: Record<string, ImageResult> = {};
    await lookupCards(cards(3), find, (id, r) => (got[id] = r));
    expect(find).toHaveBeenCalledTimes(3);
    expect(Object.keys(got)).toHaveLength(3);
    vi.restoreAllMocks();
  });
});

describe("retryFailed", () => {
  const states = (): ImageStates => ({
    e0: ok("e0"),
    e1: bad,
    e2: "loading",
    e3: bad,
    e4: bad,
  });

  it("looks up only the failed cards, not resolved or in-flight ones", async () => {
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    await retryFailed(cards(5), states(), find, () => {});
    expect(find.mock.calls.map((c) => c[0].id).sort()).toEqual(["e1", "e3", "e4"]);
  });
  it("does not use the cache to skip a retry", async () => {
    // A failed card never has a cache entry, but a stale one must not block a retry either.
    cacheResolvedImage("https://events.example.com/1", "https://img.example.com/stale.jpg");
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    await retryFailed(cards(5), states(), find, () => {});
    expect(find.mock.calls.map((c) => c[0].id)).toContain("e1");
  });
  it("respects the 5-at-a-time limit", async () => {
    let inFlight = 0;
    let max = 0;
    const many = cards(14);
    const all: ImageStates = Object.fromEntries(many.map((c) => [c.id, bad]));
    await retryFailed(many, all, async (c) => {
      inFlight++;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return ok(c.id);
    }, () => {});
    expect(max).toBe(5);
  });
  it("gives a card that now succeeds its image, and caches it", async () => {
    const got: Record<string, ImageResult> = {};
    await retryFailed(cards(5), states(), async (c) => (c.id === "e1" ? ok(c.id) : bad), (id, r) => (got[id] = r));
    expect(got.e1).toEqual(ok("e1"));
    expect(readCachedImage("https://events.example.com/1")).toBe("https://img.example.com/e1.jpg");
  });
  it("leaves a card that fails again as failed", async () => {
    const got: Record<string, ImageResult> = {};
    await retryFailed(cards(5), states(), async () => bad, (id, r) => (got[id] = r));
    expect(got.e3).toEqual(bad);
    expect(localStorage.length).toBe(0);
  });
  it("does nothing when nothing has failed", async () => {
    const find = vi.fn(async (c: EventCard) => ok(c.id));
    await retryFailed(cards(2), { e0: ok("e0"), e1: "loading" }, find, () => {});
    expect(find).not.toHaveBeenCalled();
  });
});
