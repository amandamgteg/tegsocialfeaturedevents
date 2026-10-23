// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSlide } from "@/lib/slideDraw";
import { layoutInstagramSlide } from "@/lib/slideLayout";
import { readBlob } from "../helpers/download";

type Call = [string, ...unknown[]];
let calls: Call[];
let canvasSize: { width: number; height: number };
let fetched: string[];
let imageFails: boolean;

const layout = layoutInstagramSlide({
  imageUrl: "https://img.example.com/a b.png",
  imageSize: { width: 800, height: 800 },
  dates: ["2026-10-19"],
  title: "Tech Pizza Monday",
  measureText: (t, s) => t.length * s * 0.5,
});

beforeEach(() => {
  calls = [];
  fetched = [];
  imageFails = false;
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => (...args: unknown[]) => void calls.push([name, ...args]),
      set: (_t, name: string, value) => (calls.push(["set:" + name, value]), true),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    canvasSize = this;
    return ctx as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob(["png-bytes"], { type: "image/png" }));
  } as never);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 800, close() {} })));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      fetched.push(String(input));
      if (imageFails && String(input).startsWith("/api/image")) return new Response("x", { status: 502 });
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } });
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("renderSlide", () => {
  it("returns a PNG on a 1080 by 1920 canvas", async () => {
    const blob = await renderSlide(layout);
    expect(blob.type).toBe("image/png");
    expect(new TextDecoder().decode(await readBlob(blob))).toBe("png-bytes");
    expect([canvasSize.width, canvasSize.height]).toEqual([1080, 1920]);
  });

  it("loads the lab background from the site and the event image through the image proxy", async () => {
    await renderSlide(layout);
    expect(fetched).toContain("/social/lab-background.webp");
    expect(fetched).toContain(`/api/image?url=${encodeURIComponent(layout.image.url)}`);
  });

  it("draws the background first, cropped to fill the tall slide with the middle kept", async () => {
    await renderSlide(layout);
    const draws = calls.filter((c) => c[0] === "drawImage");
    // An 800 by 800 background scaled to 1920 tall is 1920 wide, so 450 by 800 of the original is kept, from x 175.
    expect(draws[0].slice(1).slice(1)).toEqual([175, 0, 450, 800, 0, 0, 1080, 1920]);
  });

  it("draws the event image where the layout puts it", async () => {
    await renderSlide(layout);
    const draws = calls.filter((c) => c[0] === "drawImage");
    const { x, y, w, h } = layout.image;
    expect(draws[1].slice(2)).toEqual([x, y, w, h]);
  });

  it("fills the top box and the date-and-title box in black", async () => {
    await renderSlide(layout);
    const rects = calls.filter((c) => c[0] === "fillRect").map((c) => c.slice(1));
    const { topBox: t, caption: c } = layout;
    expect(rects).toContainEqual([t.x, t.y, t.w, t.h]);
    expect(rects).toContainEqual([c.x, c.y, c.w, c.h]);
    const fills = calls.filter((x) => x[0] === "set:fillStyle").map((x) => x[1]);
    expect(fills).toContain("#000000");
  });

  it("writes every line of text in white, bold Arial", async () => {
    await renderSlide(layout);
    const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).toEqual([...layout.topBox.lines, ...layout.caption.lines]);
    const fonts = calls.filter((c) => c[0] === "set:font").map((c) => String(c[1]));
    expect(fonts.length).toBeGreaterThan(0);
    fonts.forEach((f) => expect(f).toMatch(/^bold \d+px Arial/));
    expect(calls.filter((c) => c[0] === "set:fillStyle").map((c) => c[1])).toContain("#ffffff");
  });

  it("centres each line in its box", async () => {
    await renderSlide(layout);
    const lines = calls.filter((c) => c[0] === "fillText");
    const c = layout.caption;
    const last = lines[lines.length - 1];
    expect(last[2]).toBe(c.x + c.w / 2);
  });

  it("refuses with a clear error when the event image cannot be fetched", async () => {
    imageFails = true;
    await expect(renderSlide(layout)).rejects.toThrow(/image/i);
  });
});
