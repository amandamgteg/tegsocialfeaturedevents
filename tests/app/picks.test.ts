// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadPicks, savePicks, clearPicks, restorePicks, PICKS_KEY } from "@/app/picks";
import { cacheResolvedImage } from "@/app/imageCache";
import type { EventCard, FeedEvent } from "@/lib/types";

const feedEv = (n: number, over: Partial<FeedEvent> = {}): FeedEvent => ({
  id: `id${n}`,
  title: `Event ${n}`,
  url: `https://e.com/${n}`,
  date: "2026-10-20",
  tags: [],
  starred: true,
  recurring: false,
  ...over,
});
const winCard = (n: number): EventCard => ({ id: `id${n}`, title: `Event ${n}`, key: `https://e.com/${n}`, url: `https://e.com/${n}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const noCache = () => null;

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadPicks / savePicks / clearPicks", () => {
  it("round-trips selected event urls and pasted images, keyed by event url", () => {
    savePicks({ selected: ["https://e.com/1"], pasted: { "https://e.com/2": "https://img.example.com/2.jpg" } });
    expect(loadPicks()).toEqual({ selected: ["https://e.com/1"], pasted: { "https://e.com/2": "https://img.example.com/2.jpg" } });
  });
  it("stores nothing at all when there is nothing to remember", () => {
    savePicks({ selected: ["a"], pasted: {} });
    savePicks({ selected: [], pasted: {} });
    expect(localStorage.getItem(PICKS_KEY)).toBeNull();
  });
  it("gives nothing when nothing was saved", () => {
    expect(loadPicks()).toEqual({ selected: [], pasted: {} });
  });
  it.each(["not json", "null", "[]", '{"selected":"x"}', '{"selected":[1,2],"pasted":5}', '{"pasted":{"a":5}}'])("treats corrupt data %s as nothing, or keeps only the valid part", (raw) => {
    localStorage.setItem(PICKS_KEY, raw);
    const p = loadPicks();
    expect(p.selected.every((s) => typeof s === "string")).toBe(true);
    expect(Object.values(p.pasted).every((s) => typeof s === "string")).toBe(true);
    expect(p.selected).toEqual([]);
  });
  it("refuses to restore a pasted image that is not a web address", () => {
    localStorage.setItem(PICKS_KEY, JSON.stringify({ selected: [], pasted: { "https://e.com/1": "javascript:alert(1)" } }));
    expect(loadPicks().pasted).toEqual({});
  });
  it("clearPicks removes the picks but leaves the cache of found images alone", () => {
    cacheResolvedImage("https://e.com/1", "https://img.example.com/1.jpg");
    savePicks({ selected: ["https://e.com/1"], pasted: {} });
    clearPicks();
    expect(loadPicks()).toEqual({ selected: [], pasted: {} });
    expect(Object.keys(localStorage).some((k) => k.startsWith("teg:image:"))).toBe(true);
  });
  it("does not throw when storage is blocked", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadPicks()).toEqual({ selected: [], pasted: {} });
    expect(() => savePicks({ selected: ["a"], pasted: {} })).not.toThrow();
    expect(() => clearPicks()).not.toThrow();
  });
  it("does not throw when storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => savePicks({ selected: ["a"], pasted: {} })).not.toThrow();
  });
});

describe("restorePicks", () => {
  const stored = (selected: string[], pasted: Record<string, string> = {}) => ({ selected, pasted });

  it("keeps a selected event that is in the current window", () => {
    const r = restorePicks(stored(["https://e.com/1"]), [feedEv(1)], [winCard(1)], noCache);
    expect([...r.selected]).toEqual(["https://e.com/1"]);
  });
  it("drops a selected event that has left the feed", () => {
    const r = restorePicks(stored(["https://e.com/gone", "https://e.com/1"]), [feedEv(1)], [winCard(1)], noCache);
    expect([...r.selected]).toEqual(["https://e.com/1"]);
  });
  it("drops a pasted image for an event that has left the feed", () => {
    const r = restorePicks(stored([], { "https://e.com/gone": "https://img.example.com/x.jpg", "https://e.com/1": "https://img.example.com/1.jpg" }), [feedEv(1)], [], noCache);
    expect(r.pasted).toEqual({ "https://e.com/1": "https://img.example.com/1.jpg" });
  });
  it("drops an event that is no longer starred", () => {
    const r = restorePicks(stored(["https://e.com/1"]), [feedEv(1, { starred: false })], [winCard(1)], noCache);
    expect(r.selected.size).toBe(0);
  });
  it("keeps a selected event outside the current window when its image can still be found (decision 9)", () => {
    const cache = (url: string) => (url === "https://e.com/9" ? "https://img.example.com/9.jpg" : null);
    const r = restorePicks(stored(["https://e.com/9"]), [feedEv(9)], [], cache);
    expect([...r.selected]).toEqual(["https://e.com/9"]);
  });
  it("keeps a selected event outside the window when it has a pasted image", () => {
    const r = restorePicks(stored(["https://e.com/9"], { "https://e.com/9": "https://img.example.com/9.jpg" }), [feedEv(9)], [], noCache);
    expect([...r.selected]).toEqual(["https://e.com/9"]);
  });
  it("drops a selected event outside the window that has no image on hand, because it could not be downloaded", () => {
    const r = restorePicks(stored(["https://e.com/9"]), [feedEv(9)], [], noCache);
    expect(r.selected.size).toBe(0);
  });
  it("matches by url, so a multi-day event is found whichever day's card is showing", () => {
    const feed = [feedEv(1, { id: "day1" }), feedEv(1, { id: "day2", date: "2026-10-25" })];
    const r = restorePicks(stored(["https://e.com/1"]), feed, [{ ...winCard(1), id: "day2" }], noCache);
    expect(r.selected.size).toBe(1);
  });
});

describe("restorePicks with a repeating event", () => {
  const weekly = (date: string) => feedEv(1, { id: `w-${date}`, date, recurring: true });
  const key = (date: string) => `https://e.com/1#${date}`;
  it("keeps a picked date that is still in the feed and drops one that is not", () => {
    const feed = [weekly("2026-10-28")];
    const win = [{ ...winCard(1), key: key("2026-10-28") }];
    const { selected } = restorePicks({ selected: [key("2026-10-28"), key("2026-11-04")], pasted: {} }, feed, win, () => null);
    expect([...selected]).toEqual([key("2026-10-28")]);
  });
});
