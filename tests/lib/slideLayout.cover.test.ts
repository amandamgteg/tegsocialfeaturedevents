import { describe, it, expect } from "vitest";
import { layoutTikTokCover, type CoverItem, type SlideEdits } from "@/lib/slideLayout";

const measureText = (text: string, size: number) => text.length * size * 0.5;
const SHAPES = [
  { width: 800, height: 800 },
  { width: 1600, height: 800 },
  { width: 800, height: 1000 },
  { width: 1000, height: 800 },
  { width: 800, height: 1400 },
  { width: 1200, height: 1200 },
];
const items = (n: number): CoverItem[] => SHAPES.slice(0, n).map((imageSize, i) => ({ key: `k${i + 1}`, imageUrl: `https://img.example.com/${i + 1}.png`, imageSize }));
const lay = (n: number, edits?: SlideEdits, topText?: string) => layoutTikTokCover({ items: items(n), measureText, topText }, edits);
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("layoutTikTokCover", () => {
  it("makes a 1080 by 1920 slide with the top box and one picture for each event, and no date or title box", () => {
    const l = lay(3);
    expect([l.width, l.height]).toEqual([1080, 1920]);
    expect(l.images.map((i) => i.key)).toEqual(["k1", "k2", "k3"]);
    expect(l.images.map((i) => i.url)).toEqual(items(3).map((i) => i.imageUrl));
    expect("caption" in l).toBe(false);
  });

  describe("top box", () => {
    it("sits where the Instagram one does, with the same wording", () => {
      const { topBox } = lay(3);
      expect(topBox).toMatchObject({ x: 76, y: 236, w: 928, h: 234, fontSize: 76 });
      expect(topBox.lines).toEqual(["Upcoming events from", "our calendar..."]);
    });
    it("takes new wording and a new position", () => {
      const l = lay(3, { topText: "This week", topPos: { x: 10, y: 100 } });
      expect(l.topBox.lines).toEqual(["This week"]);
      expect([l.topBox.x, l.topBox.y]).toEqual([10, 100]);
    });
    it("pushes the pictures down when a longer top box needs more room, and they still fit", () => {
      const l = lay(3, {}, words(10));
      const bottom = l.topBox.y + l.topBox.h;
      for (const i of l.images) {
        expect(i.y).toBeGreaterThanOrEqual(bottom + 50);
        expect(i.y + i.h).toBeLessThanOrEqual(1600);
      }
    });
  });

  describe("automatic arrangement", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      it(`keeps all ${n} picture${n > 1 ? "s" : ""} inside the narrow column, below the top box and above the description area`, () => {
        const l = lay(n);
        expect(l.images).toHaveLength(n);
        for (const i of l.images) {
          expect(i.x).toBeGreaterThanOrEqual(140);
          expect(i.x + i.w).toBeLessThanOrEqual(940);
          expect(i.y).toBeGreaterThanOrEqual(l.topBox.y + l.topBox.h + 50);
          expect(i.y + i.h).toBeLessThanOrEqual(1600);
        }
        expect(l.hiddenByTikTok).toBe(false);
      });
      it(`keeps each of ${n} picture${n > 1 ? "s" : ""} in its own shape`, () => {
        lay(n).images.forEach((i, idx) => {
          const s = SHAPES[idx];
          expect(i.w / i.h).toBeCloseTo(s.width / s.height, 1);
          expect(i.source).toEqual({ x: 0, y: 0, w: s.width, h: s.height });
        });
      });
    }
    it("makes a single picture big and centres it", () => {
      const [only] = lay(1).images;
      expect(only.w).toBeGreaterThan(400);
      expect(only.x).toBe((1080 - only.w) / 2);
    });
    it("overlaps pictures only a little by default", () => {
      for (const n of [2, 3, 4, 5, 6]) {
        const { images } = lay(n);
        for (let a = 0; a < images.length; a++)
          for (let b = a + 1; b < images.length; b++) {
            const small = Math.min(images[a].w * images[a].h, images[b].w * images[b].h);
            expect(overlap(images[a], images[b])).toBeLessThanOrEqual(small * 0.2);
          }
      }
    });
    it("staggers pictures left and right so they do not all line up", () => {
      const [a, b, c] = lay(3).images;
      expect(a.x + a.w / 2).toBeLessThan(b.x + b.w / 2);
      expect(c.x + c.w / 2).toBeLessThan(b.x + b.w / 2);
    });
  });

  describe("front to back order", () => {
    it("is the order the events were picked, last on top", () => {
      expect(lay(3).images.map((i) => i.key)).toEqual(["k1", "k2", "k3"]);
    });
    it("follows a saved order", () => {
      expect(lay(3, { order: ["k3", "k1", "k2"] }).images.map((i) => i.key)).toEqual(["k3", "k1", "k2"]);
    });
    it("puts pictures missing from the saved order at the end, and ignores unknown ones", () => {
      expect(lay(3, { order: ["k2", "zzz"] }).images.map((i) => i.key)).toEqual(["k2", "k1", "k3"]);
    });
    it("does not move any picture when only the order changes", () => {
      const plain = lay(3).images;
      const reordered = lay(3, { order: ["k3", "k2", "k1"] }).images;
      for (const p of plain) {
        const r = reordered.find((i) => i.key === p.key)!;
        expect([r.x, r.y, r.w, r.h]).toEqual([p.x, p.y, p.w, p.h]);
      }
    });
  });

  describe("edits to one picture", () => {
    it("puts it where it is dragged and leaves the others alone", () => {
      const plain = lay(3).images;
      const l = lay(3, { collage: { k2: { pos: { x: 200, y: 700 } } } });
      const two = l.images.find((i) => i.key === "k2")!;
      expect([two.x, two.y]).toEqual([200, 700]);
      for (const key of ["k1", "k3"]) {
        const a = plain.find((i) => i.key === key)!;
        const b = l.images.find((i) => i.key === key)!;
        expect([b.x, b.y, b.w, b.h]).toEqual([a.x, a.y, a.w, a.h]);
      }
    });
    it("changes its size, keeping its shape", () => {
      const plain = lay(3).images.find((i) => i.key === "k1")!;
      const half = lay(3, { collage: { k1: { scale: 0.5 } } }).images.find((i) => i.key === "k1")!;
      expect(half.w).toBe(Math.round(plain.w / 2));
      expect(half.w / half.h).toBeCloseTo(plain.w / plain.h, 1);
    });
    it("zooms and crops it, always filling its frame and never past the picture's edge", () => {
      const l = lay(3, { collage: { k1: { zoom: 2, focus: { x: 0, y: 0 } } } });
      const one = l.images.find((i) => i.key === "k1")!;
      expect(one.source).toEqual({ x: 0, y: 0, w: 400, h: 400 });
      const far = lay(3, { collage: { k1: { zoom: 2, focus: { x: 9, y: 9 } } } }).images.find((i) => i.key === "k1")!;
      expect(far.source).toEqual({ x: 400, y: 400, w: 400, h: 400 });
    });
    it("is flagged when a picture is dragged under TikTok's buttons or too low, and not when moved back", () => {
      expect(lay(3, { collage: { k1: { pos: { x: 700, y: 1200 } } } }).hiddenByTikTok).toBe(true);
      expect(lay(3, { collage: { k1: { pos: { x: 140, y: 1500 } } } }).hiddenByTikTok).toBe(true);
      expect(lay(3, { collage: { k1: { pos: { x: 140, y: 600 } } } }).hiddenByTikTok).toBe(false);
    });
  });
});
