import { isAuthenticated } from "./auth";

// Exact paths that need no session. Everything else, pages and /api/*, is guarded.
const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

/** Returns a refusal Response, or null when the request may continue. */
export function guard(req: Request): Response | null {
  const url = new URL(req.url);
  if (PUBLIC_PATHS.has(url.pathname)) return null;
  if (isAuthenticated(req)) return null;
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return Response.redirect(new URL("/login", url), 307);
}
