// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderLayers, renderSlide } from "@/lib/slideDraw";
import { layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide } from "@/lib/slideLayout";

type Call = [string, ...unknown[]];
type Canvas = { calls: Call[] };
let canvases: Canvas[];
let fetched: string[];

const measureText = (t: string, s: number) => t.length * s * 0.5;
const input = { imageUrl: "https://img.example.com/a.png", imageSize: { width: 800, height: 800 }, dates: ["2026-10-19"], title: "Tech Pizza Monday", measureText };
const cover = layoutTikTokCover({ items: [{ key: "k1", imageUrl: "https://img.example.com/1.png", imageSize: { width: 800, height: 800 } }], measureText });

beforeEach(() => {
  canvases = [];
  fetched = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    const entry: Canvas = { calls: [] };
    canvases.push(entry);
    return new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => void entry.calls.push([name, ...args]), set: (_t, name: string, value) => (entry.calls.push(["set:" + name, value]), true) }) as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob(["png"], { type: "image/png" }));
  } as never);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 800, close() {} })));
  vi.stubGlobal("fetch", vi.fn(async (u: string) => (fetched.push(String(u)), new Response(new Uint8Array([1]), { status: 200 }))));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fills = (c: Canvas) => c.calls.filter((x) => x[0] === "fillRect").map((x) => x.slice(1));
const fillColours = (c: Canvas) => c.calls.filter((x) => x[0] === "set:fillStyle").map((x) => x[1]);

describe("a TikTok event slide has a plain black background", () => {
  it("fills the whole slide with black first, and never loads the lab picture", async () => {
    await renderSlide(layoutTikTokEventSlide(input));
    expect(fetched).not.toContain("/social/lab-background.webp");
    const [slide] = canvases;
    expect(slide.calls[0]).toEqual(["set:fillStyle", "#000000"]);
    expect(slide.calls[1]).toEqual(["fillRect", 0, 0, 1080, 1920]);
  });

  it("still draws the event picture and the date-and-title box over it", async () => {
    const layout = layoutTikTokEventSlide(input);
    await renderSlide(layout);
    const [slide] = canvases;
    expect(slide.calls.filter((c) => c[0] === "drawImage")).toHaveLength(1);
    expect(fills(slide)).toContainEqual([layout.caption.x, layout.caption.y, layout.caption.w, layout.caption.h]);
  });

  it("makes the first layer the black background, with no picture in it", async () => {
    await renderLayers(layoutTikTokEventSlide(input));
    const [first] = canvases;
    expect(fills(first)).toEqual([[0, 0, 1080, 1920]]);
    expect(fillColours(first)).toEqual(["#000000"]);
    expect(first.calls.some((c) => c[0] === "drawImage")).toBe(false);
    expect(fetched).not.toContain("/social/lab-background.webp");
  });
});

describe("the other slides keep the lab background", () => {
  it("draws it on an Instagram slide", async () => {
    await renderSlide(layoutInstagramSlide(input));
    expect(fetched).toContain("/social/lab-background.webp");
    expect(canvases[0].calls.filter((c) => c[0] === "drawImage")).toHaveLength(2);
  });
  it("draws it on the TikTok cover", async () => {
    await renderSlide(cover);
    expect(fetched).toContain("/social/lab-background.webp");
    expect(canvases[0].calls.filter((c) => c[0] === "drawImage")).toHaveLength(2);
  });
});
