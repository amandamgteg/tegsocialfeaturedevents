import { zipSync } from "fflate";

export type DownloadItem = { date: string; title: string; imageUrl: string };

/** Thrown after the images that could be fetched were saved. `failed` lists the titles that could not. */
export class PartialDownloadError extends Error {
  constructor(
    public failed: string[],
    public saved: number,
  ) {
    super(
      saved > 0
        ? `Couldn't download: ${failed.join(", ")}. The other ${saved === 1 ? "image was" : "images were"} saved.`
        : `Couldn't download: ${failed.join(", ")}.`,
    );
    this.name = "PartialDownloadError";
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};
const MAX_SLUG = 60;

function slugFor(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "") // accents
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, "");
  return slug || "event";
}

function extensionFor(contentType: string): string {
  const type = contentType.toLowerCase().split(";", 1)[0].trim();
  return EXTENSIONS[type] ?? "jpg";
}

/** "2026-10-07_tinker-tuesday.jpg". The extension comes from the response, not the link (SPEC section 11). */
export function fileNameFor(item: { date: string; title: string }, contentType: string): string {
  return `${item.date}_${slugFor(item.title)}.${extensionFor(contentType)}`;
}

type Fetched = { name: string; bytes: Uint8Array; contentType: string };

async function fetchViaProxy(item: DownloadItem): Promise<Omit<Fetched, "name">> {
  const res = await fetch(`/api/image?url=${encodeURIComponent(item.imageUrl)}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) throw new Error("not an image");
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType };
}

/** Two events with the same date and title get -2, -3 and so on, so nothing overwrites anything. */
function uniqueNames(files: { baseName: string }[]): string[] {
  const used = new Set<string>();
  return files.map(({ baseName }) => {
    const dot = baseName.lastIndexOf(".");
    const stem = baseName.slice(0, dot);
    const ext = baseName.slice(dot);
    let name = baseName;
    for (let n = 2; used.has(name); n++) name = `${stem}-${n}${ext}`;
    used.add(name);
    return name;
  });
}

function saveFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Saves the images: one as a file, two or more as a ZIP built right here in the browser, so no server
 * response ever carries the ZIP (decision 27). Images that can't be fetched are skipped, the rest are
 * saved, and then a PartialDownloadError names the ones that failed. The count of images that were
 * actually fetched decides one file versus ZIP.
 */
export async function downloadSelected(items: DownloadItem[]): Promise<void> {
  if (items.length === 0) return;
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        return { item, ...(await fetchViaProxy(item)) };
      } catch {
        return { item, failed: true as const };
      }
    }),
  );
  const good = results.flatMap((r) => ("failed" in r ? [] : [r]));
  const failed = results.flatMap((r) => ("failed" in r ? [r.item.title || r.item.date] : []));

  if (good.length === 1) {
    const [one] = good;
    saveFile(fileNameFor(one.item, one.contentType), new Blob([one.bytes as BlobPart], { type: one.contentType }));
  } else if (good.length > 1) {
    const names = uniqueNames(good.map((g) => ({ baseName: fileNameFor(g.item, g.contentType) })));
    const files: Record<string, [Uint8Array, { level: 0 }]> = {};
    good.forEach((g, i) => (files[names[i]] = [g.bytes, { level: 0 }])); // pictures are already compressed
    saveFile("teg-event-images.zip", new Blob([zipSync(files) as BlobPart], { type: "application/zip" }));
  }
  if (failed.length > 0) throw new PartialDownloadError(failed, good.length);
}
