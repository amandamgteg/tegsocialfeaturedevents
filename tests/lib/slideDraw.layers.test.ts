// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderLayers, renderSlide } from "@/lib/slideDraw";
import { layerNames, layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide, type DrawableLayout } from "@/lib/slideLayout";
import { readBlob } from "../helpers/download";

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
    return new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => void entry.calls.push([name, ...args]), set: (_t, name: string, value) => (entry.calls.push(["set:" + name, value]), true) }) as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob(["png-bytes"], { type: "image/png" }));
  } as never);
  const close = () => {}; // the same function every time, so the recorded drawing can be compared
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 800, close })));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const layouts: [string, DrawableLayout][] = [
  ["an Instagram slide", layoutInstagramSlide(input)],
  ["a TikTok event slide", layoutTikTokEventSlide(input)],
  ["the TikTok cover", cover()],
];

describe("renderLayers", () => {
  for (const [name, layout] of layouts) {
    describe(`for ${name}`, () => {
      it("gives one PNG per layer, back to front, each the size of the slide", async () => {
        const blobs = await renderLayers(layout);
        expect(blobs).toHaveLength(layerNames(layout).length);
        for (const b of blobs) {
          expect(b.type).toBe("image/png");
          expect(new TextDecoder().decode(await readBlob(b))).toBe("png-bytes");
        }
        expect(canvases).toHaveLength(blobs.length);
        canvases.forEach((c) => expect([c.width, c.height]).toEqual([1080, 1920]));
      });

      it("puts the same drawing on the layers, one after another, as the finished image has", async () => {
        await renderLayers(layout);
        const layered = canvases.flatMap((c) => c.calls);
        canvases = [];
        await renderSlide(layout);
        expect(layered).toEqual(canvases[0].calls); // laid over each other, the layers make the finished picture
      });

      it("draws the background on the first layer only, and leaves every other layer transparent", async () => {
        await renderLayers(layout);
        const [first, ...rest] = canvases;
        if ("topBox" in layout || "images" in layout) {
          expect(first.calls.filter((c) => c[0] === "drawImage")).toHaveLength(1);
          expect(first.calls.some((c) => c[0] === "fillRect" || c[0] === "fillText")).toBe(false);
        } else {
          // A TikTok event slide has a plain black background instead of the lab picture.
          expect(first.calls.some((c) => c[0] === "drawImage")).toBe(false);
          expect(first.calls.filter((c) => c[0] === "fillRect").map((c) => c.slice(1))).toEqual([[0, 0, 1080, 1920]]);
        }
        for (const c of rest) {
          expect(c.calls.some((x) => x[0] === "fillRect" && x[3] === 1080 && x[4] === 1920)).toBe(false); // nothing paints the whole slide
        }
      });

      it("puts each picture and each text box on a layer of its own", async () => {
        await renderLayers(layout);
        const [, ...rest] = canvases;
        for (const c of rest) {
          const pictures = c.calls.filter((x) => x[0] === "drawImage").length;
          const boxes = c.calls.filter((x) => x[0] === "fillRect").length;
          expect(pictures + boxes).toBe(1);
        }
      });
    });
  }

  it("keeps the cover's pictures in the saved front-to-back order", async () => {
    const layout = cover({ order: ["k3", "k1", "k2"] });
    await renderLayers(layout);
    const pictureLayers = canvases.slice(1, 4).map((c) => c.calls.find((x) => x[0] === "drawImage")!.slice(2));
    expect(pictureLayers).toEqual(layout.images.map((i) => [i.x, i.y, i.w, i.h]));
  });

  it("refuses with a clear error when a picture cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (String(u).startsWith("/api/image") ? new Response("x", { status: 502 }) : new Response(new Uint8Array([1]), { status: 200 }))));
    await expect(renderLayers(layoutInstagramSlide(input))).rejects.toThrow(/image/i);
  });
});
