// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadLayers } from "@/lib/socialZip";
import { PartialDownloadError } from "@/lib/download";
import { layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide, type DrawableLayout } from "@/lib/slideLayout";
import { captureDownloads, readZip, bytes, type Saved } from "../helpers/download";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), renderLayers: vi.fn(), renderPieces: vi.fn(), buildEditablePptx: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide, renderLayers: mocks.renderLayers, renderPieces: mocks.renderPieces }));
vi.mock("@/lib/slidePptx", () => ({ buildEditablePptx: mocks.buildEditablePptx }));

const measureText = (t: string, s: number) => t.length * s * 0.5;
const base = (title: string) => ({ imageUrl: `https://img.example.com/${title}.png`, imageSize: { width: 800, height: 800 }, dates: ["2026-10-07"], title, measureText });
const ig = (date: string, title: string) => ({ platform: "Instagram" as const, date, title, layout: layoutInstagramSlide(base(title)) });
const tt = (date: string, title: string) => ({ platform: "TikTok" as const, date, title, layout: layoutTikTokEventSlide(base(title)) });
const coverSlide = (date: string) => ({
  platform: "TikTok" as const,
  date,
  title: "Cover",
  isCover: true,
  layout: layoutTikTokCover({ items: [1, 2].map((n) => ({ key: `k${n}`, imageUrl: `https://img.example.com/${n}.png`, imageSize: { width: 800, height: 800 } })), measureText }),
});
let saved: Saved[];

beforeEach(() => {
  saved = captureDownloads();
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob([bytes(1)], { type: "image/png" }));
  mocks.renderPieces.mockReset().mockResolvedValue({ background: null, pictures: [] });
  mocks.buildEditablePptx.mockReset().mockImplementation(async () => new Blob([bytes(99)], { type: "application/octet-stream" }));
  mocks.renderLayers.mockReset().mockImplementation(async (layout: DrawableLayout) => {
    const count = "images" in layout ? layout.images.length + 2 : "topBox" in layout ? 4 : 3;
    return Array.from({ length: count }, (_, i) => new Blob([bytes(10 + i)], { type: "image/png" }));
  });
});
afterEach(() => vi.restoreAllMocks());

describe("downloadLayers", () => {
  it("saves one ZIP, with a folder for each slide holding the finished image, the editable file and the layers", async () => {
    await downloadLayers([ig("2026-10-07", "Tinker Tuesday")]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("teg-social-layers.zip");
    expect(Object.keys(await readZip(saved[0].blob))).toEqual([
      "Instagram_2026-10-07_tinker-tuesday/00_finished.png",
      "Instagram_2026-10-07_tinker-tuesday/00_editable.pptx",
      "Instagram_2026-10-07_tinker-tuesday/01_background.png",
      "Instagram_2026-10-07_tinker-tuesday/02_event-image.png",
      "Instagram_2026-10-07_tinker-tuesday/03_top-box.png",
      "Instagram_2026-10-07_tinker-tuesday/04_date-and-title-box.png",
    ]);
  });

  it("puts each layer's own picture in its file", async () => {
    await downloadLayers([ig("2026-10-07", "A")]);
    const files = await readZip(saved[0].blob);
    expect([...files["Instagram_2026-10-07_a/00_finished.png"]]).toEqual([...bytes(1)]);
    expect([...files["Instagram_2026-10-07_a/02_event-image.png"]]).toEqual([...bytes(11)]);
    expect([...files["Instagram_2026-10-07_a/04_date-and-title-box.png"]]).toEqual([...bytes(13)]);
  });

  it("names the TikTok folders like the finished files: the cover first as 01, event slides from 02", async () => {
    await downloadLayers([tt("2026-10-21", "Community Dinner"), coverSlide("2026-10-07"), tt("2026-10-07", "Tinker Tuesday")]);
    const folders = [...new Set(Object.keys(await readZip(saved[0].blob)).map((n) => n.split("/")[0]))];
    expect(folders).toEqual(["TikTok_01_cover", "TikTok_02_2026-10-07_tinker-tuesday", "TikTok_03_2026-10-21_community-dinner"]);
  });

  it("gives the cover one layer per picture, back to front, with the top box last", async () => {
    await downloadLayers([coverSlide("2026-10-07")]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual([
      "TikTok_01_cover/00_finished.png",
      "TikTok_01_cover/00_editable.pptx",
      "TikTok_01_cover/01_background.png",
      "TikTok_01_cover/02_picture-1.png",
      "TikTok_01_cover/03_picture-2.png",
      "TikTok_01_cover/04_top-box.png",
    ]);
  });

  it("puts Instagram first, then the TikTok cover, then the TikTok event slides", async () => {
    await downloadLayers([tt("2026-10-07", "A"), coverSlide("2026-10-07"), ig("2026-10-07", "A")]);
    const folders = [...new Set(Object.keys(await readZip(saved[0].blob)).map((n) => n.split("/")[0]))];
    expect(folders).toEqual(["Instagram_2026-10-07_a", "TikTok_01_cover", "TikTok_02_2026-10-07_a"]);
  });

  it("gives two slides with the same name different folders", async () => {
    await downloadLayers([ig("2026-10-07", "Same"), ig("2026-10-07", "Same")]);
    const folders = [...new Set(Object.keys(await readZip(saved[0].blob)).map((n) => n.split("/")[0]))];
    expect(folders).toEqual(["Instagram_2026-10-07_same", "Instagram_2026-10-07_same-2"]);
  });

  it("saves the slides that worked, then names the ones that failed", async () => {
    mocks.renderLayers.mockImplementation(async (layout: DrawableLayout) => {
      if ("image" in layout && layout.image.url.includes("Bad")) throw new Error("boom");
      return [new Blob([bytes(1)], { type: "image/png" }), new Blob([bytes(2)], { type: "image/png" }), new Blob([bytes(3)], { type: "image/png" }), new Blob([bytes(4)], { type: "image/png" })];
    });
    const err = await downloadLayers([ig("2026-10-07", "Good"), ig("2026-10-08", "Bad")]).catch((e) => e);
    expect(err).toBeInstanceOf(PartialDownloadError);
    expect((err as PartialDownloadError).failed).toEqual(["Bad"]);
    const folders = [...new Set(Object.keys(await readZip(saved[0].blob)).map((n) => n.split("/")[0]))];
    expect(folders).toEqual(["Instagram_2026-10-07_good"]);
  });

  it("saves nothing for an empty list", async () => {
    await downloadLayers([]);
    expect(saved).toHaveLength(0);
  });
});

describe("downloadLayers with the editable file", () => {
  it("puts an editable PowerPoint file in each slide's folder, made from that slide's layout and pieces", async () => {
    const pieces = { background: new Blob(["bg"]), pictures: [new Blob(["pic"])] };
    mocks.renderPieces.mockResolvedValue(pieces);
    const slide = ig("2026-10-07", "Tinker Tuesday");
    await downloadLayers([slide]);
    expect(mocks.buildEditablePptx).toHaveBeenCalledWith(slide.layout, pieces);
    const files = await readZip(saved[0].blob);
    expect([...files["Instagram_2026-10-07_tinker-tuesday/00_editable.pptx"]]).toEqual([...bytes(99)]);
  });

  it("names the slide as failed if its editable file cannot be made, and still saves the others", async () => {
    mocks.buildEditablePptx.mockImplementation(async (layout: DrawableLayout) => {
      if ("image" in layout && layout.image.url.includes("Bad")) throw new Error("boom");
      return new Blob([bytes(99)]);
    });
    const err = await downloadLayers([ig("2026-10-07", "Good"), ig("2026-10-08", "Bad")]).catch((e) => e);
    expect(err).toBeInstanceOf(PartialDownloadError);
    expect((err as PartialDownloadError).failed).toEqual(["Bad"]);
    const folders = [...new Set(Object.keys(await readZip(saved[0].blob)).map((n) => n.split("/")[0]))];
    expect(folders).toEqual(["Instagram_2026-10-07_good"]);
  });
});
