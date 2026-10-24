import { describe, it, expect } from "vitest";
import { layoutInstagramSlide, LINK_LINE_Y, type SlideEdits } from "@/lib/slideLayout";

const measureText = (text: string, size: number) => text.length * size * 0.5;
const base = {
  imageUrl: "https://img.example.com/a.png",
  imageSize: { width: 800, height: 800 },
  dates: ["2026-10-19"],
  title: "Tech Pizza Monday",
  measureText,
};
const lay = (edits?: SlideEdits, over: Partial<typeof base> = {}) => layoutInstagramSlide({ ...base, ...over }, edits);
const gaps = (l: ReturnType<typeof lay>) => [l.image.y - (l.topBox.y + l.topBox.h), l.caption.y - (l.image.y + l.image.h)];
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("layoutInstagramSlide with edits", () => {
  it("is unchanged when there are no edits or empty edits", () => {
    expect(lay({})).toEqual(lay());
  });

  describe("wording", () => {
    it("uses new top-box wording", () => {
      const l = lay({ topText: "Upcoming event from our most recent newsletter" });
      expect(l.topBox.lines.join(" ")).toBe("Upcoming event from our most recent newsletter");
    });
    it("uses new date-and-title wording instead of 'date - title'", () => {
      expect(lay({ captionText: "Oct 19: Tech Pizza Mondays!" }).caption.lines).toEqual(["Oct 19: Tech Pizza Mondays!"]);
    });
    it("makes the date-and-title box taller for longer wording, with the same text size", () => {
      const plain = lay().caption;
      const long = lay({ captionText: words(30) }).caption;
      expect(long.h).toBeGreaterThan(plain.h);
      expect(long.fontSize).toBe(plain.fontSize);
    });
    it("lets the image and box move down with a taller top box", () => {
      const plain = lay();
      const tall = lay({ topText: words(20) });
      expect(tall.topBox.h).toBeGreaterThan(plain.topBox.h);
      expect(tall.image.y).toBe(tall.topBox.y + tall.topBox.h + 50);
    });
  });

  describe("moving boxes", () => {
    it("puts the top box where it is dragged, and the image follows it with a 50 px gap", () => {
      const l = lay({ topPos: { x: 100, y: 120 } });
      expect([l.topBox.x, l.topBox.y]).toEqual([100, 120]);
      expect(l.image.y).toBe(120 + l.topBox.h + 50);
    });
    it("puts the date-and-title box where it is dragged", () => {
      const l = lay({ captionPos: { x: 90, y: 1500 } });
      expect([l.caption.x, l.caption.y]).toEqual([90, 1500]);
    });
    it("re-centres the image between the top box and a moved date-and-title box, so the two gaps are equal", () => {
      const l = lay({ captionPos: { x: 61, y: 1700 } });
      const [above, below] = gaps(l);
      expect(above).toBe(below);
      expect(above).toBeGreaterThan(50);
    });
    it("puts the image where it is dragged, and the date-and-title box follows 50 px below", () => {
      const l = lay({ imagePos: { x: 50, y: 600 } });
      expect([l.image.x, l.image.y]).toEqual([50, 600]);
      expect(l.caption.y).toBe(600 + l.image.h + 50);
    });
    it("keeps a dragged image exactly where it was put even when the box is also moved", () => {
      const l = lay({ imagePos: { x: 50, y: 600 }, captionPos: { x: 61, y: 1700 } });
      expect([l.image.x, l.image.y, l.caption.y]).toEqual([50, 600, 1700]);
    });
  });

  describe("image size", () => {
    it("shrinks the frame, keeps its shape, and the box follows with equal gaps", () => {
      const full = lay();
      const half = lay({ imageScale: 0.5 });
      expect([half.image.w, half.image.h]).toEqual([full.image.w / 2, full.image.h / 2]);
      expect(gaps(half)).toEqual([50, 50]);
    });
    it("grows the frame for a bigger scale, still with equal gaps", () => {
      const big = lay({ imageScale: 1.2 });
      expect(big.image.w).toBeGreaterThan(lay().image.w);
      expect(gaps(big)).toEqual([50, 50]);
    });
    it("stays centred left to right when resized", () => {
      const l = lay({ imageScale: 0.7 });
      expect(l.image.x).toBe((1080 - l.image.w) / 2);
    });
  });

  describe("zoom and crop", () => {
    it("shows the whole picture at zoom 1", () => {
      expect(lay().image.source).toEqual({ x: 0, y: 0, w: 800, h: 800 });
    });
    it("shows the middle part at zoom 2", () => {
      expect(lay({ zoom: 2 }).image.source).toEqual({ x: 200, y: 200, w: 400, h: 400 });
    });
    it("moves the crop with the focus point", () => {
      expect(lay({ zoom: 2, focus: { x: 0.4, y: 0.4 } }).image.source).toEqual({ x: 120, y: 120, w: 400, h: 400 });
    });
    it("never lets the crop go past the edge of the picture, so the frame is always full", () => {
      expect(lay({ zoom: 2, focus: { x: 0, y: 0 } }).image.source).toEqual({ x: 0, y: 0, w: 400, h: 400 });
      expect(lay({ zoom: 2, focus: { x: 1, y: 1 } }).image.source).toEqual({ x: 400, y: 400, w: 400, h: 400 });
      expect(lay({ zoom: 3, focus: { x: -5, y: 9 } }).image.source.x).toBe(0);
    });
    it("keeps zoom between 1 and 4", () => {
      expect(lay({ zoom: 0.4 }).image.source).toEqual({ x: 0, y: 0, w: 800, h: 800 });
      expect(lay({ zoom: 10 }).image.source.w).toBe(200);
    });
    it("keeps the crop the same shape as the frame, for a landscape picture too", () => {
      const l = lay({ zoom: 2.5, focus: { x: 0.3, y: 0.7 } }, { imageSize: { width: 1600, height: 800 } });
      expect(l.image.source.w / l.image.source.h).toBeCloseTo(l.image.w / l.image.h, 5);
    });
    it("does not move or resize the frame, so the gaps stay equal", () => {
      const l = lay({ zoom: 3, focus: { x: 0.2, y: 0.8 } });
      expect([l.image.w, l.image.h]).toEqual([lay().image.w, lay().image.h]);
      expect(gaps(l)).toEqual([50, 50]);
    });
  });

  describe("link sticker line", () => {
    it("warns when the date-and-title box is dragged into it, and stops warning when it is moved back", () => {
      expect(lay({ captionPos: { x: 61, y: LINK_LINE_Y - 20 } }).overLinkLine).toBe(true);
      expect(lay({ captionPos: { x: 61, y: 1000 } }).overLinkLine).toBe(false);
    });
  });
});
