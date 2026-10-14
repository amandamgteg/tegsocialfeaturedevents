import { SESSION_COOKIE, startSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const attempt = String(form.get("password") ?? "");
  if (!verifyPassword(attempt)) {
    return Response.redirect(new URL("/login?error=1", req.url), 303);
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL("/", req.url).toString(),
      "set-cookie": `${SESSION_COOKIE}=${startSession()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
    },
  });
}
