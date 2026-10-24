// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSlide } from "@/lib/slideDraw";
import { layoutInstagramSlide } from "@/lib/slideLayout";

type Call = [string, ...unknown[]];
let calls: Call[];

const make = (edits = {}) =>
  layoutInstagramSlide(
    { imageUrl: "https://img.example.com/a.png", imageSize: { width: 800, height: 800 }, dates: ["2026-10-19"], title: "Tech Pizza Monday", measureText: (t, s) => t.length * s * 0.5 },
    edits,
  );

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

describe("renderSlide with a cropped image", () => {
  it("draws only the chosen part of the picture, filling the frame", async () => {
    const layout = make({ zoom: 2, focus: { x: 0.4, y: 0.4 } });
    await renderSlide(layout);
    const draws = calls.filter((c) => c[0] === "drawImage");
    const { x, y, w, h, source: s } = layout.image;
    expect(draws[1].slice(2)).toEqual([s.x, s.y, s.w, s.h, x, y, w, h]);
  });

  it("draws the edited wording and positions", async () => {
    const layout = make({ captionText: "Oct 19: Mondays", captionPos: { x: 90, y: 1400 }, topPos: { x: 40, y: 100 } });
    await renderSlide(layout);
    const rects = calls.filter((c) => c[0] === "fillRect").map((c) => c.slice(1));
    expect(rects).toContainEqual([90, 1400, layout.caption.w, layout.caption.h]);
    expect(rects).toContainEqual([40, 100, layout.topBox.w, layout.topBox.h]);
    expect(calls.filter((c) => c[0] === "fillText").map((c) => c[1])).toContain("Oct 19: Mondays");
  });
});
