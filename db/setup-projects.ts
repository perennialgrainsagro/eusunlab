import nextEnv from "@next/env";
import { database } from "../app/lib/database.ts";
import { sampleProjects } from "../app/lib/sample-data.ts";
import { validateRows } from "../app/lib/content-schema.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
const rows = validateRows("Projects", sampleProjects.map((item) => ({ ...item, visible: true })));
const added = await database().query(
  "INSERT INTO site_content (tab, rows) VALUES ('Projects', $1::jsonb) ON CONFLICT (tab) DO NOTHING RETURNING tab",
  [JSON.stringify(rows)],
);
console.log(added.length ? "Projects created with two editable examples." : "Projects already exists; existing content was kept.");
