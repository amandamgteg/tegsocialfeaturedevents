// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFinished } from "@/lib/socialZip";
import { captureDownloads, readZip, bytes, type Saved } from "../helpers/download";
import type { SlideLayout } from "@/lib/slideLayout";

const render = vi.hoisted(() => vi.fn());
vi.mock("@/lib/slideDraw", () => ({ renderSlide: render }));

const slide = (platform: "Instagram" | "TikTok", date: string, title: string) => ({
  platform,
  date,
  title,
  layout: { image: { url: `https://img.example.com/${platform}-${title}.png` } } as unknown as SlideLayout,
});
let saved: Saved[];

beforeEach(() => {
  saved = captureDownloads();
  render.mockReset().mockImplementation(async (l: SlideLayout) => new Blob([bytes(l.image.url.length)], { type: "image/png" }));
});
afterEach(() => vi.restoreAllMocks());

describe("downloadFinished with TikTok slides", () => {
  it("names TikTok files with TikTok, a number and the date, numbering from 02 because the cover is 01", async () => {
    await downloadFinished([slide("TikTok", "2026-10-21", "Community Dinner"), slide("TikTok", "2026-10-07", "Tinker Tuesday"), slide("TikTok", "2026-10-10", "Eurovision")]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual([
      "TikTok_02_2026-10-07_tinker-tuesday.png",
      "TikTok_03_2026-10-10_eurovision.png",
      "TikTok_04_2026-10-21_community-dinner.png",
    ]);
  });

  it("puts both platforms in one ZIP, Instagram first, each in date order", async () => {
    await downloadFinished([
      slide("TikTok", "2026-10-21", "B"),
      slide("Instagram", "2026-10-21", "B"),
      slide("TikTok", "2026-10-07", "A"),
      slide("Instagram", "2026-10-07", "A"),
    ]);
    expect(saved).toHaveLength(1);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual([
      "Instagram_2026-10-07_a.png",
      "Instagram_2026-10-21_b.png",
      "TikTok_02_2026-10-07_a.png",
      "TikTok_03_2026-10-21_b.png",
    ]);
  });

  it("numbers by date even when a slide before it failed to draw", async () => {
    render.mockImplementation(async (l: SlideLayout) => {
      if (l.image.url.includes("-A.png")) throw new Error("boom");
      return new Blob([bytes(1)], { type: "image/png" });
    });
    await downloadFinished([slide("TikTok", "2026-10-07", "A"), slide("TikTok", "2026-10-08", "B")]).catch(() => undefined);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual(["TikTok_03_2026-10-08_b.png"]);
  });
});
