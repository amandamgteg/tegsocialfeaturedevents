import { zipSync } from "fflate";
import { PartialDownloadError } from "./download";
import { saveFile, slugFor, uniqueNames } from "./files";
import { renderSlide } from "./slideDraw";
import type { AnyLayout } from "./slideLayout";

export type SocialSlide = { platform: "Instagram" | "TikTok"; date: string; title: string; layout: AnyLayout };

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Saves the finished slides as one ZIP, built in the browser (decision 42): Instagram first, then TikTok, each soonest first.
 * TikTok files are numbered from 02, because the cover will be 01. Slides that can't be drawn are skipped, the rest
 * are saved, and then a PartialDownloadError names the ones that failed.
 */
export async function downloadFinished(slides: SocialSlide[]): Promise<void> {
  if (slides.length === 0) return;
  const rank = (s: SocialSlide) => (s.platform === "Instagram" ? 0 : 1);
  const ordered = [...slides].sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const tiktok = ordered.filter((s) => s.platform === "TikTok");
  const fileNameFor = (s: SocialSlide) =>
    s.platform === "TikTok" ? `TikTok_${pad2(tiktok.indexOf(s) + 2)}_${s.date}_${slugFor(s.title)}.png` : `Instagram_${s.date}_${slugFor(s.title)}.png`;
  const results = await Promise.all(
    ordered.map(async (slide) => {
      try {
        const blob = await renderSlide(slide.layout);
        return { slide, bytes: new Uint8Array(await blob.arrayBuffer()) };
      } catch {
        return { slide, failed: true as const };
      }
    }),
  );
  const good = results.flatMap((r) => ("failed" in r ? [] : [r]));
  const failed = results.flatMap((r) => ("failed" in r ? [r.slide.title || r.slide.date] : []));

  if (good.length > 0) {
    const names = uniqueNames(good.map((g) => ({ baseName: fileNameFor(g.slide) })));
    const files: Record<string, [Uint8Array, { level: 0 }]> = {};
    good.forEach((g, i) => (files[names[i]] = [g.bytes, { level: 0 }])); // PNGs are already compressed
    saveFile("teg-social-images.zip", new Blob([zipSync(files) as BlobPart], { type: "application/zip" }));
  }
  if (failed.length > 0) throw new PartialDownloadError(failed, good.length);
}
