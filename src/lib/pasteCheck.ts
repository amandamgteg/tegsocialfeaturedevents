import { fetchImage } from "./safeUrl";

/** Confirms a link Amanda pasted is really an image. Uses the same shared check as the proxy (decision 15). */
export async function checkPastedImage(raw: string): Promise<{ ok: true; imageUrl: string } | { ok: false; reason: string }> {
  const url = raw.trim();
  if (!url) return { ok: false, reason: "Paste an image link first." };
  const result = await fetchImage(url);
  return result.ok ? { ok: true, imageUrl: url } : { ok: false, reason: result.reason };
}
