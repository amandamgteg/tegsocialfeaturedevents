import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";

export const config = {
  runtime: "nodejs", // the session check uses node:crypto
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: Request) {
  return guard(req) ?? NextResponse.next();
}
