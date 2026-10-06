import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lab_admin";
export const SESSION_SECONDS = 60 * 60 * 8;

export function adminConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || "") && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32);
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

function equal(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function verifyCredentials(username: string, password: string) {
  if (!adminConfigured() || password.length > 256) return false;
  const expected = process.env.ADMIN_PASSWORD_HASH!;
  const actual = hashPassword(password, expected.split(":")[0]);
  return equal(actual, expected) && equal(username, process.env.ADMIN_USERNAME!);
}

function signature(payload: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");
}

function credentialVersion() {
  return createHash("sha256").update(process.env.ADMIN_PASSWORD_HASH || "").digest("hex");
}

export function createSession(now = Date.now()) {
  if (!adminConfigured()) throw new Error("Admin login is not configured.");
  const payload = Buffer.from(JSON.stringify({
    user: process.env.ADMIN_USERNAME,
    expires: now + SESSION_SECONDS * 1000,
    version: credentialVersion(),
  })).toString("base64url");
  return payload + "." + signature(payload);
}

export function validSession(value: string | undefined, now = Date.now()) {
  if (!adminConfigured() || !value || value.length > 1024) return false;
  const parts = value.split(".");
  const [payload, suppliedSignature] = parts;
  if (parts.length !== 2 || !payload || !suppliedSignature || !equal(signature(payload), suppliedSignature)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return session.user === process.env.ADMIN_USERNAME && typeof session.expires === "number" &&
      session.expires > now && session.expires <= now + SESSION_SECONDS * 1000 &&
      session.version === credentialVersion();
  } catch {
    return false;
  }
}

export function loginAttemptKey(ip: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(ip).digest("hex");
}
