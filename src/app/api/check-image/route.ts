import { checkPastedImage } from "@/lib/pasteCheck";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = (body as { url?: unknown } | null)?.url;
  if (typeof url !== "string") return Response.json({ error: "Expected a url" }, { status: 400 });
  return Response.json(await checkPastedImage(url), { headers: { "cache-control": "no-store" } });
}
