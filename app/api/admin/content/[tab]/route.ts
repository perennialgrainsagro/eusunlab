import type { NextRequest } from "next/server";
import { choiceField, isContentTab, validateOptions, validateRows } from "../../../../lib/content-schema.ts";
import { apiError, json, readJson, requireAdmin } from "../../../../lib/admin-http.ts";
import { readContent, saveContent } from "../../../../lib/database.ts";

type Context = { params: Promise<{ tab: string }> };
export async function GET(request: NextRequest, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { tab } = await context.params;
  if (!isContentTab(tab)) return json({ error: "Unknown content section." }, 404);
  try { return json(await readContent(tab)); } catch (error) { return apiError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  const denied = requireAdmin(request, true);
  if (denied) return denied;
  const { tab } = await context.params;
  if (!isContentTab(tab)) return json({ error: "Unknown content section." }, 404);
  let rows;
  let options;
  let updatedAt;
  try {
    const input = await readJson(request);
    rows = validateRows(tab, input?.rows);
    if (choiceField(tab)) options = validateOptions(tab, input?.options, rows);
    updatedAt = input.updated_at;
    if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new Error("Reload this section before saving.");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid content." }, 400);
  }
  try {
    const record = await saveContent(tab, rows, updatedAt, options);
    return record ? json(record) : json({ error: "This section changed in another window. Reload before saving." }, 409);
  } catch (error) { return apiError(error); }
}
