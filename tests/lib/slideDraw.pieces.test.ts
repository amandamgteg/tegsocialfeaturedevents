// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPieces } from "@/lib/slideDraw";
import { layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide } from "@/lib/slideLayout";

type Call = [string, ...unknown[]];
type Canvas = { width: number; height: number; calls: Call[] };
let canvases: Canvas[];

const measureText = (t: string, s: number) => t.length * s * 0.5;
const input = { imageUrl: "https://img.example.com/a.png", imageSize: { width: 800, height: 800 }, dates: ["2026-10-19"], title: "Tech Pizza Monday", measureText };
const cover = (edits = {}) => layoutTikTokCover({ items: [1, 2, 3].map((n) => ({ key: `k${n}`, imageUrl: `https://img.example.com/${n}.png`, imageSize: { width: 800, height: 800 } })), measureText }, edits);

beforeEach(() => {
  canvases = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const entry: Canvas = { width: this.width, height: this.height, calls: [] };
    canvases.push(entry);
    return new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => void entry.calls.push([name, ...args]), set: () => true }) as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob(["png"], { type: "image/png" }));
  } as never);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 800, close() {} })));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("renderPieces", () => {
  it("gives the full-slide background and each picture cut to its own frame, for an Instagram slide", async () => {
    const layout = layoutInstagramSlide(input);
    const pieces = await renderPieces(layout);
    expect(pieces.background?.type).toBe("image/png");
    expect(pieces.pictures).toHaveLength(1);
    expect(canvases).toHaveLength(2);
    expect([canvases[0].width, canvases[0].height]).toEqual([1080, 1920]);
    expect([canvases[1].width, canvases[1].height]).toEqual([layout.image.w, layout.image.h]);
  });

  it("draws a picture into its frame from the top left, with no space around it", async () => {
    const layout = layoutInstagramSlide(input);
    await renderPieces(layout);
    const draws = canvases[1].calls.filter((c) => c[0] === "drawImage");
    expect(draws).toHaveLength(1);
    expect(draws[0].slice(2)).toEqual([0, 0, layout.image.w, layout.image.h]);
  });

  it("draws only the zoomed part of a picture", async () => {
    const layout = layoutInstagramSlide(input, { zoom: 2, focus: { x: 0, y: 0 } });
    await renderPieces(layout);
    const s = layout.image.source;
    expect(canvases[1].calls.find((c) => c[0] === "drawImage")!.slice(2)).toEqual([s.x, s.y, s.w, s.h, 0, 0, layout.image.w, layout.image.h]);
  });

  it("has no background picture for a TikTok event slide, which is plain black", async () => {
    const layout = layoutTikTokEventSlide(input);
    const pieces = await renderPieces(layout);
    expect(pieces.background).toBeNull();
    expect(pieces.pictures).toHaveLength(1);
    expect([canvases[0].width, canvases[0].height]).toEqual([layout.image.w, layout.image.h]);
  });

  it("gives one cut picture per event for the cover, back to front", async () => {
    const layout = cover({ order: ["k3", "k1", "k2"] });
    const pieces = await renderPieces(layout);
    expect(pieces.background).not.toBeNull();
    expect(pieces.pictures).toHaveLength(3);
    layout.images.forEach((img, i) => expect([canvases[i + 1].width, canvases[i + 1].height]).toEqual([img.w, img.h]));
  });

  it("refuses with a clear error when a picture cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (String(u).startsWith("/api/image") ? new Response("x", { status: 502 }) : new Response(new Uint8Array([1]), { status: 200 }))));
    await expect(renderPieces(layoutInstagramSlide(input))).rejects.toThrow(/image/i);
  });
});
