import { vi } from "vitest";
import { unzipSync } from "fflate";

export type Saved = { name: string; blob: Blob };

/** Captures every file the page tries to save (an <a download> click), without a real browser download. */
export function captureDownloads(): Saved[] {
  const saved: Saved[] = [];
  const blobs = new Map<string, Blob>();
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn((blob: Blob) => {
      const url = `blob:test/${++n}`;
      blobs.set(url, blob);
      return url;
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, blob: blobs.get(this.href)! });
  });
  return saved;
}

export function readBlob(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function readZip(blob: Blob): Promise<Record<string, Uint8Array>> {
  return unzipSync(await readBlob(blob));
}

/** Bytes that are different for each seed, so tests can tell the images apart. */
export const bytes = (seed: number, length = 16) => Uint8Array.from({ length }, (_, i) => (seed * 31 + i) % 256);

export const isZip = (data: Uint8Array) => data[0] === 0x50 && data[1] === 0x4b; // "PK"
