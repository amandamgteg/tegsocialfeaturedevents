// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadSelected, fileNameFor, PartialDownloadError } from "@/lib/download";
import { captureDownloads, readBlob, readZip, bytes, isZip, type Saved } from "../helpers/download";

describe("fileNameFor", () => {
  const name = (title: string, type = "image/jpeg", date = "2026-10-07") => fileNameFor({ date, title }, type);

  it("builds date_slug.ext", () => {
    expect(name("Tinker Tuesday")).toBe("2026-10-07_tinker-tuesday.jpg");
  });
  it("lowercases, handles accents and punctuation, and turns spaces into hyphens", () => {
    expect(name("Café Déjà Vu!")).toBe("2026-10-07_cafe-deja-vu.jpg");
    expect(name("Bad Class: Drake vs. Kendrick")).toBe("2026-10-07_bad-class-drake-vs-kendrick.jpg");
    expect(name("Rock & Roll   Night")).toBe("2026-10-07_rock-roll-night.jpg");
    expect(name("  --Hello, World--  ")).toBe("2026-10-07_hello-world.jpg");
    expect(name("Mind's Eye / Part #2")).toBe("2026-10-07_mind-s-eye-part-2.jpg");
  });
  it("still gives a usable name for an empty or all-symbol title", () => {
    expect(name("")).toBe("2026-10-07_event.jpg");
    expect(name("   ")).toBe("2026-10-07_event.jpg");
    expect(name("!!! ???")).toBe("2026-10-07_event.jpg");
  });
  it("shortens long titles without leaving a trailing hyphen", () => {
    const long = name("An extremely long event title that goes on and on and on forever and ever amen ".repeat(3));
    const slug = long.replace(/^2026-10-07_/, "").replace(/\.jpg$/, "");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.length).toBeGreaterThan(20);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.startsWith("an-extremely-long-event-title")).toBe(true);
  });
  it("never lets a title add a path or odd characters to the file name", () => {
    expect(name("../../etc/passwd")).toBe("2026-10-07_etc-passwd.jpg");
    expect(name('a<b>c:d"e|f?g*h')).toMatch(/^2026-10-07_[a-z0-9-]+\.jpg$/);
  });
  it.each([
    ["image/jpeg", "jpg"],
    ["image/jpg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
    ["image/avif", "avif"],
    ["image/svg+xml", "svg"],
    ["IMAGE/PNG", "png"],
    ["image/png; charset=binary", "png"],
  ])("takes the extension from the content type: %s gives .%s", (type, ext) => {
    expect(name("A", type)).toBe(`2026-10-07_a.${ext}`);
  });
  it("falls back to .jpg for an unknown content type", () => {
    expect(name("A", "image/x-something-strange")).toBe("2026-10-07_a.jpg");
    expect(name("A", "")).toBe("2026-10-07_a.jpg");
  });
});

describe("downloadSelected", () => {
  let saved: Saved[];
  let responses: Record<string, { body?: Uint8Array; type?: string; status?: number }>;
  const requested = () => vi.mocked(globalThis.fetch).mock.calls.map((c) => String(c[0]));

  beforeEach(() => {
    saved = captureDownloads();
    responses = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const key = decodeURIComponent(String(input).replace("/api/image?url=", ""));
        const r = responses[key];
        if (!r || (r.status ?? 200) !== 200) return new Response("nope", { status: r?.status ?? 404 });
        return new Response(r.body as BodyInit | undefined, { status: 200, headers: { "content-type": r.type ?? "image/jpeg" } });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const item = (n: number, over: Partial<{ date: string; title: string; imageUrl: string }> = {}) => ({
    date: "2026-10-07",
    title: `Event ${n}`,
    imageUrl: `https://img.example.com/${n}.jpg`,
    ...over,
  });
  const serve = (n: number, type = "image/jpeg") => (responses[`https://img.example.com/${n}.jpg`] = { body: bytes(n), type });

  it("does nothing for an empty list", async () => {
    await downloadSelected([]);
    expect(saved).toHaveLength(0);
  });
  it("one item saves one image file, not a ZIP, with its name and bytes", async () => {
    serve(1);
    await downloadSelected([item(1, { title: "Tinker Tuesday" })]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("2026-10-07_tinker-tuesday.jpg");
    const data = await readBlob(saved[0].blob);
    expect(Array.from(data)).toEqual(Array.from(bytes(1)));
    expect(isZip(data)).toBe(false);
    expect(saved[0].blob.type).toBe("image/jpeg");
  });
  it("gets every image through our own /api/image, never from the source site", async () => {
    serve(1);
    await downloadSelected([item(1)]);
    expect(requested()).toEqual([`/api/image?url=${encodeURIComponent("https://img.example.com/1.jpg")}`]);
  });
  it("two or more items save one ZIP with each image under its own name", async () => {
    serve(1);
    serve(2, "image/png");
    serve(3, "image/webp");
    await downloadSelected([item(1, { title: "Alpha", date: "2026-10-07" }), item(2, { title: "Beta", date: "2026-10-08" }), item(3, { title: "Gamma", date: "2026-10-09" })]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toMatch(/\.zip$/);
    const zip = await readZip(saved[0].blob);
    expect(Object.keys(zip).sort()).toEqual(["2026-10-07_alpha.jpg", "2026-10-08_beta.png", "2026-10-09_gamma.webp"]);
    expect(Array.from(zip["2026-10-08_beta.png"])).toEqual(Array.from(bytes(2)));
    expect(Array.from(zip["2026-10-09_gamma.webp"])).toEqual(Array.from(bytes(3)));
  });
  it("keeps two events with the same date and title apart in the ZIP", async () => {
    serve(1);
    serve(2);
    serve(3);
    await downloadSelected([item(1, { title: "Same" }), item(2, { title: "Same" }), item(3, { title: "Same" })]);
    const zip = await readZip(saved[0].blob);
    expect(Object.keys(zip).sort()).toEqual(["2026-10-07_same-2.jpg", "2026-10-07_same-3.jpg", "2026-10-07_same.jpg"]);
    expect(Array.from(zip["2026-10-07_same.jpg"])).toEqual(Array.from(bytes(1)));
    expect(Array.from(zip["2026-10-07_same-2.jpg"])).toEqual(Array.from(bytes(2)));
  });
  it("takes the extension from the response, not the link: a .php link that returns image/jpeg is saved as .jpg", async () => {
    responses["https://img.example.com/get.php?id=7"] = { body: bytes(7), type: "image/jpeg" };
    await downloadSelected([item(7, { imageUrl: "https://img.example.com/get.php?id=7", title: "Php Pic" })]);
    expect(saved[0].name).toBe("2026-10-07_php-pic.jpg");
  });
  it("still downloads the others when one image fails, and tells the user which one", async () => {
    serve(1);
    serve(3);
    // image 2 is missing (404)
    const run = downloadSelected([item(1, { title: "Alpha" }), item(2, { title: "Broken One" }), item(3, { title: "Gamma" })]);
    await expect(run).rejects.toBeInstanceOf(PartialDownloadError);
    await run.catch((e: PartialDownloadError) => {
      expect(e.failed).toEqual(["Broken One"]);
      expect(e.saved).toBe(2);
      expect(e.message).toMatch(/Broken One/);
    });
    expect(saved).toHaveLength(1);
    const zip = await readZip(saved[0].blob);
    expect(Object.keys(zip).sort()).toEqual(["2026-10-07_alpha.jpg", "2026-10-07_gamma.jpg"]);
  });
  it("saves a single file, not a ZIP, when only one of several images could be fetched", async () => {
    serve(1);
    await expect(downloadSelected([item(1, { title: "Alpha" }), item(2, { title: "Missing" })])).rejects.toBeInstanceOf(PartialDownloadError);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("2026-10-07_alpha.jpg");
  });
  it("saves nothing, and says so, when every image fails", async () => {
    const run = downloadSelected([item(1, { title: "A" }), item(2, { title: "B" })]);
    await expect(run).rejects.toBeInstanceOf(PartialDownloadError);
    await run.catch((e: PartialDownloadError) => {
      expect(e.failed).toEqual(["A", "B"]);
      expect(e.saved).toBe(0);
    });
    expect(saved).toHaveLength(0);
  });
  it("treats a network error on one image like any other failure", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      if (String(input).includes(encodeURIComponent("2.jpg"))) throw new TypeError("offline");
      return new Response(bytes(1), { status: 200, headers: { "content-type": "image/jpeg" } });
    });
    const run = downloadSelected([item(1, { title: "A" }), item(2, { title: "B" })]);
    await expect(run).rejects.toBeInstanceOf(PartialDownloadError);
    await run.catch((e: PartialDownloadError) => expect(e.failed).toEqual(["B"]));
    expect(saved).toHaveLength(1);
  });
  it("refuses a response that is not an image, rather than saving it as a picture", async () => {
    responses["https://img.example.com/1.jpg"] = { body: new TextEncoder().encode("<html>"), type: "text/html" };
    await expect(downloadSelected([item(1, { title: "Page" })])).rejects.toBeInstanceOf(PartialDownloadError);
    expect(saved).toHaveLength(0);
  });
  it("releases the temporary file address after saving", async () => {
    serve(1);
    await downloadSelected([item(1)]);
    await new Promise((r) => setTimeout(r, 10)); // released a moment after the click, so the browser can finish saving
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
