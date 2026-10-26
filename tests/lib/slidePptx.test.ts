// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { unzipSync } from "fflate";
import { buildEditablePptx } from "@/lib/slidePptx";
import { layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide, type DrawableLayout } from "@/lib/slideLayout";
import { readBlob } from "../helpers/download";

const measureText = (t: string, s: number) => t.length * s * 0.5;
const input = { imageUrl: "https://img.example.com/a.png", imageSize: { width: 800, height: 800 }, dates: ["2026-10-19"], title: "Tech Pizza Monday", measureText };
const cover = layoutTikTokCover({ items: [1, 2, 3].map((n) => ({ key: `k${n}`, imageUrl: `https://img.example.com/${n}.png`, imageSize: { width: 800, height: 800 } })), measureText });
const png = () => new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])], { type: "image/png" });
const pieces = (n: number, background = true) => ({ background: background ? png() : null, pictures: Array.from({ length: n }, png) });
const EMU = 9525; // one slide pixel, at 96 to the inch
const px = (n: number) => String(Math.round(n * EMU));
/** True when the xml has a shape or picture at this place and size (a gap may sit between its position and size). */
const hasBox = (xml: string, b: { x: number; y: number; w: number; h: number }) => new RegExp(`<a:off x="${px(b.x)}" y="${px(b.y)}"/>\\s*<a:ext cx="${px(b.w)}" cy="${px(b.h)}"/>`).test(xml);

async function open(layout: DrawableLayout, p: ReturnType<typeof pieces>) {
  const files = unzipSync(await readBlob(await buildEditablePptx(layout, p)));
  const text = (name: string) => new TextDecoder().decode(files[name]);
  return { files, slide: text("ppt/slides/slide1.xml"), presentation: text("ppt/presentation.xml"), media: Object.keys(files).filter((k) => /^ppt\/media\/.+\.(png|jpg|jpeg)$/i.test(k)) };
}
const texts = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);

describe("buildEditablePptx", () => {
  it("makes a PowerPoint file as big as the slide, 1080 by 1920 pixels", async () => {
    const { presentation } = await open(layoutInstagramSlide(input), pieces(1));
    expect(presentation).toContain(`<p:sldSz cx="${1080 * EMU}" cy="${1920 * EMU}"`);
  });

  describe("an Instagram slide", () => {
    const layout = layoutInstagramSlide(input);
    it("has the top box and the date-and-title box as live text, in Arial bold white", async () => {
      const { slide } = await open(layout, pieces(1));
      expect(texts(slide)).toEqual([layout.topBox.lines.join(" "), layout.caption.lines.join(" ")]);
      expect(slide).toContain('typeface="Arial"');
      expect(slide).toContain('b="1"');
      expect(slide).toContain('<a:srgbClr val="FFFFFF"/>');
    });
    it("sets the text size from the slide's sizes: 76 px and 44 px, which is 57 and 33 points", async () => {
      const { slide } = await open(layout, pieces(1));
      expect(slide).toContain('sz="5700"');
      expect(slide).toContain('sz="3300"');
    });
    it("puts each box where the slide has it, filled black, so the black box stays with the text", async () => {
      const { slide } = await open(layout, pieces(1));
      for (const b of [layout.topBox, layout.caption]) expect(hasBox(slide, b)).toBe(true);
      expect((slide.match(/<a:solidFill><a:srgbClr val="000000"\/><\/a:solidFill><a:ln>/g) ?? []).length).toBe(2);
    });
    it("keeps the same space inside each box as the slide has: 30 px each side", async () => {
      const { slide } = await open(layout, pieces(1));
      expect(slide).toContain(`lIns="${30 * 0.75 * 12700}"`);
      expect(slide).toContain(`rIns="${30 * 0.75 * 12700}"`);
    });
    it("places the picture as a picture, cut to its frame, and the background behind it", async () => {
      const { slide, media } = await open(layout, pieces(1));
      expect((slide.match(/<p:pic>/g) ?? []).length).toBe(2); // the background, then the picture
      expect(media).toHaveLength(2);
      expect(hasBox(slide, layout.image)).toBe(true);
      expect(hasBox(slide, { x: 0, y: 0, w: 1080, h: 1920 })).toBe(true);
    });
    it("lists the background first and the text last, so the stacking order matches the slide", async () => {
      const { slide } = await open(layout, pieces(1));
      const at = (b: { x: number; y: number; w: number; h: number }) => slide.search(new RegExp(`<a:off x="${px(b.x)}" y="${px(b.y)}"/>\\s*<a:ext cx="${px(b.w)}" cy="${px(b.h)}"/>`));
      const bg = at({ x: 0, y: 0, w: 1080, h: 1920 });
      const pic = at(layout.image);
      const top = slide.indexOf("<a:t>");
      expect(bg).toBeGreaterThan(-1);
      expect(bg).toBeLessThan(pic);
      expect(pic).toBeLessThan(top);
    });
  });

  describe("a TikTok event slide", () => {
    const layout = layoutTikTokEventSlide(input);
    it("has only the date-and-title box as text, over a plain black slide", async () => {
      const { slide, media } = await open(layout, pieces(1, false));
      expect(texts(slide)).toEqual([layout.caption.lines.join(" ")]);
      expect(slide).toContain('<p:bg><p:bgPr><a:solidFill><a:srgbClr val="000000"/>');
      expect(media).toHaveLength(1); // the picture only
    });
  });

  describe("the TikTok cover", () => {
    it("has the top box as live text, one picture per event, and no date or title box", async () => {
      const { slide, media } = await open(cover, pieces(3));
      expect(texts(slide)).toEqual([cover.topBox.lines.join(" ")]);
      expect((slide.match(/<p:pic>/g) ?? []).length).toBe(4); // the background and three pictures
      expect(media).toHaveLength(4);
    });
    it("places each picture where the cover has it", async () => {
      const { slide } = await open(cover, pieces(3));
      for (const i of cover.images) expect(hasBox(slide, i)).toBe(true);
    });
  });

  it("keeps edited wording, so the file carries what is on the finished image", async () => {
    const layout = layoutInstagramSlide(input, { topText: "This week in Toronto", captionText: "Oct 19: Mondays" });
    const { slide } = await open(layout, pieces(1));
    expect(texts(slide)).toEqual(["This week in Toronto", "Oct 19: Mondays"]);
  });

  it("turns special characters in the wording into safe text", async () => {
    const layout = layoutInstagramSlide(input, { captionText: "Rock & Roll <Night> \"Live\"" });
    const { slide } = await open(layout, pieces(1));
    expect(texts(slide).at(-1)).toBe("Rock &amp; Roll &lt;Night&gt; &quot;Live&quot;");
  });
});
