import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { guard } from "@/lib/guard";
import { startSession, SESSION_COOKIE } from "@/lib/auth";

beforeEach(() => vi.stubEnv("TEG_PASSWORD", "hunter2"));
afterEach(() => vi.unstubAllEnvs());

const get = (path: string, authed = false) =>
  new Request(`https://x.test${path}`, {
    headers: authed ? { cookie: `${SESSION_COOKIE}=${startSession()}` } : {},
  });

describe("guard", () => {
  it("redirects an unauthenticated page request to /login", () => {
    const res = guard(get("/"))!;
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });
  it("returns 401 for an unauthenticated /api/events", async () => {
    const res = guard(get("/api/events"))!;
    expect(res.status).toBe(401);
    expect(await res.text()).not.toMatch(/title|events/i);
  });
  it("returns 401 for any other unauthenticated /api route", () => {
    expect(guard(get("/api/image?url=x"))!.status).toBe(401);
    expect(guard(get("/api/find-image"))!.status).toBe(401);
  });
  it("lets authenticated requests pass", () => {
    expect(guard(get("/", true))).toBeNull();
    expect(guard(get("/api/events", true))).toBeNull();
  });
  it("keeps the login page and login route reachable", () => {
    expect(guard(get("/login"))).toBeNull();
    expect(guard(new Request("https://x.test/api/login", { method: "POST" }))).toBeNull();
  });
  it("does not treat lookalike paths as public", () => {
    expect(guard(get("/login/../api/events"))).not.toBeNull();
    expect(guard(get("/api/login-evil"))!.status).toBe(401);
  });
});
