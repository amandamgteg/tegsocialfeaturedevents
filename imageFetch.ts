const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

export type ImageFetchResult =
  | {
      ok: true;
      buffer: Buffer;
      contentType: string;
    }
  | {
      ok: false;
      reason: string;
    };

function imageExtensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase().split(";", 1)[0].trim();
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg"
  };

  return extensions[normalized] ?? "jpg";
}

export function extensionForImage(contentType: string, imageUrl: string) {
  try {
    const pathname = new URL(imageUrl).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match) return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  } catch {
    // Fall back to content type below.
  }

  return imageExtensionFromContentType(contentType);
}

export async function fetchImageBuffer(
  imageUrl: string,
  options: { timeoutMs?: number; maxBytes?: number; userAgent?: string } = {}
): Promise<ImageFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": options.userAgent ?? "TEG/0.1 image fetcher"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) return { ok: false, reason: `site returned ${response.status}` };

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return { ok: false, reason: `not an image response (${contentType || "missing content-type"})` };
    }

    const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return { ok: false, reason: `image is larger than ${Math.round(maxBytes / 1024 / 1024)}MB` };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) return { ok: false, reason: `image is larger than ${Math.round(maxBytes / 1024 / 1024)}MB` };
      return { ok: true, buffer, contentType };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: `image is larger than ${Math.round(maxBytes / 1024 / 1024)}MB` };
      }

      chunks.push(value);
    }

    return { ok: true, buffer: Buffer.concat(chunks), contentType };
  } catch (error) {
    return { ok: false, reason: (error as Error).message || "image fetch failed" };
  }
}
