import { zipSync } from "fflate";
import { PartialDownloadError } from "./download";
import { saveFile, slugFor, uniqueNames } from "./files";
import { renderLayers, renderPieces, renderSlide } from "./slideDraw";
import { layerNames, type DrawableLayout } from "./slideLayout";
import { buildEditablePptx } from "./slidePptx";

export type SocialSlide = { platform: "Instagram" | "TikTok"; date: string; title: string; layout: DrawableLayout; /** The TikTok cover, which is always file 01. */ isCover?: boolean };

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Puts the slides in ZIP order (Instagram first, then the TikTok cover, then the TikTok event slides, each soonest first)
 * and names each one: "Instagram_2026-10-07_title", "TikTok_01_cover", "TikTok_02_2026-10-07_title". The cover is 01 and the
 * TikTok event slides are numbered from 02 (decision 42). Two slides with the same name get -2, -3 and so on.
 */
function plan(slides: SocialSlide[]): { slide: SocialSlide; name: string }[] {
  const rank = (s: SocialSlide) => (s.platform === "Instagram" ? 0 : s.isCover ? 1 : 2);
  const ordered = [...slides].sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const tiktokEvents = ordered.filter((s) => s.platform === "TikTok" && !s.isCover);
  const stem = (s: SocialSlide) =>
    s.isCover ? "TikTok_01_cover" : s.platform === "TikTok" ? `TikTok_${pad2(tiktokEvents.indexOf(s) + 2)}_${s.date}_${slugFor(s.title)}` : `Instagram_${s.date}_${slugFor(s.title)}`;
  const names = uniqueNames(ordered.map((s) => ({ baseName: `${stem(s)}.png` }))).map((n) => n.slice(0, -".png".length));
  return ordered.map((slide, i) => ({ slide, name: names[i] }));
}

/** Saves the ZIP of whatever could be made, then names the slides that could not (decision 42). */
function saveZip(zipName: string, files: Record<string, [Uint8Array, { level: 0 }]>, failed: string[], saved: number) {
  if (saved > 0) saveFile(zipName, new Blob([zipSync(files) as BlobPart], { type: "application/zip" }));
  if (failed.length > 0) throw new PartialDownloadError(failed, saved);
}

const pngBytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

/**
 * Saves the finished slides as one ZIP, built in the browser (decision 42). Slides that can't be drawn are skipped, the
 * rest are saved, and then a PartialDownloadError names the ones that failed.
 */
export async function downloadFinished(slides: SocialSlide[]): Promise<void> {
  if (slides.length === 0) return;
  const results = await Promise.all(
    plan(slides).map(async ({ slide, name }) => {
      try {
        return { slide, name, bytes: await pngBytes(await renderSlide(slide.layout)) };
      } catch {
        return { slide, failed: true as const };
      }
    }),
  );
  const good = results.flatMap((r) => ("failed" in r ? [] : [r]));
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  good.forEach((g) => (files[`${g.name}.png`] = [g.bytes, { level: 0 }])); // PNGs are already compressed
  saveZip("teg-social-images.zip", files, results.flatMap((r) => ("failed" in r ? [r.slide.title || r.slide.date] : [])), good.length);
}

/**
 * Saves a ZIP with a folder for each slide: the finished image as 00_finished.png, the same slide with live text as
 * 00_editable.pptx, and then each layer, back to front, as 01_background.png, 02_event-image.png and so on (decision 43). Slides that can't be made are skipped, the rest are
 * saved, and then a PartialDownloadError names the ones that failed.
 */
export async function downloadLayers(slides: SocialSlide[]): Promise<void> {
  if (slides.length === 0) return;
  const results = await Promise.all(
    plan(slides).map(async ({ slide, name }) => {
      try {
        const [finished, layers, pieces] = await Promise.all([renderSlide(slide.layout), renderLayers(slide.layout), renderPieces(slide.layout)]);
        const names = layerNames(slide.layout);
        const files: [string, Uint8Array][] = [
          [`${name}/00_finished.png`, await pngBytes(finished)],
          [`${name}/00_editable.pptx`, await pngBytes(await buildEditablePptx(slide.layout, pieces))], // the wording is live text
        ];
        for (let i = 0; i < layers.length; i++) files.push([`${name}/${pad2(i + 1)}_${names[i] ?? "layer"}.png`, await pngBytes(layers[i])]);
        return { slide, files };
      } catch {
        return { slide, failed: true as const };
      }
    }),
  );
  const good = results.flatMap((r) => ("failed" in r ? [] : [r]));
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  good.forEach((g) => g.files.forEach(([path, bytes]) => (files[path] = [bytes, { level: 0 }])));
  saveZip("teg-social-layers.zip", files, results.flatMap((r) => ("failed" in r ? [r.slide.title || r.slide.date] : [])), good.length);
}
