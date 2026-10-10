import type { SheetRow } from "./types.ts";

export const DEFAULT_STUDENT_PHOTO_URL = "https://pure.au.dk/portal/assets/no-portrait-473c6d005990baa1f418d9c668dcd4ec.png";

export const contentTabs = {
  Settings: { label: "Site settings", fields: ["key", "value"] },
  News: { label: "News", fields: ["month", "content", "link_label", "link_url", "visible", "display_order"] },
  Professor: { label: "Professor", fields: ["name", "secondary_name", "photo_url", "title", "affiliation", "email", "personal_url", "cv_url", "scholar_url", "bio", "visible"] },
  ProfessorDetails: { label: "Professor details", fields: ["section", "display_order", "content", "subtext", "link_label", "link_url", "visible"] },
  ProfessorPublications: { label: "Professor publications", fields: ["category", "order", "content", "visible"] },
  Students: { label: "Members", fields: ["group", "display_order", "name", "secondary_name", "photo_url", "status", "affiliation", "email", "personal_url", "cv_url", "scholar_url", "research_topics", "short_bio", "visible"] },
  Alumni: { label: "Alumni", fields: ["display_order", "name", "secondary_name", "photo_url", "degree", "period", "current_position", "personal_url", "visible"] },
  Research: { label: "Research / Home cards", fields: ["display_order", "title", "summary", "details", "image_url", "image_alt", "link_label", "link_url", "visible"] },
  Projects: { label: "Projects", fields: ["display_order", "title", "summary", "details", "image_url", "image_alt", "video_url", "video_caption", "video_captions_url", "link_label", "link_url", "visible"] },
  Publications: { label: "Publications", fields: ["category", "year", "display_order", "venue", "title", "authors", "paper_url", "project_url", "code_url", "video_url", "visible"] },
} as const;

export type ContentTab = keyof typeof contentTabs;
export type ContentRecord = { tab: ContentTab; rows: SheetRow[]; options?: string[] | null; updated_at: string };

export function choiceField(tab: ContentTab) {
  return tab === "Students" ? "group" : tab === "Publications" ? "category" : null;
}

export function contentOptions(record: ContentRecord): string[] {
  const field = choiceField(record.tab);
  return field ? record.options ?? [...new Set(record.rows.map((row) => String(row[field] ?? "").trim()).filter(Boolean))] : [];
}

export function validateOptions(tab: ContentTab, value: unknown, rows: SheetRow[]): string[] {
  const field = choiceField(tab);
  if (!field || !Array.isArray(value) || value.length > 200) throw new Error("Provide a list of up to 200 groups or categories.");
  const options = value.map((option) => {
    if (typeof option !== "string" || !option.trim() || option.trim().length > 200) throw new Error("Enter a name of up to 200 characters.");
    return option.trim();
  });
  if (new Set(options).size !== options.length) throw new Error("That name is already in the list.");
  for (const row of rows) {
    const name = String(row[field] ?? "").trim();
    if (name && !options.includes(name)) throw new Error(fieldLabel(field) + ' "' + name + '" is in use. Reassign its items before removing it.');
  }
  return options;
}

export function renameContentOption(tab: ContentTab, options: string[], rows: SheetRow[], current: string, value: string) {
  const field = choiceField(tab);
  if (!field || !options.includes(current)) throw new Error("Select an existing group or category to rename.");
  const name = value.trim();
  const nextRows = rows.map((row) => String(row[field] ?? "").trim() === current ? { ...row, [field]: name } : row);
  const nextOptions = validateOptions(tab, options.map((option) => option === current ? name : option), nextRows);
  return { options: nextOptions, rows: nextRows };
}

export function isContentTab(value: string): value is ContentTab {
  return Object.hasOwn(contentTabs, value);
}

export function reorderList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function reorderRows(tab: ContentTab, rows: SheetRow[], from: number, to: number): SheetRow[] {
  const orderField = contentTabs[tab].fields.find((field) => field === "display_order" || field === "order");
  if (!orderField) return rows;
  const next = reorderList(rows, from, to);
  return next === rows ? rows : next.map((row, index) => ({ ...row, [orderField]: index + 1 }));
}

export function fieldKind(name: string) {
  if (name === "visible") return "checkbox";
  if (["display_order", "order", "year"].includes(name)) return "number";
  if (name === "month") return "date";
  if (name.endsWith("_url")) return "url";
  if (name === "email") return "email";
  if (["value", "content", "summary", "details", "bio", "short_bio", "subtext", "research_topics", "authors"].includes(name)) return "textarea";
  return "text";
}

export function fieldLabel(name: string) {
  if (name === "short_bio") return "Short bio / What they do";
  return name.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function contentUrl(value: unknown, allowMailto = false) {
  if (typeof value !== "string" || !value.trim()) return "";
  const input = value.trim();
  if (/^\/media\/[0-9a-f-]{36}$/i.test(input)) return input;
  if (/^\/projects\/[a-z0-9-]+\.(svg|mp4|webm|vtt)$/.test(input)) return input;
  try {
    const url = new URL(input);
    return ["https:", "http:", ...(allowMailto ? ["mailto:"] : [])].includes(url.protocol) ? input : "";
  } catch {
    return "";
  }
}

export function projectVideo(value: unknown): { kind: "file" | "youtube"; url: string } | null {
  const input = contentUrl(value);
  if (!input) return null;
  const url = new URL(input, "https://local.invalid");
  const host = url.hostname.toLowerCase();
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? { kind: "youtube", url: "https://www.youtube-nocookie.com/embed/" + id } : null;
  }
  return /\.(mp4|webm|ogv|ogg)$/i.test(url.pathname) ? { kind: "file", url: input } : null;
}

export function validateRows(tab: ContentTab, value: unknown): SheetRow[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error("Content must contain at most 5,000 rows.");
  return value.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid content row.");
    const row: SheetRow = {};
    for (const field of contentTabs[tab].fields) {
      let cell = input[field] ?? "";
      if (tab === "Students" && field === "photo_url" && typeof cell === "string" && !cell.trim()) cell = DEFAULT_STUDENT_PHOTO_URL;
      if (!["string", "number", "boolean"].includes(typeof cell)) throw new Error("Invalid value for " + field + ".");
      if (typeof cell === "string" && cell.length > 30000) throw new Error(fieldLabel(field) + " is too long.");
      if (fieldKind(field) === "number" && cell !== "" && !Number.isFinite(Number(cell))) throw new Error("Invalid number for " + field + ".");
      if (field.endsWith("_url") && cell && !contentUrl(String(cell), !["image_url", "photo_url"].includes(field))) {
        throw new Error("Use a valid HTTP or HTTPS URL for " + fieldLabel(field) + ".");
      }
      if (tab === "Projects" && field === "video_url" && cell && !projectVideo(String(cell))) {
        throw new Error("Use a YouTube link or a direct MP4, WebM, or Ogg video URL.");
      }
      if (tab === "Projects" && field === "video_captions_url" && cell && !contentUrl(String(cell))) {
        throw new Error("Use a valid HTTP or HTTPS URL for video captions.");
      }
      row[field] = cell;
    }
    if (tab === "Settings" && row.key === "hero_image_url" && row.value && !contentUrl(String(row.value))) {
      throw new Error("Use a valid image URL for Hero image URL.");
    }
    return row;
  });
}
