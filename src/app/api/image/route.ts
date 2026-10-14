import { proxyImage } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });
  return proxyImage(url);
}
