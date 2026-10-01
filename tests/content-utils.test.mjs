import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatText, plainText } from "../app/lib/format-text.ts";
import {
  formatMonth,
  isVisible,
  loadSettings,
  loadProfessorPublications,
  loadPublications,
  normalizeNews,
  normalizeProfessorPublications,
  normalizePublications,
  normalizeStudents,
  parseGvizResponse,
  safeUrl,
} from "../app/lib/content.ts";
import { readXlsxSheet } from "../app/lib/xlsx.ts";

const workbook = new URL(
  "../outputs/eusun-han-lab/Eusun-Han-Lab-content-template.xlsx",
  import.meta.url,
);

test("renders inline bold safely and removes markers from plain-text attributes", () => {
  const cases = [
    ["", ""],
    ["Plain text", "Plain text"],
    ["Accepted at **NeurIPS 2026**.", "Accepted at <strong>NeurIPS 2026</strong>."],
    ["**홍길동**, **Eusun Han**", "<strong>홍길동</strong>, <strong>Eusun Han</strong>"],
    ["**First****Second**", "<strong>First</strong><strong>Second</strong>"],
    ["**First**\r\n**Second**", "<strong>First</strong>\r\n<strong>Second</strong>"],
    ["Unclosed **bold", "Unclosed **bold"],
    ["**** empty", "**** empty"],
    ["**Across\nlines**", "**Across\nlines**"],
    ["<script> & **<b>text</b>**", "&lt;script&gt; &amp; <strong>&lt;b&gt;text&lt;/b&gt;</strong>"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(renderToStaticMarkup(createElement("p", null, formatText(input))), `<p>${expected}</p>`);
  }
  assert.equal(plainText("**Lab**: **Research**"), "Lab: Research");
  assert.equal(plainText("**Unclosed"), "**Unclosed");
});

test("renders inline links and bold safely, including the supplied publication citation", () => {
  const link = (label, href) => `<a href="${href}" target="_blank" rel="noreferrer noopener">${label}</a>`;
  const cases = [
    ["[DOI](https://doi.org/example)", link("DOI", "https://doi.org/example")],
    ["[**Han E**](https://example.com)", link("<strong>Han E</strong>", "https://example.com")],
    ["**[DOI](https://example.com)**", `<strong>${link("DOI", "https://example.com")}</strong>`],
    ["[Paper](https://example.com/paper(2027))", link("Paper", "https://example.com/paper(2027)")],
    ["[Email](mailto:lab@example.org)", '<a href="mailto:lab@example.org">Email</a>'],
    ["[Bad](javascript:alert(1))", "[Bad](javascript:alert(1))"],
    ["[Bad](data:text/html,evil)", "[Bad](data:text/html,evil)"],
    ["[Incomplete](https://example.com", "[Incomplete](https://example.com"],
    ["<script> [<b>Paper</b>](https://example.com?a=1&b=2)", "&lt;script&gt; " + link("&lt;b&gt;Paper&lt;/b&gt;", "https://example.com?a=1&amp;b=2")],
  ];
  for (const [input, expected] of cases) {
    assert.equal(renderToStaticMarkup(createElement("p", null, formatText(input, true))), `<p>${expected}</p>`);
  }
  const citation = "Zhang Y, Richetti J, Vogeler I, Cammarano D, **Han E** (2027) Requirements and challenges of process-based modeling for intermediate wheatgrass, a perennial cereal. European Journal of Agronomy 182:128350. [https://doi.org/10.1016/j.eja.2026.128350](https://doi.org/10.1016/j.eja.2026.128350)";
  const html = renderToStaticMarkup(createElement("li", null, formatText(citation, true)));
  assert.match(html, /<strong>Han E<\/strong> \(2027\)/);
  assert.ok(html.includes(link("https://doi.org/10.1016/j.eja.2026.128350", "https://doi.org/10.1016/j.eja.2026.128350")));
  assert.equal(plainText("**Read [DOI](https://example.com)**"), "Read DOI");
  assert.equal(renderToStaticMarkup(createElement("a", { href: "https://example.com" }, formatText("[**Paper**](https://example.com)"))), '<a href="https://example.com">[<strong>Paper</strong>](https://example.com)</a>');
});

test("parses Google Visualization rows using row-one headers", () => {
  const source = 'google.visualization.Query.setResponse({"status":"ok","table":{"cols":[{"label":"Display Order"},{"label":"Name"}],"rows":[{"c":[{"v":2},{"v":"Ada"}]}]}});';
  assert.deepEqual(parseGvizResponse(source), [{ display_order: 2, name: "Ada" }]);
});

test("formats Google date values and sorts visible news newest first", () => {
  const news = normalizeNews([
    { month: "Date(2025,0,1)", content: "Older", visible: true },
    { month: "Date(2026,8,1)", content: "Newest", visible: "" },
    { month: "Date(2027,0,1)", content: "Hidden", visible: false },
  ]);
  assert.equal(formatMonth(news[0].month), "Sep 2026");
  assert.deepEqual(news.map((item) => item.content), ["Newest", "Older"]);
});

test("orders members and rejects unsafe links", () => {
  const students = normalizeStudents([
    { group: "Undergraduate", display_order: 2, name: "Second", personal_url: "javascript:alert(1)" },
    { group: "Visiting", display_order: 1, name: "Visitor" },
    { group: "Undergraduate", display_order: 1, name: "First", personal_url: "https://example.com" },
    { group: "Graduate", display_order: 1, name: "Graduate" },
  ]);
  assert.deepEqual(students.map((student) => student.name), ["First", "Second", "Visitor", "Graduate"]);
  assert.equal(students[0].personal_url, "https://example.com");
  assert.equal(students[1].personal_url, "");
  assert.equal(safeUrl("data:text/html,hello"), "");
  assert.equal(isVisible("FALSE"), false);
  assert.equal(isVisible(""), true);
});

test("orders publication groups by their first XLSX row", () => {
  const publications = normalizePublications([
    { category: "Journal", year: 2024, display_order: 2, title: "Older Journal" },
    { category: "International Conference", year: 2026, display_order: 1, title: "Conference" },
    { category: "Journal", year: 2025, display_order: 1, title: "Newer Journal" },
  ]);

  assert.deepEqual(publications.map((publication) => publication.title), [
    "Newer Journal",
    "Older Journal",
    "Conference",
  ]);
});

test("reads the local XLSX content source", async () => {
  const bytes = new Uint8Array(await readFile(workbook));
  const settings = readXlsxSheet(bytes, "Settings");
  const news = readXlsxSheet(bytes, "News");

  const labName = settings.find((row) => row.key === "lab_name");
  assert.equal(typeof labName?.value, "string");
  assert.ok(labName.value);
  assert.ok(Array.isArray(news));
});

test("uses the local XLSX when GOOGLE_SHEET_ID is empty locally", async () => {
  const previousSheetId = process.env.GOOGLE_SHEET_ID;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.GOOGLE_SHEET_ID = "";
  process.env.NODE_ENV = "development";

  try {
    const settings = readXlsxSheet(new Uint8Array(await readFile(workbook)), "Settings");
    const expected = settings.find((row) => row.key === "lab_name")?.value;
    const result = await loadSettings();
    assert.equal(result.data.lab_name, expected);
    assert.equal(result.demo, false);
  } finally {
    if (previousSheetId === undefined) delete process.env.GOOGLE_SHEET_ID;
    else process.env.GOOGLE_SHEET_ID = previousSheetId;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("uses Google Sheets when GOOGLE_SHEET_ID is set locally", async () => {
  const previousSheetId = process.env.GOOGLE_SHEET_ID;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_SHEET_ID = "sheet-id";
  globalThis.fetch = async () => new Response(
    'google.visualization.Query.setResponse({"status":"ok","table":{"cols":[{"label":"key"},{"label":"value"}],"rows":[{"c":[{"v":"lab_name"},{"v":"Google Sheet Lab"}]}]}});',
  );

  try {
    const result = await loadSettings();
    assert.equal(result.data.lab_name, "Google Sheet Lab");
    assert.equal(result.demo, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSheetId === undefined) delete process.env.GOOGLE_SHEET_ID;
    else process.env.GOOGLE_SHEET_ID = previousSheetId;
  }
});

test("loads complete professor citations from their own tab with ordering and visibility", async () => {
  const previousSheetId = process.env.GOOGLE_SHEET_ID;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_SHEET_ID = "sheet-id";
  globalThis.fetch = async (url) => {
    const sheet = new URL(url).searchParams.get("sheet");
    const rows = sheet === "ProfessorPublications" ? [
      { category: "Journal", content: "Second paper by **Professor** (2027). [DOI](https://example.com)", order: 2, visible: true },
      { category: "Conference", content: "Conference paper", order: 0, visible: true },
      { category: "Journal", content: "First professor paper (2024)", order: 1, visible: true },
      { category: "Hidden", content: "Hidden professor paper", order: 0, visible: false },
      { category: "Empty", content: "", order: 0, visible: true },
    ] : [{ title: "Lab paper", category: "Journal", year: 2025, visible: true }];
    const headers = sheet === "ProfessorPublications"
      ? ["category", "content", "order", "visible"]
      : ["title", "category", "year", "authors", "visible"];
    return new Response("google.visualization.Query.setResponse(" + JSON.stringify({
      status: "ok",
      table: {
        cols: headers.map((label) => ({ label })),
        rows: rows.map((row) => ({ c: headers.map((header) => ({ v: row[header] ?? "" })) })),
      },
    }) + ");");
  };

  try {
    const [professor, lab] = await Promise.all([loadProfessorPublications(), loadPublications()]);
    assert.equal(professor.demo, false);
    assert.deepEqual(professor.data.map((item) => item.content), [
      "First professor paper (2024)", "Second paper by **Professor** (2027). [DOI](https://example.com)", "Conference paper",
    ]);
    assert.deepEqual(professor.data.map((item) => item.category), ["Journal", "Journal", "Conference"]);
    assert.deepEqual(lab.data.map((item) => item.title), ["Lab paper"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSheetId === undefined) delete process.env.GOOGLE_SHEET_ID;
    else process.env.GOOGLE_SHEET_ID = previousSheetId;
  }
});

test("accepts existing title cells and preserves sheet order when no order is specified", () => {
  const citations = normalizeProfessorPublications([
    { title: "Existing title cell" },
    { content: "New content cell" },
    { content: "", title: "Ignore an explicitly empty content cell" },
  ]);
  assert.deepEqual(citations.map((item) => item.content), ["Existing title cell", "New content cell"]);
});

test("prefers order over display_order and places unspecified orders last within each category", () => {
  const citations = normalizeProfessorPublications([
    { category: "Journal", content: "Unspecified first", order: "" },
    { category: "Journal", content: "Legacy order", display_order: 2 },
    { category: "Journal", content: "Preferred order", order: 1, display_order: 99 },
    { category: "Journal", content: "Unspecified second" },
  ]);
  assert.deepEqual(citations.map((item) => item.content), ["Preferred order", "Legacy order", "Unspecified first", "Unspecified second"]);
});
