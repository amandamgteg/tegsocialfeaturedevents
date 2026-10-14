import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { checkPastedImage } from "@/lib/pasteCheck";
import { POST } from "@/app/api/check-image/route";
import { guard } from "@/lib/guard";
import { stubFetch, imageResponse, htmlResponse, redirectTo, chunkedBody } from "../helpers/net";

beforeEach(() => {
  (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const URL1 = "https://img.example.com/a.jpg";
const failsWithReason = async (raw: string) => {
  const r = await checkPastedImage(raw);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason.trim().length).toBeGreaterThan(3);
  return r;
};

describe("checkPastedImage", () => {
  it("accepts a url that returns image/jpeg, and gives the url back", async () => {
    stubFetch(() => imageResponse("image/jpeg"));
    expect(await checkPastedImage(URL1)).toEqual({ ok: true, imageUrl: URL1 });
  });
  it("trims spaces around a pasted link", async () => {
    stubFetch(() => imageResponse("image/png"));
    expect(await checkPastedImage(`  ${URL1}\n`)).toEqual({ ok: true, imageUrl: URL1 });
  });
  it("refuses an HTML page", async () => {
    stubFetch(() => htmlResponse("<p>hi</p>"));
    const r = await failsWithReason("https://example.com/page");
    if (!r.ok) expect(r.reason).toMatch(/image/i);
  });
  it("refuses a response with no Content-Type", async () => {
    stubFetch(() => imageResponse(null));
    await failsWithReason(URL1);
  });
  it.each(["ftp://example.com/a.jpg", "file:///etc/passwd", "javascript:alert(1)", "data:image/png;base64,AAAA"])("refuses %s", async (raw) => {
    const f = stubFetch(() => imageResponse());
    await failsWithReason(raw);
    expect(f).not.toHaveBeenCalled();
  });
  it("refuses a private address", async () => {
    const f = stubFetch(() => imageResponse());
    await failsWithReason("http://192.168.1.1/a.jpg");
    await failsWithReason("http://localhost/a.jpg");
    expect(f).not.toHaveBeenCalled();
  });
  it("refuses a redirect to a private address", async () => {
    const f = stubFetch((url) => (url.includes("img.example.com") ? redirectTo("http://169.254.169.254/latest") : imageResponse()));
    await failsWithReason(URL1);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("refuses an oversized image", async () => {
    stubFetch(() => imageResponse("image/jpeg", chunkedBody(9, 1024 * 1024)));
    const r = await failsWithReason(URL1);
    if (!r.ok) expect(r.reason).toMatch(/8\s?MB|large/i);
  });
  it("refuses when the site takes too long", async () => {
    vi.useFakeTimers();
    stubFetch((_u, init) => new Promise<Response>((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted")))));
    const p = checkPastedImage(URL1);
    await vi.advanceTimersByTimeAsync(8001);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/timed out/i);
  });
  it("refuses an empty string, with a message asking for a link", async () => {
    const f = stubFetch(() => imageResponse());
    const r = await failsWithReason("   ");
    if (!r.ok) expect(r.reason).toMatch(/paste/i);
    expect(f).not.toHaveBeenCalled();
  });
  it("refuses text that is not a link", async () => {
    stubFetch(() => imageResponse());
    await failsWithReason("not a url");
  });
  it("refuses a site that returns an error", async () => {
    stubFetch(() => new Response("gone", { status: 404, headers: { "content-type": "image/png" } }));
    const r = await failsWithReason(URL1);
    if (!r.ok) expect(r.reason).toMatch(/404/);
  });
  it("never throws", async () => {
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    await expect(checkPastedImage(URL1)).resolves.toMatchObject({ ok: false });
  });
});

describe("POST /api/check-image", () => {
  const post = (body: unknown) => POST(new Request("https://app.test/api/check-image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("returns the check result as JSON", async () => {
    stubFetch(() => imageResponse("image/jpeg"));
    const res = await post({ url: URL1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, imageUrl: URL1 });
  });
  it("returns a refusal as a normal 200 answer with a reason", async () => {
    stubFetch(() => htmlResponse("<p>"));
    const res = await post({ url: "https://example.com/page" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, reason: expect.any(String) });
  });
  it("returns 400 for invalid JSON or a missing url", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ url: 5 })).status).toBe(400);
  });
  it("is refused without a session (the guard covers every /api route)", () => {
    vi.stubEnv("TEG_PASSWORD", "hunter2");
    const res = guard(new Request("https://app.test/api/check-image", { method: "POST" }));
    expect(res?.status).toBe(401);
    vi.unstubAllEnvs();
  });
  it("never caches the answer", async () => {
    stubFetch(() => imageResponse("image/jpeg"));
    expect((await post({ url: URL1 })).headers.get("cache-control") ?? "").not.toMatch(/max-age=[1-9]/);
  });
});
