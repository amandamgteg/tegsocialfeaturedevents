import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { extractImagesAndHandles } from "@/lib/extractor/extractor";
import type { EventItem } from "@/lib/extractor/types";
import { stubFetch, imageResponse, htmlResponse, type Handler } from "../helpers/net";

const PAGE = "https://events.example.com/page";
const item = (over: Partial<EventItem> = {}): EventItem => ({
  id: "e1",
  title: "Tinker Tuesday",
  eventUrl: PAGE,
  eventUrlType: "external",
  sourceUrl: PAGE,
  mishaHosted: false,
  ...over,
});

/** Serves `html` at the event page, and images at urls listed in `good`. Everything else 404s. */
const site = (html: string, good: string[] = [], extra: Handler = () => new Response("", { status: 404 })) =>
  stubFetch((url, init) => {
    if (url === PAGE) return htmlResponse(html);
    if (good.includes(url)) return imageResponse("image/jpeg");
    return extra(url, init);
  });

const run = async (html: string, good: string[]) => {
  site(html, good);
  return (await extractImagesAndHandles([item()]))[0];
};

beforeEach(() => {
  (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const A = "https://img.example.com/a.jpg";
const B = "https://img.example.com/b.jpg";
const C = "https://img.example.com/c.jpg";
const D = "https://img.example.com/d.jpg";

describe("extractor: search order", () => {
  const all = `<head>
    <meta property="og:image" content="${A}">
    <meta name="twitter:image" content="${B}">
    <script type="application/ld+json">{"@type":"Event","image":"${C}"}</script>
  </head><body><img src="${D}"></body>`;

  it("prefers og:image", async () => {
    expect(await run(all, [A, B, C, D])).toMatchObject({ status: "resolved", imageUrl: A });
  });
  it("falls back to the Twitter image", async () => {
    expect(await run(all, [B, C, D])).toMatchObject({ status: "resolved", imageUrl: B });
  });
  it("then JSON-LD", async () => {
    expect(await run(all, [C, D])).toMatchObject({ status: "resolved", imageUrl: C });
  });
  it("then <img> tags", async () => {
    expect(await run(all, [D])).toMatchObject({ status: "resolved", imageUrl: D });
  });
  it("resolves relative image urls against the event page", async () => {
    const r = await run(`<meta property="og:image" content="/pics/a.jpg">`, ["https://events.example.com/pics/a.jpg"]);
    expect(r).toMatchObject({ status: "resolved", imageUrl: "https://events.example.com/pics/a.jpg" });
  });
  it("uses the event's embedded image first when there is one", async () => {
    site(`<meta property="og:image" content="${A}">`, [A, B]);
    const [r] = await extractImagesAndHandles([item({ embeddedImageUrl: B })]);
    expect(r).toMatchObject({ status: "resolved", imageUrl: B });
  });
});

describe("extractor: skipping and failing", () => {
  it("skips logos and tiny images", async () => {
    const html = `<img class="site-logo" src="${A}"><img width="100" height="100" src="${B}"><img width="800" height="600" src="${C}">`;
    expect(await run(html, [A, B, C])).toMatchObject({ status: "resolved", imageUrl: C });
  });
  it("skips a candidate that fails the shared check and tries the next", async () => {
    const html = `<meta property="og:image" content="${A}"><meta name="twitter:image" content="${B}">`;
    expect(await run(html, [B])).toMatchObject({ status: "resolved", imageUrl: B });
  });
  it("fails with a reason when every candidate fails", async () => {
    const r = await run(`<meta property="og:image" content="${A}">`, []);
    expect(r).toMatchObject({ status: "failed", failureReason: "image candidate failed validation" });
    expect(r.imageUrl).toBeUndefined();
  });
  it("fails with a reason when the page has no candidates", async () => {
    expect(await run("<html><body>nothing here</body></html>", [])).toMatchObject({
      status: "failed",
      failureReason: "no usable image found on page",
    });
  });
  it("fails with the status when the page itself errors", async () => {
    stubFetch(() => new Response("gone", { status: 404 }));
    const [r] = await extractImagesAndHandles([item()]);
    expect(r).toMatchObject({ status: "failed", failureReason: "site returned 404" });
  });
  it("returns one result per item, in order, with eventId", async () => {
    site(`<meta property="og:image" content="${A}">`, [A]);
    const out = await extractImagesAndHandles([item({ id: "x" }), item({ id: "y" })]);
    expect(out.map((r) => r.eventId)).toEqual(["x", "y"]);
  });
});

describe("extractor: the section 11 gaps now closed", () => {
  it("rejects a candidate with no Content-Type", async () => {
    site(`<meta property="og:image" content="${A}">`, [], (url) => (url === A ? imageResponse(null) : new Response("", { status: 404 })));
    const [r] = await extractImagesAndHandles([item()]);
    expect(r.status).toBe("failed");
  });
  it("rejects a candidate that is not an image", async () => {
    site(`<meta property="og:image" content="${A}">`, [], (url) =>
      url === A ? new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }) : new Response("", { status: 404 }),
    );
    expect((await extractImagesAndHandles([item()]))[0].status).toBe("failed");
  });
  it("does not follow a candidate to a private address", async () => {
    const f = site(`<meta property="og:image" content="http://169.254.169.254/latest">`, []);
    const [r] = await extractImagesAndHandles([item()]);
    expect(r.status).toBe("failed");
    expect(f.mock.calls.map((c) => c[0])).not.toContain("http://169.254.169.254/latest");
  });
  it("caps the page HTML read, and still finds an image in the first part of a huge page", async () => {
    let reads = 0;
    const head = new TextEncoder().encode(`<meta property="og:image" content="${A}">`);
    const huge = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++;
        controller.enqueue(reads === 1 ? head : new Uint8Array(64 * 1024).fill(32));
        if (reads > 5000) controller.close(); // would be ~320 MB if never capped
      },
    });
    stubFetch((url) => (url === PAGE ? new Response(huge, { status: 200, headers: { "content-type": "text/html" } }) : imageResponse("image/jpeg")));
    const [r] = await extractImagesAndHandles([item()]);
    expect(r).toMatchObject({ status: "resolved", imageUrl: A });
    expect(reads).toBeLessThan(100); // cap is 2 MB, about 32 chunks
  });
});

describe("extractor: instagram handle", () => {
  it("is produced but unused by our cards", async () => {
    const r = await run(`<a href="https://www.instagram.com/tinkerto">x</a><meta property="og:image" content="${A}">`, [A]);
    expect(r.instagramHandle).toBe("tinkerto");
  });
});

describe("extractor: event page redirects", () => {
  it("follows a safe redirect to the real page", async () => {
    stubFetch((url) => {
      if (url === PAGE) return new Response(null, { status: 301, headers: { location: "https://events.example.com/moved" } });
      if (url === "https://events.example.com/moved") return htmlResponse(`<meta property="og:image" content="${A}">`);
      return url === A ? imageResponse("image/jpeg") : new Response("", { status: 404 });
    });
    expect((await extractImagesAndHandles([item()]))[0]).toMatchObject({ status: "resolved", imageUrl: A });
  });
  it("fails, without requesting it, when the page redirects to a private address", async () => {
    const f = stubFetch((url) =>
      url === PAGE ? new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }) : htmlResponse("SECRET"),
    );
    const [r] = await extractImagesAndHandles([item()]);
    expect(r.status).toBe("failed");
    expect(r.failureReason).toMatch(/private/i);
    expect(f.mock.calls.map((c) => c[0])).not.toContain("http://169.254.169.254/latest/meta-data");
  });
});

