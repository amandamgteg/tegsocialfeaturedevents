import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { assertSafeUrl, fetchImage, UnsafeUrlError } from "@/lib/safeUrl";
import { stubFetch, imageResponse, redirectTo, chunkedBody, PNG } from "../helpers/net";

const dns = vi.mocked(lookup) as unknown as ReturnType<typeof vi.fn>;
const PUBLIC = [{ address: "93.184.216.34", family: 4 }];

beforeEach(() => {
  dns.mockResolvedValue(PUBLIC);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("assertSafeUrl", () => {
  it("accepts a public https url and returns a URL", async () => {
    const u = await assertSafeUrl("https://example.com/a.png");
    expect(u).toBeInstanceOf(URL);
    expect(u.hostname).toBe("example.com");
  });
  it("accepts plain http", async () => {
    await expect(assertSafeUrl("http://example.com/a.png")).resolves.toBeInstanceOf(URL);
  });
  it.each(["file:///etc/passwd", "ftp://example.com/a.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "gopher://example.com"])(
    "rejects non-http(s) scheme %s",
    async (raw) => {
      await expect(assertSafeUrl(raw)).rejects.toBeInstanceOf(UnsafeUrlError);
    },
  );
  it("rejects text that is not a url", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeUrl("")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it.each([
    "http://localhost/x",
    "http://app.localhost/x",
    "http://127.0.0.1/x",
    "http://127.1.2.3/x",
    "http://10.0.0.5/x",
    "http://172.16.0.1/x",
    "http://172.31.255.255/x",
    "http://192.168.1.1/x",
    "http://169.254.169.254/latest/meta-data",
    "http://0.0.0.0/x",
    "http://100.64.0.1/x",
    "http://[::1]/x",
    "http://[::]/x",
    "http://[fe80::1]/x",
    "http://[fd00::1]/x",
    "http://[::ffff:127.0.0.1]/x",
    "http://2130706433/x", // decimal form of 127.0.0.1
    "http://0x7f.0.0.1/x",
  ])("rejects private or loopback address %s", async (raw) => {
    await expect(assertSafeUrl(raw)).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("accepts public addresses next to the private ranges", async () => {
    await expect(assertSafeUrl("http://172.32.0.1/x")).resolves.toBeInstanceOf(URL);
    await expect(assertSafeUrl("http://172.15.0.1/x")).resolves.toBeInstanceOf(URL);
    await expect(assertSafeUrl("http://8.8.8.8/x")).resolves.toBeInstanceOf(URL);
  });
  it("rejects a hostname that resolves to a private address", async () => {
    dns.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    await expect(assertSafeUrl("https://sneaky.example.com/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects when any resolved address is private", async () => {
    dns.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "::1", family: 6 },
    ]);
    await expect(assertSafeUrl("https://mixed.example.com/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects a hostname that does not resolve", async () => {
    dns.mockImplementation(async () => {
      throw new Error("ENOTFOUND");
    });
    await expect(assertSafeUrl("https://nope.example.com/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects embedded credentials", async () => {
    await expect(assertSafeUrl("https://user:pw@example.com/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

describe("fetchImage", () => {
  it("returns ok with the content type for a small image/png, without bytes by default", async () => {
    stubFetch(() => imageResponse("image/png"));
    const r = await fetchImage("https://example.com/a.png");
    expect(r).toEqual({ ok: true, contentType: "image/png" });
  });
  it("returns the bytes with readBody: true", async () => {
    stubFetch(() => imageResponse("image/png"));
    const r = await fetchImage("https://example.com/a.png", { readBody: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Array.from(r.bytes!)).toEqual(Array.from(PNG));
  });
  it("rejects a response with no Content-Type", async () => {
    stubFetch(() => imageResponse(null));
    const r = await fetchImage("https://example.com/a");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/content-type/i);
  });
  it("rejects a response that is not image/*", async () => {
    stubFetch(() => imageResponse("text/html"));
    expect(await fetchImage("https://example.com/a")).toMatchObject({ ok: false });
  });
  it("rejects a non-200 status", async () => {
    stubFetch(() => new Response("nope", { status: 404, headers: { "content-type": "image/png" } }));
    const r = await fetchImage("https://example.com/a.png");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/404/);
  });
  it("rejects an unsafe url without calling fetch", async () => {
    const f = stubFetch(() => imageResponse());
    const r = await fetchImage("http://127.0.0.1/a.png");
    expect(r).toMatchObject({ ok: false });
    expect(f).not.toHaveBeenCalled();
  });

  describe("redirects", () => {
    it("follows a safe redirect", async () => {
      stubFetch((url) => (url.endsWith("/start") ? redirectTo("https://cdn.example.com/a.png") : imageResponse()));
      expect(await fetchImage("https://example.com/start")).toMatchObject({ ok: true });
    });
    it("resolves a relative redirect", async () => {
      const f = stubFetch((url) => (url.endsWith("/start") ? redirectTo("/final.png") : imageResponse()));
      await fetchImage("https://example.com/start");
      expect(f.mock.calls[1][0]).toBe("https://example.com/final.png");
    });
    it("rejects a public url that redirects to a private address", async () => {
      const f = stubFetch((url) => (url.includes("example.com") ? redirectTo("http://169.254.169.254/latest") : imageResponse()));
      const r = await fetchImage("https://example.com/start");
      expect(r).toMatchObject({ ok: false });
      expect(f).toHaveBeenCalledTimes(1);
    });
    it("checks every hop of a chain", async () => {
      const f = stubFetch((url) => {
        if (url.endsWith("/1")) return redirectTo("https://example.com/2");
        if (url.endsWith("/2")) return redirectTo("http://10.0.0.1/3");
        return imageResponse();
      });
      expect(await fetchImage("https://example.com/1")).toMatchObject({ ok: false });
      expect(f).toHaveBeenCalledTimes(2);
    });
    it("re-checks DNS on a redirect to a hostname that resolves privately", async () => {
      dns.mockImplementation(async (host: string) => (host === "evil.example.org" ? [{ address: "192.168.0.9", family: 4 }] : PUBLIC));
      stubFetch((url) => (url.includes("example.com") ? redirectTo("https://evil.example.org/x") : imageResponse()));
      expect(await fetchImage("https://example.com/start")).toMatchObject({ ok: false });
    });
    it("gives up on a redirect loop", async () => {
      stubFetch(() => redirectTo("https://example.com/again"));
      const r = await fetchImage("https://example.com/again");
      expect(r).toMatchObject({ ok: false });
      if (!r.ok) expect(r.reason).toMatch(/redirect/i);
    });
  });

  describe("size cap (8 MB)", () => {
    it("rejects when Content-Length says it is over the cap", async () => {
      stubFetch(() => imageResponse("image/png", PNG, { "content-length": String(8 * 1024 * 1024 + 1) }));
      const r = await fetchImage("https://example.com/big.png");
      expect(r).toMatchObject({ ok: false });
      if (!r.ok) expect(r.reason).toMatch(/8\s?MB/i);
    });
    it("rejects a streamed body over the cap when Content-Length is omitted", async () => {
      stubFetch(() => imageResponse("image/png", chunkedBody(9, 1024 * 1024)));
      expect(await fetchImage("https://example.com/big.png", { readBody: true })).toMatchObject({ ok: false });
      expect(await fetchImage("https://example.com/big.png")).toMatchObject({ ok: false });
    });
    it("rejects a streamed body over the cap when Content-Length lies", async () => {
      stubFetch(() => imageResponse("image/png", chunkedBody(9, 1024 * 1024), { "content-length": "100" }));
      expect(await fetchImage("https://example.com/big.png", { readBody: true })).toMatchObject({ ok: false });
    });
    it("accepts a body exactly at the cap", async () => {
      stubFetch(() => imageResponse("image/png", chunkedBody(8, 1024 * 1024)));
      const r = await fetchImage("https://example.com/ok.png", { readBody: true });
      expect(r).toMatchObject({ ok: true });
      if (r.ok) expect(r.bytes!.byteLength).toBe(8 * 1024 * 1024);
    });
  });

  describe("timeout (8 s)", () => {
    const hang = (_url: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));

    it("gives up after 8 seconds waiting for a response", async () => {
      vi.useFakeTimers();
      stubFetch(hang);
      const p = fetchImage("https://example.com/slow.png");
      await vi.advanceTimersByTimeAsync(7999);
      let settled = false;
      p.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      const r = await p;
      expect(r).toMatchObject({ ok: false });
      if (!r.ok) expect(r.reason).toMatch(/timed out/i);
    });
    it("gives up after 8 seconds when the body stalls", async () => {
      vi.useFakeTimers();
      stubFetch((_u, init) => {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(PNG);
            init.signal?.addEventListener("abort", () => c.error(new Error("aborted")));
          },
        });
        return imageResponse("image/png", body);
      });
      const p = fetchImage("https://example.com/stall.png", { readBody: true });
      await vi.advanceTimersByTimeAsync(8001);
      const r = await p;
      expect(r).toMatchObject({ ok: false });
      if (!r.ok) expect(r.reason).toMatch(/timed out/i);
    });
  });

  it("never throws: a network error becomes ok: false", async () => {
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await fetchImage("https://example.com/a.png")).toMatchObject({ ok: false });
  });
  it("sends a user agent and an image accept header, and no Referer", async () => {
    const f = stubFetch(() => imageResponse());
    await fetchImage("https://example.com/a.png");
    const headers = new Headers((f.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("user-agent")).toBeTruthy();
    expect(headers.get("accept")).toMatch(/image/);
    expect(headers.get("referer")).toBeNull();
  });
});
