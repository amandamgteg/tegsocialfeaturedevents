import { fetchImage } from "./safeUrl";

const SAY = {
  "not-image": () =>
    "That link isn't an image (it looks like a web page or another kind of file). Try right-clicking the picture itself and choosing “Copy image address”.",
  unsafe: (reason: string) => `That link can't be used: ${reason}.`,
  "too-large": () => "That image is larger than 8 MB.",
  upstream: (reason: string) => `Couldn't load that link: ${reason}.`,
} as const;

/** Confirms a link Amanda pasted is really an image. Uses the same shared check as the proxy (decision 15). */
export async function checkPastedImage(raw: string): Promise<{ ok: true; imageUrl: string } | { ok: false; reason: string }> {
  const url = raw.trim();
  if (!url) return { ok: false, reason: "Paste an image link first." };
  const result = await fetchImage(url);
  if (result.ok) return { ok: true, imageUrl: url };
  return { ok: false, reason: SAY[result.kind](result.reason) };
}
