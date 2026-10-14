import { fetchFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await fetchFeed());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the event feed." }, { status: 502 });
  }
}
