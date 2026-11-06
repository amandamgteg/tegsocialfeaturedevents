// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { layoutInstagramSlide, layoutTikTokEventSlide, IMAGE_RATIOS, type SlideEdits } from "@/lib/slideLayout";
import { loadEdits, saveEdits } from "@/lib/slideEdits";

const measureText = (text: string, size: number) => text.length * size * 0.5;
const base = { imageUrl: "u", imageSize: { width: 1600, height: 800 }, dates: ["2026-10-19"], title: "T", measureText };
const ig = (edits: SlideEdits) => layoutInstagramSlide(base, edits).image;
const tt = (edits: SlideEdits) => layoutTikTokEventSlide(base, edits).image;

describe("image ratio", () => {
  it("offers 1:1, 4:5, 16:9 and 9:16 (Original is the absence of a ratio)", () => {
    expect(IMAGE_RATIOS).toEqual(["1:1", "4:5", "16:9", "9:16"]);
  });

  describe("Instagram", () => {
    it("keeps the picture's own shape without a ratio", () => {
      expect([ig({}).w, ig({}).h]).toEqual([960, 480]);
    });
    it.each([
      ["1:1", 880, 880],
      ["4:5", 704, 880],
      ["16:9", 960, 540],
      ["9:16", 495, 880],
    ])("%s makes a frame of that shape, as big as the Instagram maximum allows", (ratio, w, h) => {
      const i = ig({ ratio });
      expect([i.w, i.h]).toEqual([w, h]);
    });
    it("crops the picture to fill the frame, never stretching it", () => {
      const i = ig({ ratio: "4:5" });
      expect(i.source.w / i.source.h).toBeCloseTo(4 / 5, 2);
      expect(i.source.h).toBe(800);
      expect(i.source.x).toBeCloseTo(480, 0); // the middle of a 1600 wide picture, 640 wide crop
    });
    it("lets her zoom and choose the part shown inside the new frame", () => {
      const i = ig({ ratio: "1:1", zoom: 2, focus: { x: 0, y: 0 } });
      expect(i.source).toMatchObject({ x: 0, y: 0, w: 400, h: 400 });
    });
    it("ignores an unknown ratio", () => {
      expect([ig({ ratio: "7:3" }).w, ig({ ratio: "7:3" }).h]).toEqual([960, 480]);
    });
  });

  describe("TikTok", () => {
    it("1:1 is the same 800 by 800 square as 'Fill square'", () => {
      expect([tt({ ratio: "1:1" }).w, tt({ ratio: "1:1" }).h]).toEqual([800, 800]);
    });
    it.each([
      ["4:5", 800, 1000],
      ["16:9", 800, 450],
      ["9:16", 619, 1100],
    ])("%s fits the 800 px column and 1100 px height", (ratio, w, h) => {
      const i = tt({ ratio });
      expect([i.w, i.h]).toEqual([w, h]);
    });
    it("a ratio wins over the older square flag", () => {
      expect([tt({ square: true, ratio: "16:9" }).w, tt({ square: true, ratio: "16:9" }).h]).toEqual([800, 450]);
    });
  });

  describe("saved edits", () => {
    it("remembers a ratio and drops an unknown one", () => {
      saveEdits("k", { ratio: "4:5" }, "2099-01-01");
      expect(loadEdits("k").ratio).toBe("4:5");
      saveEdits("k", { ratio: "nope" }, "2099-01-01");
      expect(loadEdits("k")).toEqual({});
    });
  });
});
