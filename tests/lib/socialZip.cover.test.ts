// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFinished } from "@/lib/socialZip";
import { captureDownloads, readZip, bytes, type Saved } from "../helpers/download";
import type { DrawableLayout } from "@/lib/slideLayout";

const render = vi.hoisted(() => vi.fn());
vi.mock("@/lib/slideDraw", () => ({ renderSlide: render }));

const layout = (n: number) => ({ n }) as unknown as DrawableLayout;
const slide = (platform: "Instagram" | "TikTok", date: string, title: string, isCover = false) => ({ platform, date, title, layout: layout(title.length), isCover });
let saved: Saved[];

beforeEach(() => {
  saved = captureDownloads();
  render.mockReset().mockImplementation(async (l: { n: number }) => new Blob([bytes(l.n)], { type: "image/png" }));
});
afterEach(() => vi.restoreAllMocks());

describe("downloadFinished with the TikTok cover", () => {
  it("names the cover TikTok_01_cover and numbers the event slides from 02", async () => {
    await downloadFinished([slide("TikTok", "2026-10-21", "Community Dinner"), slide("TikTok", "2026-10-07", "Cover", true), slide("TikTok", "2026-10-07", "Tinker Tuesday")]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual([
      "TikTok_01_cover.png",
      "TikTok_02_2026-10-07_tinker-tuesday.png",
      "TikTok_03_2026-10-21_community-dinner.png",
    ]);
  });

  it("puts Instagram first, then the TikTok cover, then the TikTok event slides", async () => {
    await downloadFinished([slide("TikTok", "2026-10-07", "A"), slide("TikTok", "2026-10-07", "Cover", true), slide("Instagram", "2026-10-07", "A")]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual(["Instagram_2026-10-07_a.png", "TikTok_01_cover.png", "TikTok_02_2026-10-07_a.png"]);
  });

  it("names the failed cover if it cannot be drawn, and still saves the rest", async () => {
    render.mockImplementation(async (l: { n: number }) => {
      if (l.n === 5) throw new Error("boom");
      return new Blob([bytes(1)], { type: "image/png" });
    });
    const err = await downloadFinished([slide("TikTok", "2026-10-07", "Cover", true), slide("TikTok", "2026-10-07", "B")]).catch((e) => e);
    expect(err.failed).toEqual(["Cover"]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual(["TikTok_02_2026-10-07_b.png"]);
  });
});
