// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { loadEdits, saveEdits, SLIDE_EDITS_KEY } from "@/lib/slideEdits";
import type { SlideEdits } from "@/lib/slideLayout";

beforeEach(() => localStorage.clear());

describe("saved cover edits", () => {
  const cover: SlideEdits = {
    topText: "This week",
    topPos: { x: 10, y: 20 },
    order: ["k3", "k1", "k2"],
    collage: { k1: { pos: { x: 200, y: 700 }, scale: 0.8, zoom: 2, focus: { x: 0.3, y: 0.6 } }, k2: { scale: 1.1 } },
  };

  it("keeps the order and each picture's edits", () => {
    saveEdits("tiktok|cover", cover, "2026-11-08");
    expect(loadEdits("tiktok|cover")).toEqual(cover);
  });

  it("drops pictures with no edits left, and leaves nothing for an empty collage", () => {
    saveEdits("tiktok|cover", { collage: { k1: {}, k2: { zoom: 2 } } }, "2026-11-08");
    expect(loadEdits("tiktok|cover")).toEqual({ collage: { k2: { zoom: 2 } } });
    saveEdits("tiktok|cover", { collage: { k1: {} }, order: [] }, "2026-11-08");
    expect(loadEdits("tiktok|cover")).toEqual({});
    expect(localStorage.getItem(SLIDE_EDITS_KEY)).toBeNull();
  });

  it("ignores damaged cover data", () => {
    localStorage.setItem(
      SLIDE_EDITS_KEY,
      JSON.stringify({ "tiktok|cover": { lastDate: "2026-11-08", edits: { order: ["k1", 5, null], collage: { k1: { zoom: "big", scale: 0.9 }, k2: "nope", k3: { pos: { x: 1 } } } } } }),
    );
    expect(loadEdits("tiktok|cover")).toEqual({ order: ["k1"], collage: { k1: { scale: 0.9 } } });
  });
});
