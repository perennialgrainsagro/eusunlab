import type { NextRequest } from "next/server";
import { apiError, json, readJson, requireAdmin } from "../../../lib/admin-http.ts";
import { deleteUnusedMedia, serverUsage } from "../../../lib/database.ts";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try { return json(await serverUsage()); } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  let ids;
  try {
    ids = (await readJson(request, 100000)).ids;
    if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) throw new Error();
  } catch { return json({ error: "Reload the image list before removing images." }, 400); }
  // Usage is re-checked in the DELETE itself, so an image used since the list loaded is kept.
  try { return json({ deleted: await deleteUnusedMedia(ids.map((id) => id.toLowerCase())) }); } catch (error) { return apiError(error); }
}
