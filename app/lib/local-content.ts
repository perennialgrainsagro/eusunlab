import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readXlsxSheet } from "./xlsx.ts";

const workbookPath = join(
  process.cwd(),
  "outputs/eusun-han-lab/Eusun-Han-Lab-content-template.xlsx",
);

export function readLocalTab(tab: string) {
  return readXlsxSheet(readFileSync(workbookPath), tab);
}
