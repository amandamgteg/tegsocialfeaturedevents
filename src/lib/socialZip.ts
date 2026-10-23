import { zipSync } from "fflate";
import { PartialDownloadError } from "./download";
import { saveFile, slugFor, uniqueNames } from "./files";
import { renderSlide } from "./slideDraw";
import type { SlideLayout } from "./slideLayout";

export type SocialSlide = { platform: "Instagram" | "TikTok"; date: string; title: string; layout: SlideLayout };

/** "Instagram_2026-10-07_tinker-tuesday.png" (decision 42). */
const fileNameFor = (s: SocialSlide) => `${s.platform}_${s.date}_${slugFor(s.title)}.png`;

/**
 * Saves the finished slides as one ZIP, built in the browser, soonest first (decision 42). Slides that can't be
 * drawn are skipped, the rest are saved, and then a PartialDownloadError names the ones that failed.
 */
export async function downloadFinished(slides: SocialSlide[]): Promise<void> {
  if (slides.length === 0) return;
  const ordered = [...slides].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
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
