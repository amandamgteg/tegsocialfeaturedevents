// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadEdits, saveEdits, resetSlide, resetAll, pruneExpired, SLIDE_EDITS_KEY } from "@/lib/slideEdits";
import type { SlideEdits } from "@/lib/slideLayout";

const full: SlideEdits = {
  topText: "Upcoming event from our most recent newsletter",
  captionText: "Oct 7: Edited",
  topPos: { x: 10, y: 20 },
  captionPos: { x: 30, y: 1500 },
  imagePos: { x: 50, y: 600 },
  imageScale: 0.8,
  zoom: 2.5,
  focus: { x: 0.3, y: 0.7 },
};
const today = (iso: string) => new Date(`${iso}T09:00:00`);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("saved edits", () => {
  it("has no edits for a slide that was never edited", () => {
    expect(loadEdits("https://events.example.com/a")).toEqual({});
  });

  it("gives back what was saved, for every kind of edit", () => {
    saveEdits("https://events.example.com/a", full, "2026-10-07");
    expect(loadEdits("https://events.example.com/a")).toEqual(full);
  });

  it("keeps each slide's edits apart, including each date of a repeating event", () => {
    saveEdits("https://events.example.com/a#2026-10-07", { topText: "one" }, "2026-10-07");
    saveEdits("https://events.example.com/a#2026-10-14", { topText: "two" }, "2026-10-14");
    expect(loadEdits("https://events.example.com/a#2026-10-07")).toEqual({ topText: "one" });
    expect(loadEdits("https://events.example.com/a#2026-10-14")).toEqual({ topText: "two" });
  });

  it("replaces the old edits when a slide is saved again", () => {
    saveEdits("k", { topText: "one", zoom: 2 }, "2026-10-07");
    saveEdits("k", { topText: "two" }, "2026-10-07");
    expect(loadEdits("k")).toEqual({ topText: "two" });
  });

  it("stores nothing for a slide with no edits left, and nothing at all once the last is gone", () => {
    saveEdits("k", { topText: "one" }, "2026-10-07");
    saveEdits("k", {}, "2026-10-07");
    expect(loadEdits("k")).toEqual({});
    expect(localStorage.getItem(SLIDE_EDITS_KEY)).toBeNull();
  });

  it("treats a field set to undefined (such as a cleared image position) as not edited", () => {
    saveEdits("k", { topText: "one", imagePos: undefined }, "2026-10-07");
    expect(loadEdits("k")).toEqual({ topText: "one" });
  });

  describe("reset", () => {
    it("resetSlide forgets one slide and leaves the others", () => {
      saveEdits("a", { topText: "one" }, "2026-10-07");
      saveEdits("b", { topText: "two" }, "2026-10-07");
      resetSlide("a");
      expect(loadEdits("a")).toEqual({});
      expect(loadEdits("b")).toEqual({ topText: "two" });
    });
    it("resetAll forgets every slide", () => {
      saveEdits("a", { topText: "one" }, "2026-10-07");
      saveEdits("b", { topText: "two" }, "2026-10-07");
      resetAll();
      expect(loadEdits("a")).toEqual({});
      expect(loadEdits("b")).toEqual({});
      expect(localStorage.getItem(SLIDE_EDITS_KEY)).toBeNull();
    });
    it("do nothing and do not fail when there is nothing saved", () => {
      expect(() => (resetSlide("zzz"), resetAll())).not.toThrow();
    });
  });

  describe("expiry", () => {
    it("drops edits for events whose date has passed, and keeps today's and later ones", () => {
      saveEdits("past", { topText: "p" }, "2026-10-06");
      saveEdits("today", { topText: "t" }, "2026-10-07");
      saveEdits("later", { topText: "l" }, "2026-10-20");
      pruneExpired(today("2026-10-07"));
      expect(loadEdits("past")).toEqual({});
      expect(loadEdits("today")).toEqual({ topText: "t" });
      expect(loadEdits("later")).toEqual({ topText: "l" });
    });
    it("keeps a multi-day event until its last day has passed", () => {
      saveEdits("festival", { topText: "f" }, "2026-11-08"); // the last date
      pruneExpired(today("2026-11-08"));
      expect(loadEdits("festival")).toEqual({ topText: "f" });
      pruneExpired(today("2026-11-09"));
      expect(loadEdits("festival")).toEqual({});
    });
    it("leaves nothing stored once everything has expired", () => {
      saveEdits("past", { topText: "p" }, "2026-10-06");
      pruneExpired(today("2026-10-07"));
      expect(localStorage.getItem(SLIDE_EDITS_KEY)).toBeNull();
    });
  });

  describe("when the saved data is damaged or storage is blocked", () => {
    it("loads nothing from corrupt data, and does not fail", () => {
      localStorage.setItem(SLIDE_EDITS_KEY, "{not json");
      expect(loadEdits("k")).toEqual({});
      expect(() => pruneExpired(today("2026-10-07"))).not.toThrow();
    });
    it("ignores fields of the wrong type or shape, and anything unknown", () => {
      localStorage.setItem(
        SLIDE_EDITS_KEY,
        JSON.stringify({ k: { lastDate: "2026-10-20", edits: { topText: 5, zoom: "big", focus: { x: "a" }, topPos: [1, 2], imageScale: 0.9, surprise: true } } }),
      );
      expect(loadEdits("k")).toEqual({ imageScale: 0.9 });
    });
    it("never throws when storage is blocked, and loads nothing", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      expect(loadEdits("k")).toEqual({});
      expect(() => saveEdits("k", { topText: "x" }, "2026-10-07")).not.toThrow();
      expect(() => (resetSlide("k"), resetAll(), pruneExpired(today("2026-10-07")))).not.toThrow();
    });
  });
});
