import {
  sampleAlumni,
  sampleNews,
  sampleProfessor,
  sampleProfessorDetails,
  sampleProfessorPublications,
  samplePublications,
  sampleResearch,
  sampleSettings,
  sampleStudents,
} from "./sample-data.ts";
import type {
  Alumni,
  DataResult,
  NewsItem,
  Professor,
  ProfessorDetail,
  Publication,
  ResearchItem,
  Settings,
  SheetRow,
  Student,
} from "./types.ts";

type GvizCell = { v?: unknown; f?: string } | null;
type GvizPayload = {
  status?: string;
  errors?: Array<{ detailed_message?: string; message?: string }>;
  table?: {
    cols?: Array<{ label?: string; id?: string }>;
    rows?: Array<{ c?: GvizCell[] }>;
  };
};

const settingsKeys = new Set<keyof Settings>([
  "lab_name",
  "tagline",
  "introduction",
  "hero_image_url",
  "affiliation",
  "contact_email",
  "address",
  "footer_text",
  "research_heading",
  "research_intro",
  "publications_intro",
]);

function headerName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function parseGvizResponse(source: string): SheetRow[] {
  const start = source.indexOf("{");
  const end = source.lastIndexOf(");");
  if (start < 0 || end <= start) throw new Error("Invalid Google Sheets response");

  const payload = JSON.parse(source.slice(start, end)) as GvizPayload;
  if (payload.status && payload.status !== "ok") {
    const detail = payload.errors?.[0]?.detailed_message ?? payload.errors?.[0]?.message;
    throw new Error(detail || "Google Sheets returned an error");
  }

  const columns = payload.table?.cols?.map((column) =>
    headerName(column.label || column.id || ""),
  ) ?? [];

  if (!columns.length || columns.some((column) => !column)) {
    throw new Error("Every Google Sheet column needs a header in row 1");
  }

  return (payload.table?.rows ?? []).map((row) =>
    Object.fromEntries(
      columns.map((column, index) => {
        const raw = row.c?.[index]?.v;
        return [column, raw === null || raw === undefined ? "" : raw];
      }),
    ),
  );
}

function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function asOrder(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

export function isVisible(value: unknown) {
  const normalized = asText(value).toLowerCase();
  return !["false", "0", "no", "hidden"].includes(normalized);
}

export function safeUrl(value: unknown, allowMailto = true) {
  const input = asText(value);
  if (!input) return "";
  try {
    const url = new URL(input);
    return ["https:", "http:", ...(allowMailto ? ["mailto:"] : [])].includes(url.protocol)
      ? input
      : "";
  } catch {
    return "";
  }
}

function safeEmail(value: unknown) {
  const email = asText(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function parseSheetDate(value: unknown) {
  const input = asText(value);
  const gvizDate = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/.exec(input);
  if (gvizDate) {
    return new Date(Date.UTC(
      Number(gvizDate[1]),
      Number(gvizDate[2]),
      Number(gvizDate[3]),
    ));
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMonth(value: unknown) {
  const date = parseSheetDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : asText(value);
}

function visibleRows(rows: SheetRow[]) {
  return rows.filter((row) => isVisible(row.visible));
}

function byOrder<T extends { display_order: number }>(items: T[]) {
  return items.sort((a, b) => a.display_order - b.display_order);
}

export function normalizeSettings(rows: SheetRow[]): Settings {
  const settings = { ...sampleSettings };
  for (const row of rows) {
    const key = asText(row.key) as keyof Settings;
    if (settingsKeys.has(key)) settings[key] = asText(row.value);
  }
  settings.hero_image_url = safeUrl(settings.hero_image_url, false);
  settings.contact_email = safeEmail(settings.contact_email);
  return settings;
}

export function normalizeNews(rows: SheetRow[]): NewsItem[] {
  return visibleRows(rows)
    .map((row) => ({
      month: asText(row.month),
      content: asText(row.content),
      link_label: asText(row.link_label),
      link_url: safeUrl(row.link_url),
    }))
    .filter((item) => item.content)
    .sort((a, b) => {
      const aTime = parseSheetDate(a.month)?.getTime() ?? 0;
      const bTime = parseSheetDate(b.month)?.getTime() ?? 0;
      return bTime - aTime;
    });
}

export function normalizeProfessor(rows: SheetRow[]): Professor {
  const row = visibleRows(rows)[0];
  if (!row) return { ...sampleProfessor, name: "Professor information coming soon", bio: "" };
  return {
    name: asText(row.name),
    secondary_name: asText(row.secondary_name),
    photo_url: safeUrl(row.photo_url, false),
    title: asText(row.title),
    affiliation: asText(row.affiliation),
    email: safeEmail(row.email),
    personal_url: safeUrl(row.personal_url),
    cv_url: safeUrl(row.cv_url),
    scholar_url: safeUrl(row.scholar_url),
    bio: asText(row.bio),
  };
}

export function normalizeProfessorDetails(rows: SheetRow[]): ProfessorDetail[] {
  return byOrder(
    visibleRows(rows)
      .map((row) => ({
        section: asText(row.section),
        display_order: asOrder(row.display_order),
        content: asText(row.content),
        subtext: asText(row.subtext),
        link_label: asText(row.link_label),
        link_url: safeUrl(row.link_url),
      }))
      .filter((item) => item.section && item.content),
  );
}

export function normalizeStudents(rows: SheetRow[]): Student[] {
  const groupOrder = new Map<string, number>();
  const students = visibleRows(rows)
    .map((row) => ({
      group: asText(row.group),
      display_order: asOrder(row.display_order),
      name: asText(row.name),
      secondary_name: asText(row.secondary_name),
      photo_url: safeUrl(row.photo_url, false),
      status: asText(row.status),
      affiliation: asText(row.affiliation),
      email: safeEmail(row.email),
      personal_url: safeUrl(row.personal_url),
      cv_url: safeUrl(row.cv_url),
      scholar_url: safeUrl(row.scholar_url),
      research_topics: asText(row.research_topics),
    }))
    .filter((item) => item.name);

  for (const student of students) {
    if (!groupOrder.has(student.group)) groupOrder.set(student.group, groupOrder.size);
  }

  return students.sort((a, b) =>
    (groupOrder.get(a.group) ?? 0) - (groupOrder.get(b.group) ?? 0) ||
    a.display_order - b.display_order,
  );
}

export function normalizeAlumni(rows: SheetRow[]): Alumni[] {
  return byOrder(
    visibleRows(rows)
      .map((row) => ({
        display_order: asOrder(row.display_order),
        name: asText(row.name),
        secondary_name: asText(row.secondary_name),
        photo_url: safeUrl(row.photo_url, false),
        degree: asText(row.degree),
        period: asText(row.period),
        current_position: asText(row.current_position),
        personal_url: safeUrl(row.personal_url),
      }))
      .filter((item) => item.name),
  );
}

export function normalizeResearch(rows: SheetRow[]): ResearchItem[] {
  return byOrder(
    visibleRows(rows)
      .map((row) => ({
        display_order: asOrder(row.display_order),
        title: asText(row.title),
        summary: asText(row.summary),
        details: asText(row.details),
        image_url: safeUrl(row.image_url, false),
        image_alt: asText(row.image_alt),
        link_label: asText(row.link_label),
        link_url: safeUrl(row.link_url),
      }))
      .filter((item) => item.title),
  );
}

export function normalizePublications(rows: SheetRow[]): Publication[] {
  const categoryOrder = new Map<string, number>();
  const publications = visibleRows(rows)
    .map((row) => ({
      category: asText(row.category) || "Other",
      year: Number(row.year) || 0,
      display_order: asOrder(row.display_order),
      venue: asText(row.venue),
      title: asText(row.title),
      authors: asText(row.authors),
      paper_url: safeUrl(row.paper_url),
      project_url: safeUrl(row.project_url),
      code_url: safeUrl(row.code_url),
      video_url: safeUrl(row.video_url),
    }))
    .filter((item) => item.title);

  for (const publication of publications) {
    if (!categoryOrder.has(publication.category)) categoryOrder.set(publication.category, categoryOrder.size);
  }

  return publications.sort((a, b) =>
    (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) ||
    b.year - a.year ||
    a.display_order - b.display_order,
  );
}

export function normalizeProfessorPublications(rows: SheetRow[]) {
  const categoryOrder = new Map<string, number>();
  const publications = visibleRows(rows)
    .map((row) => ({
      category: asText(row.category) || "Other",
      display_order: asOrder(asText(row.order ?? row.display_order) || undefined),
      content: asText(row.content ?? row.title),
    }))
    .filter((item) => item.content);

  for (const publication of publications) {
    if (!categoryOrder.has(publication.category)) categoryOrder.set(publication.category, categoryOrder.size);
  }
  return publications.sort((a, b) =>
    (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) ||
    a.display_order - b.display_order,
  );
}

async function fetchSheet(sheetId: string, tab: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(sheetId)) throw new Error("Invalid Google Sheet ID");
  const url =
    "https://docs.google.com/spreadsheets/d/" + sheetId + "/gviz/tq?" +
    new URLSearchParams({ tqx: "out:json", sheet: tab, headers: "1" });
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheets request failed (" + response.status + ")");
  return parseGvizResponse(await response.text());
}

async function loadTab<T>(
  tab: string,
  normalize: (rows: SheetRow[]) => T,
  sample: T,
): Promise<DataResult<T>> {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (sheetId) {
    try {
      return { data: normalize(await fetchSheet(sheetId, tab)), demo: false };
    } catch (error) {
      console.warn("Using sample data for " + tab + ":", error);
      return { data: sample, demo: true };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const { readLocalTab } = await import("./local-content.ts");
      return { data: normalize(readLocalTab(tab)), demo: false };
    } catch (error) {
      console.warn("Could not read local workbook for " + tab + ":", error);
    }
  }

  return { data: sample, demo: true };
}

export const loadSettings = () => loadTab("Settings", normalizeSettings, sampleSettings);
export const loadNews = () => loadTab("News", normalizeNews, sampleNews);
export const loadProfessor = () => loadTab("Professor", normalizeProfessor, sampleProfessor);
export const loadProfessorDetails = () =>
  loadTab(
    "ProfessorDetails",
    normalizeProfessorDetails,
    sampleProfessorDetails,
  );
export const loadStudents = () => loadTab("Students", normalizeStudents, sampleStudents);
export const loadAlumni = () => loadTab("Alumni", normalizeAlumni, sampleAlumni);
export const loadResearch = () => loadTab("Research", normalizeResearch, sampleResearch);
export const loadPublications = () =>
  loadTab("Publications", normalizePublications, samplePublications);
export const loadProfessorPublications = () =>
  loadTab("ProfessorPublications", normalizeProfessorPublications, sampleProfessorPublications);
