// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFinished } from "@/lib/socialZip";
import { PartialDownloadError } from "@/lib/download";
import { captureDownloads, readZip, bytes, type Saved } from "../helpers/download";
import type { SlideLayout } from "@/lib/slideLayout";

const render = vi.hoisted(() => vi.fn());
vi.mock("@/lib/slideDraw", () => ({ renderSlide: render }));

const slide = (date: string, title: string, url = `https://img.example.com/${title}.png`, platform: "Instagram" | "TikTok" = "Instagram") => ({
  platform,
  date,
  title,
  layout: { image: { url } } as unknown as SlideLayout,
});
let saved: Saved[];

beforeEach(() => {
  saved = captureDownloads();
  render.mockReset();
  render.mockImplementation(async (layout: SlideLayout) => new Blob([bytes(layout.image.url.length)], { type: "image/png" }));
});
afterEach(() => vi.restoreAllMocks());

describe("downloadFinished", () => {
  it("saves one ZIP, even for a single slide", async () => {
    await downloadFinished([slide("2026-10-07", "Tinker Tuesday")]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("teg-social-images.zip");
    expect(Object.keys(await readZip(saved[0].blob))).toEqual(["Instagram_2026-10-07_tinker-tuesday.png"]);
  });

  it("puts the platform, date and title in each file name, in date order", async () => {
    await downloadFinished([slide("2026-10-21", "Community Dinner #1"), slide("2026-10-07", "Tinker Tuesday"), slide("2026-10-10", "Eurovision")]);
    const files = await readZip(saved[0].blob);
    expect(Object.keys(files)).toEqual([
      "Instagram_2026-10-07_tinker-tuesday.png",
      "Instagram_2026-10-10_eurovision.png",
      "Instagram_2026-10-21_community-dinner-1.png",
    ]);
  });

  it("gives two slides with the same date and title different names", async () => {
    await downloadFinished([slide("2026-10-07", "Same", "https://a.example.com/x.png"), slide("2026-10-07", "Same", "https://b.example.com/yy.png")]);
    const names = Object.keys(await readZip(saved[0].blob));
    expect(names).toEqual(["Instagram_2026-10-07_same.png", "Instagram_2026-10-07_same-2.png"]);
  });

  it("puts each slide's picture in the ZIP", async () => {
    await downloadFinished([slide("2026-10-07", "A", "https://img.example.com/aa.png")]);
    const files = await readZip(saved[0].blob);
    expect([...files["Instagram_2026-10-07_a.png"]]).toEqual([...bytes("https://img.example.com/aa.png".length)]);
  });

  it("saves the slides that worked, then names the ones that failed", async () => {
    render.mockImplementation(async (layout: SlideLayout) => {
      if (layout.image.url.includes("Bad")) throw new Error("boom");
      return new Blob([bytes(1)], { type: "image/png" });
    });
    const err = await downloadFinished([slide("2026-10-07", "Good"), slide("2026-10-08", "Bad")]).catch((e) => e);
    expect(err).toBeInstanceOf(PartialDownloadError);
    expect((err as PartialDownloadError).failed).toEqual(["Bad"]);
    expect(Object.keys(await readZip(saved[0].blob))).toEqual(["Instagram_2026-10-07_good.png"]);
  });

  it("saves nothing and does not fail for an empty list", async () => {
    await downloadFinished([]);
    expect(saved).toHaveLength(0);
  });
});
