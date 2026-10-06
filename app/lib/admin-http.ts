import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, validSession } from "./admin-auth.ts";

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const protocol = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol).split(",")[0].replace(/:$/, "");
  if (!origin || !host || !["http", "https"].includes(protocol)) return false;
  try { return origin === new URL(protocol + "://" + host).origin; } catch { return false; }
}

export function requireAdmin(request: NextRequest, mutation = false) {
  if (!validSession(request.cookies.get(SESSION_COOKIE)?.value)) return json({ error: "Please sign in again." }, 401);
  if (mutation && !sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  return null;
}

export async function readJson(request: NextRequest, maxLength = 1000000) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Expected JSON.");
  if (Number(request.headers.get("content-length")) > maxLength) throw new Error("Request is too large.");
  const body = await request.text();
  if (Buffer.byteLength(body) > maxLength) throw new Error("Request is too large.");
  return JSON.parse(body);
}

export function apiError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "23505") return json({ error: "That blog URL is already in use." }, 409);
  // Database error details can contain connection information; keep them server-side.
  console.error("Admin operation failed", code || (error instanceof SyntaxError ? "invalid-json" : "request-error"));
  return json({ error: "Unable to complete this request. Check the database connection and try again." }, 500);
}
