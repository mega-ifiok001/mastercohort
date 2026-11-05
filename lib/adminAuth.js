import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  // Derived from the password, so changing ADMIN_PASSWORD logs everyone out.
  return crypto.createHash("sha256").update("admin-session:" + pw).digest();
}

function sign(payload) {
  return crypto.createHmac("sha256", secretKey()).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof input !== "string") return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const h = (s) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(h(input), h(pw));
}

export function createSessionToken() {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token) {
  if (!secretKey() || typeof token !== "string") return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export const SESSION_MAX_AGE = SESSION_SECONDS;