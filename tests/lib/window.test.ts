import { describe, it, expect } from "vitest";
import { defaultWindow, buildCards } from "@/lib/window";
import type { FeedEvent } from "@/lib/types";

const ev = (over: Partial<FeedEvent> = {}): FeedEvent => ({
  id: "a-2026-10-20",
  title: "A",
  url: "https://example.com/a",
  date: "2026-10-20",
  tags: ["x"],
  starred: true,
  recurring: false,
  ...over,
});
const W = { start: "2026-10-14", end: "2026-10-28" };

describe("defaultWindow", () => {
  it("is today through today+14 inclusive", () => {
    expect(defaultWindow(new Date(2026, 9, 14))).toEqual({ start: "2026-10-14", end: "2026-10-28" });
  });
  it("crosses month and year boundaries", () => {
    expect(defaultWindow(new Date(2026, 11, 25))).toEqual({ start: "2026-12-25", end: "2027-01-08" });
  });
  it("uses the local date of the given Date, not UTC", () => {
    expect(defaultWindow(new Date(2026, 9, 14, 23, 30)).start).toBe("2026-10-14");
  });
});

describe("buildCards", () => {
  it("drops unstarred events", () => {
    expect(buildCards([ev({ starred: false })], W)).toEqual([]);
  });
  it("drops events outside the window", () => {
    const feed = [ev({ date: "2026-10-13" }), ev({ id: "b", url: "u2", date: "2026-10-29" })];
    expect(buildCards(feed, W)).toEqual([]);
  });
  it("includes both ends of the window", () => {
    const feed = [ev({ id: "s", url: "u1", date: "2026-10-14" }), ev({ id: "e", url: "u2", date: "2026-10-28" })];
    expect(buildCards(feed, W).map((c) => c.id)).toEqual(["s", "e"]);
  });
  it("shows a repeating event as one card per date, each with its own id and key", () => {
    const feed = [
      ev({ id: "w1", date: "2026-10-21", recurring: true }),
      ev({ id: "w2", date: "2026-10-28", recurring: true }),
      ev({ id: "w0", date: "2026-10-07", recurring: true }),
    ];
    expect(buildCards(feed, W)).toEqual([
      { id: "w1", key: "https://example.com/a#2026-10-21", title: "A", url: "https://example.com/a", date: "2026-10-21", dates: ["2026-10-21"], tags: ["x"] },
      { id: "w2", key: "https://example.com/a#2026-10-28", title: "A", url: "https://example.com/a", date: "2026-10-28", dates: ["2026-10-28"], tags: ["x"] },
    ]);
  });
  it("shows a non-repeating event with a shared link as one card listing every date in the window", () => {
    const feed = [
      ev({ id: "before", date: "2026-10-10" }),
      ev({ id: "day2", date: "2026-10-22", tags: ["z"] }),
      ev({ id: "day1", date: "2026-10-21", tags: ["y"] }),
    ];
    expect(buildCards(feed, W)).toEqual([
      { id: "day1", key: "https://example.com/a", title: "A", url: "https://example.com/a", date: "2026-10-21", dates: ["2026-10-21", "2026-10-22"], tags: ["y"] },
    ]);
  });
  it("lists only the dates inside the window for a non-repeating event", () => {
    const feed = [ev({ id: "in", date: "2026-10-28" }), ev({ id: "out", date: "2026-11-04" })];
    expect(buildCards(feed, W)[0].dates).toEqual(["2026-10-28"]);
  });
  it("keeps a repeating series and an unrelated one-off with the same link apart by the repeating flag", () => {
    const feed = [ev({ id: "a", date: "2026-10-20", recurring: true }), ev({ id: "b", date: "2026-10-21", recurring: true })];
    expect(buildCards(feed, W)).toHaveLength(2);
  });
  it("sorts soonest first", () => {
    const feed = [
      ev({ id: "late", url: "u1", date: "2026-10-25" }),
      ev({ id: "early", url: "u2", date: "2026-10-15" }),
      ev({ id: "mid", url: "u3", date: "2026-10-20" }),
    ];
    expect(buildCards(feed, W).map((c) => c.id)).toEqual(["early", "mid", "late"]);
  });
  it("does not use the feed's past marker", () => {
    // FeedEvent has no `past` field at all: a past-looking event in the window still shows.
    expect(buildCards([ev()], W)).toHaveLength(1);
  });
  it("returns [] for an empty window", () => {
    expect(buildCards([ev()], { start: "2027-01-01", end: "2027-01-02" })).toEqual([]);
    expect(buildCards([], W)).toEqual([]);
  });
});
