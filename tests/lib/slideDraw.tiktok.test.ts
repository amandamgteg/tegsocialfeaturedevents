// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSlide } from "@/lib/slideDraw";
import { layoutTikTokEventSlide } from "@/lib/slideLayout";

type Call = [string, ...unknown[]];
let calls: Call[];
const layout = layoutTikTokEventSlide({
  imageUrl: "https://img.example.com/a.png",
  imageSize: { width: 800, height: 800 },
  dates: ["2026-10-19"],
  title: "Tech Pizza Monday",
  measureText: (t, s) => t.length * s * 0.5,
});

beforeEach(() => {
  calls = [];
  const ctx = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => void calls.push([name, ...args]), set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
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

describe("renderSlide with a TikTok event slide", () => {
  it("draws a black background, the image and only the date-and-title box (no top box)", async () => {
    const blob = await renderSlide(layout);
    expect(blob.type).toBe("image/png");
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(1);
    const rects = calls.filter((c) => c[0] === "fillRect").map((c) => c.slice(1));
    expect(rects).toEqual([[0, 0, 1080, 1920], [layout.caption.x, layout.caption.y, layout.caption.w, layout.caption.h]]);
    expect(calls.filter((c) => c[0] === "fillText").map((c) => c[1])).toEqual(layout.caption.lines);
  });

  it("draws a square fill as a crop of the picture into the frame", async () => {
    const square = layoutTikTokEventSlide({ imageUrl: "u", imageSize: { width: 800, height: 400 }, dates: ["2026-10-19"], title: "T", measureText: (t, s) => t.length * s * 0.5 }, { square: true });
    await renderSlide(square);
    const draws = calls.filter((c) => c[0] === "drawImage");
    const { x, y, w, h, source: s } = square.image;
    expect(draws[0].slice(2)).toEqual([s.x, s.y, s.w, s.h, x, y, w, h]);
  });
});
