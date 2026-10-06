import type { NextRequest } from "next/server";
import { adminConfigured, createSession, loginAttemptKey, SESSION_COOKIE, SESSION_SECONDS, verifyCredentials } from "../../../lib/admin-auth.ts";
import { apiError, json, readJson, sameOrigin } from "../../../lib/admin-http.ts";
import { clearLoginAttempts, takeLoginAttempt } from "../../../lib/database.ts";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (!adminConfigured()) return json({ error: "Administrator access is not configured." }, 503);
  let input;
  try {
    input = await readJson(request, 2048);
    if (typeof input?.username !== "string" || typeof input?.password !== "string" || input.username.length > 100 || input.password.length > 256) throw new Error();
  } catch {
    return json({ error: "Enter your username and password." }, 400);
  }
  try {
    const key = loginAttemptKey(request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local");
    if (!await takeLoginAttempt(key)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    if (!verifyCredentials(input.username, input.password)) return json({ error: "Incorrect username or password." }, 401);
    await clearLoginAttempts(key);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSession(), {
      httpOnly: true, secure: request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
