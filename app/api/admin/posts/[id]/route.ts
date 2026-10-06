import type { NextRequest } from "next/server";
import { validatePost } from "../../../../lib/blog.ts";
import { apiError, json, readJson, requireAdmin } from "../../../../lib/admin-http.ts";
import { deletePost, readPost, updatePost } from "../../../../lib/database.ts";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const post = await readPost((await context.params).id, true);
    return post ? json(post) : json({ error: "Post not found." }, 404);
  } catch (error) { return apiError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  let post;
  let updatedAt;
  try {
    const input = await readJson(request);
    post = validatePost(input);
    updatedAt = input.updated_at;
    if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new Error("Reload this post before saving.");
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid post." }, 400); }
  try {
    const result = await updatePost((await context.params).id, post, updatedAt);
    return result ? json(result) : json({ error: "This post changed in another window. Reload before saving." }, 409);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  let updatedAt;
  try {
    updatedAt = (await readJson(request, 2048)).updated_at;
    if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new Error();
  } catch { return json({ error: "Reload this post before deleting." }, 400); }
  try {
    const deleted = await deletePost((await context.params).id, updatedAt);
    return deleted ? json({ ok: true }) : json({ error: "This post changed in another window. Reload before deleting." }, 409);
  } catch (error) { return apiError(error); }
}
