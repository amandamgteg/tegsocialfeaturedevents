import { openImage } from "./safeUrl";

const STATUS = { unsafe: 400, "not-image": 422, "too-large": 422, upstream: 502 } as const;

/** Serves an event image from our own server (decision 16), after the shared safety check. */
export async function proxyImage(rawUrl: string): Promise<Response> {
  const opened = await openImage(rawUrl);
  if (!opened.ok) {
    return Response.json({ error: opened.reason }, { status: STATUS[opened.kind] });
  }
  return new Response(opened.body, {
    status: 200,
    headers: {
      "content-type": opened.contentType,
      // Private: the response sits behind the password. A day is plenty for a weekly tool.
      "cache-control": "private, max-age=86400",
      // An upstream SVG must never get to run script on our origin.
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
