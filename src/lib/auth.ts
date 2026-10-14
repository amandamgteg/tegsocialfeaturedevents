import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "teg_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

// An unset or empty password setting means nobody gets in (never "open by default").
const password = () => process.env.TEG_PASSWORD ?? "";

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("hex");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function verifyPassword(attempt: string): boolean {
  const key = password();
  return key !== "" && safeEqual(sign("login", key + attempt), sign("login", key + key));
}

export function startSession(): string {
  const key = password();
  if (key === "") throw new Error("TEG_PASSWORD is not set");
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${expiry}.${sign(expiry, key)}`;
}

export function isAuthenticated(req: Request): boolean {
  const key = password();
  if (key === "") return false;
  const header = req.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return false;
  const [expiry, sig, ...rest] = raw.split(".");
  if (!expiry || !sig || rest.length > 0 || !/^\d+$/.test(expiry)) return false;
  if (!safeEqual(sig, sign(expiry, key))) return false;
  return Number(expiry) > Date.now() / 1000;
}
