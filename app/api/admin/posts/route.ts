import type { NextRequest } from "next/server";
import { validatePost } from "../../../lib/blog.ts";
import { apiError, json, readJson, requireAdmin } from "../../../lib/admin-http.ts";
import { createPost } from "../../../lib/database.ts";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  let post;
  try { post = validatePost(await readJson(request)); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid post." }, 400); }
  try { return json(await createPost(post), 201); }
  catch (error) { return apiError(error); }
}
