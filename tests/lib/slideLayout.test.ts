import { describe, it, expect } from "vitest";
import { layoutInstagramSlide, LINK_LINE_Y } from "@/lib/slideLayout";

// Every character is half a font size wide, so the tests do not depend on a real font.
const measureText = (text: string, size: number) => text.length * size * 0.5;
const base = {
  imageUrl: "https://img.example.com/a.png",
  imageSize: { width: 800, height: 800 },
  dates: ["2026-10-19"],
  title: "Tech Pizza Monday",
  measureText,
};
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("layoutInstagramSlide", () => {
  it("makes a 1080 by 1920 slide that carries the image link", () => {
    const l = layoutInstagramSlide(base);
    expect([l.width, l.height]).toEqual([1080, 1920]);
    expect(l.image.url).toBe(base.imageUrl);
  });

  describe("top box", () => {
    it("sits where section 13 puts it, with the default wording on two lines", () => {
      const { topBox } = layoutInstagramSlide(base);
      expect(topBox).toMatchObject({ x: 76, y: 236, w: 928, h: 234, fontSize: 76 });
      expect(topBox.lines).toEqual(["Upcoming events from", "our calendar..."]);
    });
    it("wraps different wording to fit, and grows with more lines", () => {
      const { topBox } = layoutInstagramSlide({ ...base, topText: "Upcoming event from our most recent newsletter" });
      expect(topBox.lines.length).toBeGreaterThanOrEqual(2);
      expect(topBox.lines.join(" ")).toBe("Upcoming event from our most recent newsletter");
      expect(topBox.y).toBe(236);
    });
  });

  describe("event image", () => {
    it("fits a square inside the Instagram maximum, centred", () => {
      const { image } = layoutInstagramSlide(base);
      expect([image.w, image.h]).toEqual([880, 880]);
      expect(image.x).toBe((1080 - image.w) / 2);
    });
    it("keeps a landscape image's shape and stops at 960 wide", () => {
      const { image } = layoutInstagramSlide({ ...base, imageSize: { width: 1600, height: 800 } });
      expect([image.w, image.h]).toEqual([960, 480]);
    });
    it("keeps a portrait image's shape and stops at 880 tall", () => {
      const { image } = layoutInstagramSlide({ ...base, imageSize: { width: 800, height: 1000 } });
      expect([image.w, image.h]).toEqual([704, 880]);
    });
    it("makes a small image bigger rather than leaving it small", () => {
      const { image } = layoutInstagramSlide({ ...base, imageSize: { width: 200, height: 200 } });
      expect([image.w, image.h]).toEqual([880, 880]);
    });
    it("starts 50 px below the top box", () => {
      const { image, topBox } = layoutInstagramSlide(base);
      expect(image.y - (topBox.y + topBox.h)).toBe(50);
    });
  });

  describe("date-and-title box", () => {
    it("reads 'date - title' on one line for a short title, 50 px below the image", () => {
      const { caption, image } = layoutInstagramSlide(base);
      expect(caption.lines).toEqual(["Oct 19 - Tech Pizza Monday"]);
      expect(caption).toMatchObject({ x: 61, w: 958, fontSize: 44 });
      expect(caption.y - (image.y + image.h)).toBe(50);
    });
    it("keeps the gap above the image equal to the gap below it, for every image shape", () => {
      for (const imageSize of [{ width: 800, height: 800 }, { width: 1600, height: 800 }, { width: 800, height: 1000 }]) {
        const { topBox, image, caption } = layoutInstagramSlide({ ...base, imageSize });
        expect(image.y - (topBox.y + topBox.h)).toBe(caption.y - (image.y + image.h));
      }
    });
    it("uses the date formatting, including ranges", () => {
      const { caption } = layoutInstagramSlide({ ...base, dates: ["2026-11-07", "2026-11-08"] });
      expect(caption.lines[0]).toBe("Nov 7-8 - Tech Pizza Monday");
    });
    it("grows taller for a long title and never makes the text smaller", () => {
      const short = layoutInstagramSlide(base).caption;
      const long = layoutInstagramSlide({ ...base, title: words(25) }).caption;
      expect(long.lines.length).toBeGreaterThan(short.lines.length);
      expect(long.h).toBeGreaterThan(short.h);
      expect(long.fontSize).toBe(short.fontSize);
      expect(long.lines.join(" ")).toBe(`Oct 19 - ${words(25)}`);
    });
  });

  describe("link sticker line", () => {
    it("is not crossed by an ordinary slide", () => {
      expect(layoutInstagramSlide(base).overLinkLine).toBe(false);
    });
    it("is flagged when a very long title pushes the box past it", () => {
      const l = layoutInstagramSlide({ ...base, imageSize: { width: 800, height: 1000 }, title: words(40) });
      expect(l.caption.y + l.caption.h).toBeGreaterThan(LINK_LINE_Y);
      expect(l.overLinkLine).toBe(true);
    });
    it("sits at about y 1590", () => {
      expect(LINK_LINE_Y).toBe(1590);
    });
  });
});
