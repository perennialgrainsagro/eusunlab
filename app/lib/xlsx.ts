import { strFromU8, unzipSync } from "fflate";
import type { SheetRow } from "./types.ts";

type Files = Record<string, Uint8Array>;

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attributes(source: string) {
  return Object.fromEntries(
    [...source.matchAll(/([\w:.-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1],
      decodeXml(match[2] ?? match[3] ?? ""),
    ]),
  );
}

function xml(files: Files, path: string) {
  const value = files[path];
  if (!value) throw new Error(`Missing XLSX entry: ${path}`);
  return strFromU8(value);
}

function textNodes(source: string) {
  return [...source.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function columnIndex(reference: string) {
  return [...reference.replace(/\d/g, "")].reduce(
    (total, letter) => total * 26 + letter.toUpperCase().charCodeAt(0) - 64,
    0,
  ) - 1;
}

function excelDate(serial: number) {
  return new Date((serial - 25569) * 86_400_000).toISOString().slice(0, 10);
}

function sheetPath(files: Files, name: string) {
  const workbook = xml(files, "xl/workbook.xml");
  const sheet = [...workbook.matchAll(/<sheet\b([^>]*)\/?\s*>/g)]
    .map((match) => attributes(match[1]))
    .find((item) => item.name === name);
  if (!sheet?.["r:id"]) throw new Error(`Missing XLSX sheet: ${name}`);

  const relationships = xml(files, "xl/_rels/workbook.xml.rels");
  const relationship = [...relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
    .map((match) => attributes(match[1]))
    .find((item) => item.Id === sheet["r:id"]);
  if (!relationship?.Target) throw new Error(`Missing XLSX relationship: ${name}`);

  const target = relationship.Target.replace(/^\/+/, "").replace(/^\.\//, "");
  return target.startsWith("xl/") ? target : `xl/${target}`;
}

function sharedStrings(files: Files) {
  const source = files["xl/sharedStrings.xml"];
  if (!source) return [];
  return [...strFromU8(source).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
    .map((match) => textNodes(match[1]));
}

function cellValue(body: string, type: string | undefined, strings: string[]) {
  if (type === "inlineStr") return textNodes(body);
  const value = decodeXml(/<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
  if (type === "s") return strings[Number(value)] ?? "";
  if (type === "b") return value === "1";
  if (type === "d" || type === "str" || type === "e") return value;
  if (!value) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

// ponytail: this covers the cell types used by the lab workbook; use a full
// XLSX library if formulas, macros, or rich-cell content become requirements.
export function readXlsxSheet(bytes: Uint8Array, sheetName: string): SheetRow[] {
  const files = unzipSync(bytes);
  const worksheet = xml(files, sheetPath(files, sheetName));
  const strings = sharedStrings(files);
  const rows = [...worksheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const values: unknown[] = [];
    const cellPattern = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    for (const cell of row[1].matchAll(cellPattern)) {
      const attrs = attributes(cell[1] ?? cell[2] ?? "");
      values[columnIndex(attrs.r)] = cellValue(cell[3] ?? "", attrs.t, strings);
    }
    return values;
  });

  const headers = (rows.shift() ?? []).map((value) => String(value ?? "").trim());
  if (!headers.length || headers.some((header) => !header)) {
    throw new Error(`Every column in ${sheetName} needs a row-one header`);
  }

  return rows.map((row) => Object.fromEntries(headers.map((header, index) => {
    const value = row[index] ?? "";
    return [header, header === "month" && typeof value === "number" ? excelDate(value) : value];
  })));
}
