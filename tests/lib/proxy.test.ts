import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { proxyImage } from "@/lib/proxy";
import { GET } from "@/app/api/image/route";
import { stubFetch, imageResponse, chunkedBody, PNG } from "../helpers/net";

beforeEach(() => {
  (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("proxyImage", () => {
  it("streams the bytes with the upstream content type and a cache header", async () => {
    stubFetch(() => imageResponse("image/png"));
    const res = await proxyImage("https://example.com/a.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/max-age=\d+/);
    expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual(Array.from(PNG));
  });
  it("stops an upstream SVG from running script on our origin", async () => {
    stubFetch(() => imageResponse("image/svg+xml", "<svg onload='alert(1)'/>"));
    const res = await proxyImage("https://example.com/a.svg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toMatch(/default-src 'none'/);
  });
  it("returns a 4xx for an unsafe url and never fetches it", async () => {
    const f = stubFetch(() => imageResponse());
    const res = await proxyImage("http://169.254.169.254/latest/meta-data");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(f).not.toHaveBeenCalled();
  });
  it("returns a 4xx for a non-image and never returns the upstream body", async () => {
    stubFetch(() => new Response("SECRET-UPSTREAM-BODY", { status: 200, headers: { "content-type": "text/html" } }));
    const res = await proxyImage("https://example.com/page");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await res.text()).not.toContain("SECRET-UPSTREAM-BODY");
  });
  it("returns a 4xx for a response with no content type", async () => {
    stubFetch(() => imageResponse(null));
    const res = await proxyImage("https://example.com/a");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
  it("returns 502 when the upstream site fails", async () => {
    stubFetch(() => new Response("x", { status: 500, headers: { "content-type": "image/png" } }));
    expect((await proxyImage("https://example.com/a.png")).status).toBe(502);
  });
  it("errors the stream rather than serving more than 8 MB", async () => {
    stubFetch(() => imageResponse("image/png", chunkedBody(9, 1024 * 1024)));
    const res = await proxyImage("https://example.com/big.png");
    if (res.status === 200) {
      await expect(res.arrayBuffer()).rejects.toThrow();
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("GET /api/image", () => {
  it("returns 400 when the url parameter is missing", async () => {
    const res = await GET(new Request("https://app.test/api/image"));
    expect(res.status).toBe(400);
  });
  it("proxies the url parameter", async () => {
    stubFetch(() => imageResponse("image/png"));
    const res = await GET(new Request(`https://app.test/api/image?url=${encodeURIComponent("https://example.com/a.png")}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
