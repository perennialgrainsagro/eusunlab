import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";
import nextEnv from "@next/env";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { hashPassword } from "../app/lib/admin-auth.ts";
import { database } from "../app/lib/database.ts";
import { choiceField, contentOptions } from "../app/lib/content-schema.ts";
import { isVisible } from "../app/lib/content.ts";
import { formatText } from "../app/lib/format-text.ts";

test("Neon admin login, content edits, image upload, and blog publishing work end to end", { skip: process.env.RUN_DB_TESTS !== "1", timeout: 60000 }, async () => {
  nextEnv.loadEnvConfig(process.cwd(), true);
  assert.ok(process.env.DATABASE_URL, "Configure DATABASE_URL before running database tests.");
  const listener = createServer().listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const origin = "http://127.0.0.1:" + port;
  const password = randomBytes(20).toString("hex");
  const passwordHash = hashPassword(password);
  const sessionSecret = randomBytes(32).toString("hex");
  const attemptKey = createHmac("sha256", sessionSecret).update("local").digest("hex");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, CONTENT_SOURCE: "database", GOOGLE_SHEET_ID: "", ADMIN_USERNAME: "test-admin", ADMIN_PASSWORD_HASH: passwordHash, ADMIN_SESSION_SECRET: sessionSecret },
    stdio: ["ignore", "ignore", "ignore"],
  });
  let cookie = "";
  let post;
  let mediaId;
  let savedContent;
  let originalContent;
  const temporaryPostIds = [];
  const optionEdits = [];
  const id = randomBytes(8).toString("hex");
  const request = (path, method = "GET", body, customOrigin = origin) => fetch(origin + path, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: customOrigin, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(origin + "/admin")).ok) break; } catch { /* Server is still starting. */ }
      if (attempt === 99) throw new Error("The test server did not start.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const protectedRequests = [
      ["/api/admin/content/News", "GET"],
      ["/api/admin/content/News", "PUT"],
      ["/api/admin/posts", "POST"],
      ["/api/admin/posts/missing-post", "GET"],
      ["/api/admin/posts/missing-post", "PUT"],
      ["/api/admin/posts/missing-post", "DELETE"],
      ["/api/admin/media", "POST"],
      ["/api/admin/logout", "POST"],
    ];
    for (const [path, method] of protectedRequests) {
      assert.equal((await request(path, method, method === "GET" ? undefined : {})).status, 401, "Reject unauthenticated admin requests.");
      const forged = await fetch(origin + path, { method, headers: { Cookie: "lab_admin=invalid", Origin: origin, "Content-Type": "application/json" }, ...(method === "GET" ? {} : { body: "{}" }) });
      assert.equal(forged.status, 401, "Reject forged sessions on every admin endpoint.");
    }
    assert.equal((await request("/api/admin/login", "POST", { username: "test-admin", password }, "https://untrusted.example")).status, 403);
    assert.equal((await request("/api/admin/login", "POST", { username: "test-admin", password: "wrong" })).status, 401);
    const login = await request("/api/admin/login", "POST", { username: "test-admin", password });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(login.headers.get("set-cookie"), /SameSite=lax/i);
    cookie = login.headers.get("set-cookie").split(";")[0];
    const secureLogin = await fetch(origin + "/api/admin/login", { method: "POST", headers: { Origin: origin.replace("http:", "https:"), "X-Forwarded-Proto": "https", "Content-Type": "application/json" }, body: JSON.stringify({ username: "test-admin", password }) });
    assert.equal(secureLogin.status, 200);
    assert.match(secureLogin.headers.get("set-cookie"), /; Secure\b/i, "HTTPS deployments must use a Secure session cookie.");
    for (const [path, method] of protectedRequests.filter(([, method]) => method !== "GET")) {
      assert.equal((await request(path, method, {}, "https://untrusted.example")).status, 403, "Reject foreign-origin writes even with a valid admin session.");
    }
    assert.equal((await fetch(origin + "/api/admin/posts", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: "{}" })).status, 403, "Reject writes without an Origin header.");
    const dashboardResponse = await request("/admin");
    assert.match(dashboardResponse.headers.get("cache-control"), /private.*no-store/);
    const dashboard = await dashboardResponse.text();
    for (const secret of [password, passwordHash, process.env.DATABASE_URL, sessionSecret]) assert.ok(!dashboard.includes(secret), "Do not serialize credentials into dashboard HTML.");
    assert.match(dashboard, /Content dashboard/);
    assert.match(dashboard, /Professor publications/);
    originalContent = await (await request("/api/admin/content/News")).json();
    const marker = "Temporary integration test " + id;
    const editedRows = [...originalContent.rows, { month: "2026-10-05", content: marker, link_label: "", link_url: "", visible: true }];
    assert.equal((await request("/api/admin/content/News", "PUT", { rows: editedRows, updated_at: originalContent.updated_at }, "https://untrusted.example")).status, 403);
    const save = await request("/api/admin/content/News", "PUT", { rows: editedRows, updated_at: originalContent.updated_at });
    assert.equal(save.status, 200);
    savedContent = await save.json();
    assert.ok((await (await request("/")).text()).includes(marker), "Public Home must read the saved database content.");
    assert.equal((await request("/api/admin/content/News", "PUT", { rows: editedRows, updated_at: originalContent.updated_at })).status, 409);
    const restored = await request("/api/admin/content/News", "PUT", { rows: originalContent.rows, updated_at: savedContent.updated_at });
    assert.equal(restored.status, 200);
    savedContent = undefined;
    assert.ok(!(await (await request("/")).text()).includes(marker));
    for (const tab of ["Students", "Publications"]) {
      const path = "/api/admin/content/" + tab;
      const original = await (await request(path)).json();
      const options = contentOptions(original);
      const addedOptions = [...options, "Temporary choice " + id];
      const input = { rows: original.rows, options: addedOptions, updated_at: original.updated_at };
      assert.equal((await request(path, "PUT", input, "https://untrusted.example")).status, 403);
      assert.equal((await request(path, "PUT", { ...input, options: [...options, options[0]] })).status, 400);
      assert.equal((await request(path, "PUT", { ...input, options: options.filter((option) => option !== options[0]) })).status, 400, "Prevent removing names still used by content.");
      const rows = original.rows.map((row, index) => index ? row : { ...row, [choiceField(tab)]: "Unregistered choice" });
      assert.equal((await request(path, "PUT", { ...input, rows })).status, 400);
      const added = await request(path, "PUT", input);
      assert.equal(added.status, 200);
      const edit = { original, saved: await added.json() };
      optionEdits.push(edit);
      assert.deepEqual((await (await request(path)).json()).options, addedOptions, "Unused choices must survive reloads.");
      assert.equal((await request(path, "PUT", input)).status, 409);
      const reorderedOptions = [...addedOptions].reverse();
      const reordered = await request(path, "PUT", { rows: original.rows, options: reorderedOptions, updated_at: edit.saved.updated_at });
      assert.equal(reordered.status, 200);
      edit.saved = await reordered.json();
      assert.deepEqual((await (await request(path)).json()).options, reorderedOptions, "Save the explicit catalog order.");
      const publicHtml = await (await request(tab === "Students" ? "/members/students" : "/publications")).text();
      const headings = reorderedOptions.filter((name) => original.rows.some((row) => String(row[choiceField(tab)] ?? "").trim() === name && isVisible(row.visible) && row[tab === "Students" ? "name" : "title"]));
      let previousHeading = -1;
      for (const name of headings) {
        const position = publicHtml.indexOf("<h2>" + renderToStaticMarkup(formatText(name)) + "</h2>");
        assert.ok(position > previousHeading, "Public section headings must follow the saved catalog order.");
        previousHeading = position;
      }
      assert.ok(!publicHtml.includes("<h2>Temporary choice " + id + "</h2>"), "Unused choices do not add empty sections.");
      const removed = await request(path, "PUT", { rows: original.rows, options, updated_at: edit.saved.updated_at });
      assert.equal(removed.status, 200);
      edit.saved = await removed.json();
      assert.deepEqual(edit.saved.options, options, "Unused choices can be deleted without changing content.");
    }
    const png = await sharp({ create: { width: 2400, height: 1800, channels: 4, background: { r: 12, g: 110, b: 25, alpha: 0.4 } } }).png().toBuffer();
    const upload = new FormData();
    upload.set("file", new File([png], "test.png", { type: "image/png" }));
    const image = await fetch(origin + "/api/admin/media", { method: "POST", headers: { Cookie: cookie, Origin: origin }, body: upload });
    assert.equal(image.status, 201);
    const imageUrl = (await image.json()).url;
    mediaId = imageUrl.split("/").at(-1);
    const servedImage = await request(imageUrl);
    assert.equal(servedImage.status, 200);
    assert.equal(servedImage.headers.get("content-type"), "image/webp");
    const servedBytes = Buffer.from(await servedImage.arrayBuffer());
    assert.ok(servedBytes.length < png.length, "Serve the optimized bytes stored in PostgreSQL.");
    const metadata = await sharp(servedBytes).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1600, 1200, true]);
    const svg = new FormData();
    svg.set("file", new File(["<svg onload='alert(1)'></svg>"], "bad.svg", { type: "image/svg+xml" }));
    assert.equal((await fetch(origin + "/api/admin/media", { method: "POST", headers: { Cookie: cookie, Origin: origin }, body: svg })).status, 400);
    const input = { title: "Temporary blog test " + id, writer_name: "Test writer " + id, slug: "integration-" + id, excerpt: "Test summary", main_image_url: imageUrl, main_image_alt: "Uploaded main image", body: "## Test heading\n\n**Bold content**\n\n![Test image](" + imageUrl + ")\n\n<script>alert('unsafe')</script>", published: false };
    assert.equal((await request("/api/admin/posts", "POST", { ...input, main_image_url: "javascript:alert(1)" })).status, 400);
    const created = await request("/api/admin/posts", "POST", input);
    assert.equal(created.status, 201);
    post = await created.json();
    assert.equal(post.main_image_url, imageUrl);
    assert.equal(post.main_image_alt, input.main_image_alt);
    const duplicates = await Promise.all([0, 1].map(async () => {
      const response = await request("/api/admin/posts", "POST", input);
      assert.equal(response.status, 201, "Save duplicate URLs instead of returning a conflict.");
      const duplicate = await response.json();
      temporaryPostIds.push(duplicate.id);
      return duplicate;
    }));
    assert.deepEqual(duplicates.map((duplicate) => duplicate.slug).sort(), [input.slug + "-2", input.slug + "-3"], "Concurrent duplicate saves each receive a unique numbered URL.");
    const adjustedResponse = await request("/api/admin/posts/" + duplicates[0].id, "PUT", { ...duplicates[0], slug: duplicates[1].slug });
    assert.equal(adjustedResponse.status, 200);
    const adjusted = await adjustedResponse.json();
    assert.equal(adjusted.slug, duplicates[1].slug + "-2", "Editing to another post's URL also adds a suffix.");
    const unchangedResponse = await request("/api/admin/posts/" + adjusted.id, "PUT", adjusted);
    assert.equal(unchangedResponse.status, 200);
    assert.equal((await unchangedResponse.json()).slug, adjusted.slug, "Saving the same post keeps its own URL.");
    assert.equal((await request("/api/admin/posts/" + adjusted.id, "PUT", { ...adjusted, slug: input.slug })).status, 409, "Duplicate handling must preserve stale-edit protection.");
    const longSlug = ("long-" + id + "-" + "x".repeat(120)).slice(0, 117) + "-bc";
    for (let index = 0; index < 2; index++) {
      const response = await request("/api/admin/posts", "POST", { ...input, slug: longSlug });
      assert.equal(response.status, 201);
      const longPost = await response.json();
      temporaryPostIds.push(longPost.id);
      assert.equal(longPost.slug, index ? longSlug.slice(0, 117) + "-2" : longSlug, "Keep suffixed URLs within 120 characters without repeated hyphens.");
    }
    assert.equal((await request("/blog/" + input.slug)).status, 404);
    assert.ok(!(await (await request("/")).text()).includes(input.title), "Keep drafts out of Home previews.");
    assert.ok(!(await (await request("/blog")).text()).includes(input.title), "Keep drafts out of the public list.");
    const previewPath = "/admin/preview/" + post.id;
    const anonymousPreview = await fetch(origin + previewPath);
    assert.equal(anonymousPreview.status, 404);
    assert.ok(!(await anonymousPreview.text()).includes(input.title), "Do not leak the draft to unauthenticated visitors.");
    const forgedPreview = await fetch(origin + previewPath, { headers: { Cookie: "lab_admin=invalid" } });
    assert.equal(forgedPreview.status, 404);
    const preview = await request(previewPath);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("cache-control"), /private.*no-store/);
    const previewHtml = await preview.text();
    assert.ok(previewHtml.includes(input.title));
    assert.ok(previewHtml.includes(input.writer_name));
    assert.ok(previewHtml.includes('alt="Uploaded main image"'));
    assert.match(previewHtml, /<strong>Bold content<\/strong>/);
    assert.match(previewHtml, /<h2>Test heading<\/h2>/);
    assert.doesNotMatch(previewHtml, /<script>alert\('unsafe'\)/);
    assert.match(previewHtml, /Admin preview/);
    assert.match(previewHtml, /noindex, nofollow/);
    assert.equal((await request("/admin/preview/missing-post")).status, 404);
    const published = await request("/api/admin/posts/" + post.id, "PUT", { ...post, published: true });
    assert.equal(published.status, 200);
    post = await published.json();
    const html = await (await request("/blog/" + input.slug)).text();
    assert.match(html, /<strong>Bold content<\/strong>/);
    assert.match(html, /<h2>Test heading<\/h2>/);
    assert.ok(html.includes(input.writer_name), "Show the manually entered writer name.");
    assert.ok(html.includes(imageUrl));
    assert.ok(html.includes('alt="Uploaded main image"'), "Render the uploaded main image on the article.");
    assert.doesNotMatch(html, /<script>alert\('unsafe'\)/);
    const listHtml = await (await request("/blog")).text();
    assert.ok(listHtml.includes(input.title));
    assert.ok(listHtml.includes(imageUrl), "Render the main image on the post list.");
    assert.ok((await (await request("/")).text()).includes(input.title), "Show newly published posts on Home.");
    const recentPosts = [];
    for (let index = 0; index < 4; index++) {
      const response = await request("/api/admin/posts", "POST", { ...input, title: "Recent blog test " + id + " " + index, slug: "integration-recent-" + id + "-" + index, excerpt: "Preview summary " + index, main_image_url: "", published: true });
      assert.equal(response.status, 201);
      const recent = await response.json();
      temporaryPostIds.push(recent.id); recentPosts.unshift(recent);
    }
    const homeHtml = await (await request("/")).text();
    const previews = [...homeHtml.matchAll(/<article class="home-blog-item">([\s\S]*?)<\/article>/g)];
    assert.equal(previews.length, 3, "Home shows at most three posts.");
    for (let index = 0; index < 3; index++) {
      assert.ok(previews[index][1].includes(recentPosts[index].title), "Home orders posts newest first.");
      assert.ok(previews[index][1].includes(recentPosts[index].excerpt), "Include a brief summary.");
      assert.ok(previews[index][1].includes('href="/blog/' + recentPosts[index].slug + '"'), "Preview titles link to the full article.");
    }
    assert.match(homeHtml, /class="home-blog-more"[^>]*href="\/blog"/);
    assert.equal((await request("/api/admin/posts/" + post.id, "PUT", { ...post, title: "Changed", updated_at: "2000-01-01" })).status, 409);
    const externalImage = "https://example.com/main-image.jpg";
    const replaced = await request("/api/admin/posts/" + post.id, "PUT", { ...post, main_image_url: externalImage, main_image_alt: "External main image" });
    assert.equal(replaced.status, 200);
    post = await replaced.json();
    assert.equal((await (await request("/api/admin/posts/" + post.id)).json()).main_image_url, externalImage);
    assert.ok((await (await request("/blog/" + post.slug)).text()).includes(externalImage), "Render a main image from an external URL.");
    assert.ok((await (await request("/blog")).text()).includes(externalImage));
    const unpublished = await request("/api/admin/posts/" + post.id, "PUT", { ...post, published: false });
    assert.equal(unpublished.status, 200);
    post = await unpublished.json();
    assert.equal((await request("/blog/" + input.slug)).status, 404);
    assert.equal((await request(previewPath)).status, 200);
    assert.equal((await request("/api/admin/logout", "POST")).status, 200);
    cookie = "";
    assert.equal((await request(previewPath)).status, 404);
    const relogin = await request("/api/admin/login", "POST", { username: "test-admin", password });
    assert.equal(relogin.status, 200);
    cookie = relogin.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/admin/posts/" + post.id, "DELETE", { updated_at: post.updated_at })).status, 200);
    post = undefined;
    assert.equal((await request("/api/admin/logout", "POST")).status, 200);
    cookie = "";
    assert.equal((await request("/api/admin/content/News")).status, 401);
    for (let attempt = 1; attempt <= 11; attempt++) {
      assert.equal((await request("/api/admin/login", "POST", { username: "test-admin", password: "wrong" })).status, attempt <= 10 ? 401 : 429);
    }
  } finally {
    try {
    const sql = database();
    for (const temporaryId of temporaryPostIds) await sql.query("DELETE FROM blog_posts WHERE id::text = $1", [temporaryId]);
    for (const { original, saved } of optionEdits) {
      const result = await sql.query("UPDATE site_content SET rows = $1::jsonb, options = $2::jsonb, updated_at = clock_timestamp() WHERE tab = $3 AND updated_at = $4::timestamptz RETURNING tab", [JSON.stringify(original.rows), original.options == null ? null : JSON.stringify(original.options), original.tab, saved.updated_at]);
      assert.equal(result.length, 1, "Restore temporary option-list edits without overwriting concurrent changes.");
    }
    if (savedContent && originalContent) {
      const result = await sql.query("UPDATE site_content SET rows = $1::jsonb, updated_at = clock_timestamp() WHERE tab = 'News' AND updated_at = $2::timestamptz RETURNING tab", [JSON.stringify(originalContent.rows), savedContent.updated_at]);
      assert.equal(result.length, 1, "Restore temporary test News without overwriting concurrent edits.");
    }
    if (post) await sql.query("DELETE FROM blog_posts WHERE id::text = $1", [post.id]);
    if (mediaId) await sql.query("DELETE FROM media WHERE id::text = $1", [mediaId]);
    await sql.query("DELETE FROM admin_login_attempts WHERE key = $1", [attemptKey]);
    } finally {
    server.kill("SIGTERM");
    if (server.exitCode === null) await once(server, "exit");
    }
  }
});
