import { findImageForCard } from "@/lib/adapter";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the finder can try several images, each with an 8 s limit

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const c = body as Record<string, unknown> | null;
  if (!c || typeof c.id !== "string" || typeof c.title !== "string" || typeof c.url !== "string") {
    return Response.json({ error: "Expected id, title and url" }, { status: 400 });
  }
  const result = await findImageForCard({
    id: c.id,
    title: c.title,
    key: c.url,
    url: c.url,
    date: typeof c.date === "string" ? c.date : "",
    dates: typeof c.date === "string" ? [c.date] : [],
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
  });
  // Only a found image is cacheable. A failed lookup should be tried again next time.
  return Response.json(result, {
    headers: { "cache-control": result.status === "resolved" ? "private, max-age=86400" : "no-store" },
  });
}
