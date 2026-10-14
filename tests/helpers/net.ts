import { vi } from "vitest";

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

/** Replaces global fetch with a handler. Returns the mock so tests can inspect calls. */
export function stubFetch(handler: Handler) {
  const mock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

export const imageResponse = (type: string | null = "image/png", body: BodyInit = PNG, extra: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { ...(type ? { "content-type": type } : {}), ...extra } });

export const htmlResponse = (html: string) =>
  new Response(html, { status: 200, headers: { "content-type": "text/html" } });

export const redirectTo = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } });

/** A body of `chunks` chunks of `size` bytes each. */
export function chunkedBody(chunks: number, size: number) {
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent++ >= chunks) return controller.close();
      controller.enqueue(new Uint8Array(size));
    },
  });
}
