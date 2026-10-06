import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "../../../lib/admin-auth.ts";
import { json, requireAdmin } from "../../../lib/admin-http.ts";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  const response = json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
