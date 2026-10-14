import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // decision 24
export const FETCH_TIMEOUT_MS = 8000; // decision 24
export const MAX_PAGE_BYTES = 2 * 1024 * 1024; // cap on the event page HTML read (SPEC section 11)
const MAX_REDIRECTS = 5;
const USER_AGENT = "TEG/0.1 image fetcher";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type FailureKind = "unsafe" | "not-image" | "too-large" | "upstream";
export type ImageFetchResult =
  | { ok: true; contentType: string; bytes?: Uint8Array }
  | { ok: false; reason: string; kind: FailureKind };

// ---- address checks -------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  const mapped = lower.match(/^::ffff:(.+)$/);
  if (mapped) {
    const rest = mapped[1];
    if (isIP(rest) === 4) return isPrivateIPv4(rest);
    // hex form, e.g. ::ffff:7f00:1
    const hex = rest.split(":").map((h) => parseInt(h, 16));
    if (hex.length === 2 && hex.every((n) => Number.isFinite(n))) {
      return isPrivateIPv4([hex[0] >> 8, hex[0] & 255, hex[1] >> 8, hex[1] & 255].join("."));
    }
    return true;
  }
  const first = parseInt(lower.split(":")[0] || "0", 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  return v === 4 ? isPrivateIPv4(ip) : v === 6 ? isPrivateIPv6(ip) : true;
}

// ---- assertSafeUrl --------------------------------------------------------

export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("not a valid web address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("only http and https addresses are allowed");
  if (url.username || url.password) throw new UnsafeUrlError("addresses with a username or password are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("private addresses are not allowed");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError("private addresses are not allowed");
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError("the site's address could not be found");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError("private addresses are not allowed");
  }
  return url;
}

// ---- fetching -------------------------------------------------------------

type Opened =
  | { ok: true; contentType: string; declaredLength: number | null; body: ReadableStream<Uint8Array> | null }
  | { ok: false; reason: string; kind: FailureKind };

const fail = (reason: string, kind: FailureKind) => ({ ok: false as const, reason, kind });
const tooLarge = () => fail(`image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB`, "too-large");
const timedOut = () => fail(`timed out after ${FETCH_TIMEOUT_MS / 1000} s`, "upstream");

/**
 * Runs every safety check, then hands back the body as a stream that errors if it goes over the
 * size cap or the timeout. `fetchImage` and the image proxy are both built on this.
 */
export async function openImage(raw: string): Promise<Opened> {
  const controller = new AbortController();
  let timedOutFlag = false;
  const timer = setTimeout(() => {
    timedOutFlag = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  const giveUp = (r: ReturnType<typeof fail>) => {
    clearTimeout(timer);
    return r;
  };

  try {
    let url = await assertSafeUrl(raw);
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(url.toString(), {
        headers: { accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", "user-agent": USER_AGENT },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return giveUp(fail(`site returned ${response.status} with no redirect address`, "upstream"));
      if (hop === MAX_REDIRECTS) return giveUp(fail("too many redirects", "upstream"));
      url = await assertSafeUrl(new URL(location, url).toString()); // every hop is checked
    }
    if (!response) return giveUp(fail("no response", "upstream"));

    if (!response.ok) {
      await response.body?.cancel();
      return giveUp(fail(`site returned ${response.status}`, "upstream"));
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      await response.body?.cancel();
      return giveUp(fail(`not an image response (${contentType || "missing content-type"})`, "not-image"));
    }
    const declared = Number.parseInt(response.headers.get("content-length") ?? "", 10);
    const declaredLength = Number.isFinite(declared) ? declared : null;
    if (declaredLength !== null && declaredLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      return giveUp(tooLarge());
    }
    if (!response.body) {
      clearTimeout(timer);
      return { ok: true, contentType, declaredLength, body: null };
    }

    const reader = response.body.getReader();
    let total = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(out) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            clearTimeout(timer);
            return out.close();
          }
          total += value.byteLength;
          if (total > MAX_IMAGE_BYTES) {
            clearTimeout(timer);
            await reader.cancel();
            return out.error(new Error(tooLarge().reason));
          }
          out.enqueue(value);
        } catch (err) {
          clearTimeout(timer);
          out.error(timedOutFlag ? new Error(timedOut().reason) : err);
        }
      },
      async cancel(reason) {
        clearTimeout(timer);
        await reader.cancel(reason);
      },
    });
    return { ok: true, contentType, declaredLength, body };
  } catch (err) {
    if (err instanceof UnsafeUrlError) return giveUp(fail(err.message, "unsafe"));
    if (timedOutFlag) return giveUp(timedOut());
    return giveUp(fail((err as Error).message || "image fetch failed", "upstream"));
  }
}

async function readAll(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** The one shared "is this a safe, real image?" check (decisions 24 and 25). */
export async function fetchImage(raw: string, opts: { readBody?: boolean } = {}): Promise<ImageFetchResult> {
  const opened = await openImage(raw);
  if (!opened.ok) return opened;
  const { contentType, declaredLength, body } = opened;
  if (!body) return { ok: true, contentType, ...(opts.readBody ? { bytes: new Uint8Array() } : {}) };
  try {
    if (opts.readBody) return { ok: true, contentType, bytes: await readAll(body) };
    if (declaredLength !== null) {
      await body.cancel(); // size already known to be within the cap
      return { ok: true, contentType };
    }
    await readAll(body); // no Content-Length: count the bytes to enforce the cap
    return { ok: true, contentType };
  } catch (err) {
    const reason = (err as Error).message;
    return { ok: false, reason, kind: /larger than/.test(reason) ? "too-large" : "upstream" };
  }
}

/** Reads page HTML as text, stopping at MAX_PAGE_BYTES (the image tags live near the top). */
export async function readTextCapped(response: Response, maxBytes = MAX_PAGE_BYTES): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, maxBytes);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel();
  const all = new Uint8Array(Math.min(total, maxBytes));
  let at = 0;
  for (const c of chunks) {
    const part = c.subarray(0, Math.max(0, Math.min(c.byteLength, all.byteLength - at)));
    all.set(part, at);
    at += part.byteLength;
  }
  return new TextDecoder().decode(all);
}

/**
 * Fetches an event page like `fetch`, but checks the address and every redirect hop first.
 * Throws UnsafeUrlError for a private address. Error statuses come back as normal responses.
 */
export async function fetchPage(raw: string, init: RequestInit = {}): Promise<Response> {
  let url = await assertSafeUrl(raw);
  for (let hop = 0; ; hop++) {
    const response = await fetch(url.toString(), { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) return response;
    if (hop >= MAX_REDIRECTS) throw new Error("too many redirects");
    url = await assertSafeUrl(new URL(location, url).toString());
  }
}
