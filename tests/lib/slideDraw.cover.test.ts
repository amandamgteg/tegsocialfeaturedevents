// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSlide } from "@/lib/slideDraw";
import { layoutTikTokCover } from "@/lib/slideLayout";

type Call = [string, ...unknown[]];
let calls: Call[];
let fetched: string[];

const make = (edits = {}) =>
  layoutTikTokCover(
    {
      items: [1, 2, 3].map((n) => ({ key: `k${n}`, imageUrl: `https://img.example.com/${n}.png`, imageSize: { width: 800, height: 800 } })),
      measureText: (t, s) => t.length * s * 0.5,
    },
    edits,
  );

beforeEach(() => {
  calls = [];
  fetched = [];
  const ctx = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => void calls.push([name, ...args]), set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
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

describe("renderSlide with the TikTok cover", () => {
  it("loads the background and every event picture through the image proxy", async () => {
    await renderSlide(make());
    expect(fetched).toContain("/social/lab-background.webp");
    for (const n of [1, 2, 3]) expect(fetched).toContain(`/api/image?url=${encodeURIComponent(`https://img.example.com/${n}.png`)}`);
  });

  it("draws the background, then each picture back to front, then the top box", async () => {
    const layout = make({ order: ["k3", "k1", "k2"] });
    await renderSlide(layout);
    const draws = calls.filter((c) => c[0] === "drawImage");
    expect(draws).toHaveLength(4);
    layout.images.forEach((img, i) => expect(draws[i + 1].slice(2)).toEqual([img.x, img.y, img.w, img.h]));
    const rects = calls.filter((c) => c[0] === "fillRect").map((c) => c.slice(1));
    expect(rects).toEqual([[layout.topBox.x, layout.topBox.y, layout.topBox.w, layout.topBox.h]]);
    expect(calls.filter((c) => c[0] === "fillText").map((c) => c[1])).toEqual(layout.topBox.lines);
  });

  it("draws only the chosen part of a zoomed picture", async () => {
    const layout = make({ collage: { k2: { zoom: 2 } } });
    await renderSlide(layout);
    const two = layout.images.find((i) => i.key === "k2")!;
    const draws = calls.filter((c) => c[0] === "drawImage");
    const idx = layout.images.indexOf(two) + 1;
    expect(draws[idx].slice(2)).toEqual([two.source.x, two.source.y, two.source.w, two.source.h, two.x, two.y, two.w, two.h]);
  });

  it("refuses with a clear error when a picture cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (String(u).includes("2.png") ? new Response("x", { status: 502 }) : new Response(new Uint8Array([1]), { status: 200 }))));
    await expect(renderSlide(make())).rejects.toThrow(/image/i);
  });
});
