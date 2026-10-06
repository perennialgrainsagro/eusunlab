import type { NextRequest } from "next/server";
import { apiError, json, requireAdmin } from "../../../lib/admin-http.ts";
import { storeImage } from "../../../lib/database.ts";
import { optimizeImage } from "../../../lib/media.ts";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024 + 16384) return json({ error: "Images must be 3 MB or smaller." }, 413);
  let image;
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new Error("Images must be 3 MB or smaller.");
    image = await optimizeImage(Buffer.from(await file.arrayBuffer()));
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid image." }, 400); }
  try { return json({ url: "/media/" + await storeImage(image.contentType, image.bytes) }, 201); }
  catch (error) { return apiError(error); }
}
