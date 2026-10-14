import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { verifyPassword, startSession, isAuthenticated, SESSION_COOKIE } from "@/lib/auth";

const reqWithCookie = (value?: string) =>
  new Request("https://x.test/", { headers: value === undefined ? {} : { cookie: `${SESSION_COOKIE}=${value}` } });

beforeEach(() => vi.stubEnv("TEG_PASSWORD", "hunter2"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("verifyPassword", () => {
  it("accepts the right password", () => expect(verifyPassword("hunter2")).toBe(true));
  it("rejects a wrong password", () => expect(verifyPassword("hunter3")).toBe(false));
  it("rejects an empty attempt", () => expect(verifyPassword("")).toBe(false));
  it("rejects a prefix or longer string", () => {
    expect(verifyPassword("hunter")).toBe(false);
    expect(verifyPassword("hunter22")).toBe(false);
  });
  it("is always false when the password setting is unset", () => {
    vi.stubEnv("TEG_PASSWORD", "");
    expect(verifyPassword("")).toBe(false);
    expect(verifyPassword("anything")).toBe(false);
  });
});

describe("startSession and isAuthenticated", () => {
  it("accepts a request carrying the issued cookie", () => {
    expect(isAuthenticated(reqWithCookie(startSession()))).toBe(true);
  });
  it("rejects no cookie", () => expect(isAuthenticated(reqWithCookie())).toBe(false));
  it("rejects a tampered cookie", () => {
    const [expiry, sig] = startSession().split(".");
    expect(isAuthenticated(reqWithCookie(`${Number(expiry) + 1000}.${sig}`))).toBe(false);
    expect(isAuthenticated(reqWithCookie(`${expiry}.${sig.slice(0, -1)}0`))).toBe(false);
    expect(isAuthenticated(reqWithCookie("garbage"))).toBe(false);
  });
  it("rejects a cookie signed for a different password", () => {
    const cookie = startSession();
    vi.stubEnv("TEG_PASSWORD", "other-password");
    expect(isAuthenticated(reqWithCookie(cookie))).toBe(false);
  });
  it("rejects every cookie when the password setting is unset", () => {
    const cookie = startSession();
    vi.stubEnv("TEG_PASSWORD", "");
    expect(isAuthenticated(reqWithCookie(cookie))).toBe(false);
  });
  it("rejects an expired cookie", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    const cookie = startSession();
    vi.setSystemTime(new Date("2026-12-14T12:00:00Z"));
    expect(isAuthenticated(reqWithCookie(cookie))).toBe(false);
  });
  it("finds the cookie among others", () => {
    const req = new Request("https://x.test/", { headers: { cookie: `a=1; ${SESSION_COOKIE}=${startSession()}; b=2` } });
    expect(isAuthenticated(req)).toBe(true);
  });
  it("startSession throws when the password setting is unset", () => {
    vi.stubEnv("TEG_PASSWORD", "");
    expect(() => startSession()).toThrow();
  });
});
