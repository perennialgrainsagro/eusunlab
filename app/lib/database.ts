import { neon, NeonDbError } from "@neondatabase/serverless";
import type { ContentRecord, ContentTab } from "./content-schema.ts";
import type { BlogPost, BlogInput } from "./blog.ts";
import type { SheetRow } from "./types.ts";

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url, { fetchOptions: { cache: "no-store" } });
}

export async function readContent(tab: ContentTab): Promise<ContentRecord> {
  const [record] = await database().query("SELECT tab, rows, options, updated_at::text FROM site_content WHERE tab = $1", [tab]);
  if (!record) throw new Error("Missing database content. Run npm run db:migrate.");
  return record as ContentRecord;
}

export async function readAllContent(): Promise<ContentRecord[]> {
  return await database().query("SELECT tab, rows, options, updated_at::text FROM site_content ORDER BY tab") as ContentRecord[];
}

export async function saveContent(tab: ContentTab, rows: SheetRow[], updatedAt: string, options?: string[]) {
  const [record] = await database().query(
    "UPDATE site_content SET rows = $2::jsonb, options = COALESCE($4::jsonb, options), updated_at = clock_timestamp() WHERE tab = $1 AND updated_at = $3::timestamptz RETURNING tab, rows, options, updated_at::text",
    [tab, JSON.stringify(rows), updatedAt, options === undefined ? null : JSON.stringify(options)],
  );
  return record as ContentRecord | undefined;
}

export async function listPosts(includeDrafts = false, limit?: number): Promise<BlogPost[]> {
  if (process.env.CONTENT_SOURCE === "sample" || !process.env.DATABASE_URL) return [];
  return await database().query(
    "SELECT id, slug, title, writer_name, excerpt, main_image_url, main_image_alt, published, published_at::text, created_at::text, updated_at::text FROM blog_posts WHERE ($1::boolean OR published) ORDER BY COALESCE(published_at, created_at) DESC LIMIT $2",
    [includeDrafts, limit ?? null],
  ) as BlogPost[];
}

export async function readPost(identifier: string, includeDrafts = false): Promise<BlogPost | undefined> {
  if (process.env.CONTENT_SOURCE === "sample" || !process.env.DATABASE_URL) return undefined;
  const [post] = await database().query(
    "SELECT *, published_at::text, created_at::text, updated_at::text FROM blog_posts WHERE " +
    (includeDrafts ? "id::text" : "slug") + " = $1 AND ($2::boolean OR published)",
    [identifier, includeDrafts],
  );
  return post as BlogPost | undefined;
}

async function saveWithUniqueSlug<T>(slug: string, save: (candidate: string) => Promise<T>): Promise<T> {
  // ponytail: one-admin blog; batch suffix lookup if repeated collisions become frequent.
  for (let suffix = 1; ; suffix++) {
    const ending = "-" + suffix;
    const candidate = suffix === 1 ? slug : slug.slice(0, 120 - ending.length).replace(/[-\uD800-\uDBFF]+$/u, "") + ending;
    try { return await save(candidate); }
    catch (error) {
      if (!(error instanceof NeonDbError) || error.code !== "23505" || error.constraint !== "blog_posts_slug_key") throw error;
    }
  }
}

export async function createPost(post: BlogInput): Promise<BlogPost> {
  return saveWithUniqueSlug(post.slug, async (slug) => {
    const [record] = await database().query(
      "INSERT INTO blog_posts (slug, title, writer_name, excerpt, body, published, main_image_url, main_image_alt, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $6 THEN now() END) RETURNING *, updated_at::text",
      [slug, post.title, post.writer_name, post.excerpt, post.body, post.published, post.main_image_url, post.main_image_alt],
    );
    return record as BlogPost;
  });
}

export async function updatePost(id: string, post: BlogInput, updatedAt: string): Promise<BlogPost | undefined> {
  return saveWithUniqueSlug(post.slug, async (slug) => {
    const [record] = await database().query(
      "UPDATE blog_posts SET slug = $2, title = $3, writer_name = $4, excerpt = $5, body = $6, published = $7, main_image_url = $9, main_image_alt = $10, published_at = CASE WHEN $7 THEN COALESCE(published_at, now()) ELSE published_at END, updated_at = clock_timestamp() WHERE id::text = $1 AND updated_at = $8::timestamptz RETURNING *, updated_at::text",
      [id, slug, post.title, post.writer_name, post.excerpt, post.body, post.published, updatedAt, post.main_image_url, post.main_image_alt],
    );
    return record as BlogPost | undefined;
  });
}

export async function deletePost(id: string, updatedAt: string) {
  const rows = await database().query("DELETE FROM blog_posts WHERE id::text = $1 AND updated_at = $2::timestamptz RETURNING id", [id, updatedAt]);
  return rows.length > 0;
}

export async function storeImage(contentType: string, bytes: Buffer) {
  // ponytail: small lab image library, move media to object storage if its size grows.
  const [record] = await database().query(
    "INSERT INTO media (content_type, data) VALUES ($1, decode($2, 'base64')) RETURNING id",
    [contentType, bytes.toString("base64")],
  );
  return String(record.id);
}

export async function readImage(id: string) {
  const [record] = await database().query("SELECT content_type, encode(data, 'base64') AS data FROM media WHERE id::text = $1", [id]);
  return record as { content_type: string; data: string } | undefined;
}

export async function takeLoginAttempt(key: string) {
  const [record] = await database().query(
    "INSERT INTO admin_login_attempts (key, attempts) VALUES ($1, 1) ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN admin_login_attempts.started_at < now() - interval '15 minutes' THEN 1 ELSE admin_login_attempts.attempts + 1 END, started_at = CASE WHEN admin_login_attempts.started_at < now() - interval '15 minutes' THEN now() ELSE admin_login_attempts.started_at END RETURNING attempts",
    [key],
  );
  return Number(record.attempts) <= 10;
}

export async function clearLoginAttempts(key: string) {
  await database().query("DELETE FROM admin_login_attempts WHERE key = $1", [key]);
}
