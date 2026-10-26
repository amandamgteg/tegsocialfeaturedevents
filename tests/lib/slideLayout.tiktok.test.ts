import { describe, it, expect } from "vitest";
import { layoutTikTokEventSlide, type SlideEdits } from "@/lib/slideLayout";

const measureText = (text: string, size: number) => text.length * size * 0.5;
const base = {
  imageUrl: "https://img.example.com/a.png",
  imageSize: { width: 800, height: 800 },
  dates: ["2026-10-19"],
  title: "Tech Pizza Monday",
  measureText,
};
const lay = (edits?: SlideEdits, over: Partial<typeof base> = {}) => layoutTikTokEventSlide({ ...base, ...over }, edits);
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const stackCentre = (l: ReturnType<typeof lay>) => (l.image.y + l.caption.y + l.caption.h) / 2;

describe("layoutTikTokEventSlide", () => {
  it("makes a 1080 by 1920 slide with no top box, carrying the image link", () => {
    const l = lay();
    expect([l.width, l.height]).toEqual([1080, 1920]);
    expect(l.image.url).toBe(base.imageUrl);
    expect("topBox" in l).toBe(false);
  });

  describe("event image", () => {
    it("fills the 800 px column for a square", () => {
      const { image } = lay();
      expect([image.x, image.w, image.h]).toEqual([140, 800, 800]);
    });
    it("keeps a landscape image's shape and fits the column width", () => {
      const { image } = lay({}, { imageSize: { width: 1600, height: 800 } });
      expect([image.w, image.h]).toEqual([800, 400]);
    });
    it("keeps a portrait image's shape", () => {
      const { image } = lay({}, { imageSize: { width: 800, height: 1000 } });
      expect([image.w, image.h]).toEqual([800, 1000]);
    });
    it("stops a very tall image at 1100 px high, narrower than the column", () => {
      const { image } = lay({}, { imageSize: { width: 800, height: 2000 } });
      expect([image.w, image.h]).toEqual([440, 1100]);
    });
    it("makes a small image bigger rather than leaving it small", () => {
      expect(lay({}, { imageSize: { width: 200, height: 200 } }).image.w).toBe(800);
    });
    it("shows the whole picture by default", () => {
      expect(lay().image.source).toEqual({ x: 0, y: 0, w: 800, h: 800 });
    });
  });

  describe("date-and-title box", () => {
    it("reads 'date - title', sits across the column, and is 50 px below the image", () => {
      const { caption, image } = lay();
      expect(caption.lines).toEqual(["Oct 19 - Tech Pizza Monday"]);
      expect(caption).toMatchObject({ x: 140, w: 800, fontSize: 44 });
      expect(caption.y - (image.y + image.h)).toBe(50);
    });
    it("uses the date formatting, including ranges", () => {
      expect(lay({}, { dates: ["2026-11-07", "2026-11-08"] }).caption.lines[0]).toBe("Nov 7-8 - Tech Pizza Monday");
    });
    it("grows for a long title and never makes the text smaller", () => {
      const short = lay().caption;
      const long = lay({}, { title: words(25) }).caption;
      expect(long.lines.length).toBeGreaterThan(short.lines.length);
      expect(long.fontSize).toBe(short.fontSize);
    });
  });

  describe("placement", () => {
    it("keeps the image and the box inside the narrow column, clear of the icons", () => {
      for (const imageSize of [{ width: 800, height: 800 }, { width: 1600, height: 800 }, { width: 800, height: 2000 }]) {
        const { image, caption } = lay({}, { imageSize });
        expect(image.x).toBeGreaterThanOrEqual(140);
        expect(image.x + image.w).toBeLessThanOrEqual(940);
        expect(caption.x).toBeGreaterThanOrEqual(140);
        expect(caption.x + caption.w).toBeLessThanOrEqual(940);
      }
    });
    it("centres the image left to right", () => {
      const { image } = lay({}, { imageSize: { width: 800, height: 2000 } });
      expect(image.x).toBe((1080 - image.w) / 2);
    });
    it("centres the image and box together between y 150 and y 1600, whatever the image shape", () => {
      for (const imageSize of [{ width: 800, height: 800 }, { width: 1600, height: 800 }, { width: 800, height: 1000 }]) {
        expect(stackCentre(lay({}, { imageSize }))).toBeCloseTo(875, 5);
      }
    });
    it("stays centred when a long title makes the box taller", () => {
      expect(stackCentre(lay({}, { title: words(12) }))).toBeCloseTo(875, 5);
    });
    it("never starts higher than y 150, even for a huge stack", () => {
      expect(lay({}, { imageSize: { width: 800, height: 2000 }, title: words(120) }).image.y).toBe(150);
    });
    it("is not flagged when it sits in the usable area", () => {
      expect(lay().hiddenByTikTok).toBe(false);
    });
  });

  describe("dragging", () => {
    it("puts the image where it is dragged, and the box follows 50 px below", () => {
      const l = lay({ imagePos: { x: 100, y: 300 } });
      expect([l.image.x, l.image.y]).toEqual([100, 300]);
      expect(l.caption.y).toBe(300 + l.image.h + 50);
    });
    it("puts the box where it is dragged, and the image sits 50 px above it", () => {
      const l = lay({ captionPos: { x: 140, y: 1200 } });
      expect([l.caption.x, l.caption.y]).toEqual([140, 1200]);
      expect(l.image.y).toBe(1200 - 50 - l.image.h);
    });
    it("is flagged when something is dragged under the icons, too low, or too high", () => {
      expect(lay({ captionPos: { x: 300, y: 1100 } }).hiddenByTikTok).toBe(true); // runs under the icons on the right
      expect(lay({ captionPos: { x: 140, y: 1650 } }).hiddenByTikTok).toBe(true); // down in the description area
      expect(lay({ imagePos: { x: 140, y: 60 } }).hiddenByTikTok).toBe(true); // up under the top icons
    });
    it("stops being flagged when it is moved back", () => {
      expect(lay({ captionPos: { x: 140, y: 1000 } }).hiddenByTikTok).toBe(false);
    });
  });

  describe("size", () => {
    it("shrinks the frame with the size edit, keeping the 50 px gap and the centring", () => {
      const l = lay({ imageScale: 0.5 });
      expect([l.image.w, l.image.h]).toEqual([400, 400]);
      expect(l.caption.y - (l.image.y + l.image.h)).toBe(50);
      expect(stackCentre(l)).toBeCloseTo(875, 5);
    });
  });

  describe("Fill square", () => {
    it("makes the frame an 800 by 800 square for a landscape picture, showing its middle", () => {
      const l = lay({ square: true }, { imageSize: { width: 1600, height: 800 } });
      expect([l.image.w, l.image.h]).toEqual([800, 800]);
      expect(l.image.source).toEqual({ x: 400, y: 0, w: 800, h: 800 });
    });
    it("works for a portrait picture too", () => {
      const l = lay({ square: true }, { imageSize: { width: 800, height: 1000 } });
      expect([l.image.w, l.image.h]).toEqual([800, 800]);
      expect(l.image.source).toEqual({ x: 0, y: 100, w: 800, h: 800 });
    });
    it("lets her zoom in and choose which part shows, always filling the square", () => {
      const l = lay({ square: true, zoom: 2 }, { imageSize: { width: 1600, height: 800 } });
      expect(l.image.source).toEqual({ x: 600, y: 200, w: 400, h: 400 });
      const left = lay({ square: true, zoom: 2, focus: { x: 0, y: 0 } }, { imageSize: { width: 1600, height: 800 } });
      expect(left.image.source).toEqual({ x: 0, y: 0, w: 400, h: 400 });
      const far = lay({ square: true, zoom: 2, focus: { x: 9, y: 9 } }, { imageSize: { width: 1600, height: 800 } });
      expect(far.image.source).toEqual({ x: 1200, y: 400, w: 400, h: 400 });
    });
    it("keeps the crop the same shape as the frame", () => {
      const l = lay({ square: true, zoom: 1.7, focus: { x: 0.2, y: 0.9 } }, { imageSize: { width: 1234, height: 777 } });
      expect(l.image.source.w / l.image.source.h).toBeCloseTo(1, 3);
    });
    it("can be turned off again", () => {
      const l = lay({ square: false }, { imageSize: { width: 1600, height: 800 } });
      expect([l.image.w, l.image.h]).toEqual([800, 400]);
    });
  });
});
