import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createSession, hashPassword, validSession, verifyCredentials } from "../app/lib/admin-auth.ts";
import { imageType, makeSlug, renderBlogDocument, validatePost } from "../app/lib/blog.ts";
import { contentOptions, DEFAULT_STUDENT_PHOTO_URL, renameContentOption, reorderList, reorderRows, validateOptions, validateRows } from "../app/lib/content-schema.ts";
import { normalizeNews, normalizeProfessorPublications, normalizeResearch, normalizePublications, normalizeStudents } from "../app/lib/content.ts";

test("single admin credentials and signed sessions reject tampering, expiry, and password rotation", () => {
  const previous = { username: process.env.ADMIN_USERNAME, hash: process.env.ADMIN_PASSWORD_HASH, secret: process.env.ADMIN_SESSION_SECRET };
  process.env.ADMIN_USERNAME = "test-admin";
  process.env.ADMIN_PASSWORD_HASH = hashPassword("a-long-test-password");
  process.env.ADMIN_SESSION_SECRET = "a-long-session-secret-only-for-this-test";
  try {
    assert.equal(verifyCredentials("test-admin", "a-long-test-password"), true);
    assert.equal(verifyCredentials("other", "a-long-test-password"), false);
    assert.equal(verifyCredentials("test-admin", "wrong"), false);
    const now = Date.now();
    const session = createSession(now);
    assert.equal(validSession(session, now + 1000), true);
    assert.equal(validSession(session + "tampered", now), false);
    assert.equal(validSession(session + ".", now), false);
    assert.equal(validSession(session, now + 8 * 60 * 60 * 1000), false);
    process.env.ADMIN_PASSWORD_HASH = hashPassword("another-long-test-password");
    assert.equal(validSession(session, now), false);
  } finally {
    for (const [key, value] of Object.entries({ ADMIN_USERNAME: previous.username, ADMIN_PASSWORD_HASH: previous.hash, ADMIN_SESSION_SECRET: previous.secret })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("blog Markdown supports formatting and images while excluding HTML and unsafe URLs", () => {
  const post = validatePost({
    title: "Test article", writer_name: "Test writer", slug: "test-article", excerpt: "", published: false,
    body: "**Bold**\n\n~~Removed~~\n\n![Lab image](/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)\n\n<script>alert('x')</script>\n\n[Unsafe](javascript:alert(1))",
  });
  const html = renderToStaticMarkup(renderBlogDocument(post.body));
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<del>Removed<\/del>/);
  assert.match(html, /src="\/media\/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"/);
  assert.doesNotMatch(html, /<script|javascript:/i);
  assert.equal(makeSlug("한글 Blog Title"), "한글-blog-title");
  assert.equal(makeSlug("**한글** [Blog Title](https://example.com)"), "한글-blog-title");
  assert.throws(() => validatePost({ ...post, slug: "../admin" }));
  assert.throws(() => validatePost({ ...post, writer_name: "" }));
  assert.throws(() => validatePost({ ...post, body: "x".repeat(300001) }));
  assert.equal(post.main_image_url, "", "Existing posts can omit the optional main image.");
  assert.equal(validatePost({ ...post, main_image_url: " https://example.com/cover.jpg ", main_image_alt: " Cover " }).main_image_url, "https://example.com/cover.jpg");
  assert.equal(validatePost({ ...post, main_image_url: "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }).main_image_url, "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  assert.throws(() => validatePost({ ...post, main_image_url: "javascript:alert(1)" }));
  assert.throws(() => validatePost({ ...post, main_image_alt: "x".repeat(501) }));
});

test("content validation keeps hidden rows and rejects malformed content and unsafe image URLs", () => {
  const rows = validateRows("Research", [{ title: "Card", visible: false, image_url: "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }]);
  assert.equal(rows[0].visible, false);
  assert.throws(() => validateRows("Research", [{ title: "Card", image_url: "javascript:alert(1)" }]));
  assert.throws(() => validateRows("News", [{ content: { html: "bad" } }]));
  assert.throws(() => validateRows("Research", [{ display_order: "not a number" }]));
  assert.equal(imageType(Buffer.from("<svg onload='alert(1)'>")), null);
  assert.equal(imageType(Buffer.from("89504e470d0a1a0a", "hex")), "image/png");
});

test("students without photos save and display the default portrait while custom photos stay unchanged", () => {
  for (const photo_url of [undefined, null, "", "   "]) {
    assert.equal(validateRows("Students", [{ name: "Student", photo_url }])[0].photo_url, DEFAULT_STUDENT_PHOTO_URL);
    assert.equal(normalizeStudents([{ name: "Student", photo_url }])[0].photo_url, DEFAULT_STUDENT_PHOTO_URL);
  }
  const photo_url = "https://example.com/student.jpg";
  assert.equal(validateRows("Students", [{ photo_url }])[0].photo_url, photo_url);
  assert.equal(normalizeStudents([{ name: "Student", photo_url }])[0].photo_url, photo_url);
  assert.equal(validateRows("Professor", [{ photo_url: "" }])[0].photo_url, "");
  assert.throws(() => validateRows("Students", [{ photo_url: "javascript:alert(1)" }]));
});

test("member introductions survive saving while legacy and hidden profiles remain supported", () => {
  const short_bio = "Studies **plant resilience**.\nBuilds imaging tools for the lab.";
  const rows = validateRows("Students", [
    { name: "Member", group: "Postdocs", short_bio, visible: true },
    { name: "Legacy member", group: "Postdocs", visible: true },
    { name: "Hidden member", group: "Postdocs", short_bio: "Private draft", visible: false },
  ]);
  assert.equal(rows[0].short_bio, short_bio);
  assert.equal(rows[1].short_bio, "");
  assert.equal(rows[2].short_bio, "Private draft");
  const members = normalizeStudents(rows);
  assert.deepEqual(members.map((member) => member.name), ["Member", "Legacy member"]);
  assert.deepEqual(members.map((member) => member.short_bio), [short_bio, ""]);
  assert.equal(normalizeStudents([{ name: "Legacy member" }])[0].short_bio, "");
  assert.throws(() => validateRows("Students", [{ short_bio: { html: "bad" } }]));
  assert.throws(() => validateRows("Students", [{ short_bio: "x".repeat(30001) }]));
});

test("reordering updates public display order without losing content, hidden rows, or grouping", () => {
  const rows = [
    { title: "First", content: "First", name: "First", display_order: 8, order: 8, visible: true, month: "2026-10-01", category: "Journal", year: 2026, group: "Graduate" },
    { title: "Second", content: "Second", name: "Second", display_order: 20, order: 20, visible: true, month: "2025-01-01", category: "Journal", year: 2026, group: "Graduate" },
    { title: "Hidden", content: "Hidden", display_order: 99, order: 99, visible: false },
  ];
  const research = reorderRows("Research", rows, 1, 0);
  assert.deepEqual(research.map((row) => row.display_order), [1, 2, 3]);
  assert.equal(research[2].visible, false);
  assert.equal(rows[0].display_order, 8, "Leave the saved source untouched until the user saves.");
  assert.deepEqual(normalizeResearch(research).map((row) => row.title), ["Second", "First"]);
  assert.deepEqual(normalizeNews(validateRows("News", reorderRows("News", rows, 1, 0))).map((row) => row.content), ["Second", "First"], "Manual news order overrides the date.");
  assert.deepEqual(normalizeProfessorPublications(reorderRows("ProfessorPublications", rows, 1, 0)).map((row) => row.content), ["Second", "First"]);
  assert.deepEqual(normalizePublications(reorderRows("Publications", rows, 1, 0)).map((row) => row.title), ["Second", "First"]);
  assert.deepEqual(normalizeStudents(reorderRows("Students", rows, 1, 0)).map((row) => row.name), ["Second", "First"]);
  assert.deepEqual(reorderRows("Research", research, 0, 2).map((row) => row.title), ["First", "Hidden", "Second"]);
  assert.equal(reorderRows("Professor", rows, 1, 0), rows);
  assert.equal(reorderRows("Research", rows, -1, 2), rows);
  assert.equal(reorderRows("Research", rows, 0, 3), rows);
});

test("managed groups and categories preserve existing choices and reject duplicates or removal while in use", () => {
  for (const [tab, field] of [["Students", "group"], ["Publications", "category"]]) {
    const rows = [{ [field]: "First", visible: false }, { [field]: "First" }, { [field]: "Second" }];
    const record = { tab, rows, updated_at: "2026-10-05" };
    assert.deepEqual(contentOptions(record), ["First", "Second"], "Seed choices from all existing rows, including hidden ones.");
    assert.deepEqual(contentOptions({ ...record, options: [] }), [], "An explicitly empty catalog stays empty.");
    assert.deepEqual(validateOptions(tab, ["First", "Second", " New "], rows), ["First", "Second", "New"]);
    assert.deepEqual(validateOptions(tab, ["First", "Second"], rows), ["First", "Second"], "Unused choices can be removed.");
    assert.throws(() => validateOptions(tab, ["Second"], rows), /in use/);
    assert.throws(() => validateOptions(tab, ["First", " First ", "Second"], rows), /already/);
    for (const invalid of [null, "name", [""], [42], ["x".repeat(201)], Array(201).fill("Name")]) assert.throws(() => validateOptions(tab, invalid, []));
    assert.deepEqual(validateOptions(tab, [], [{ [field]: "" }]), []);
  }
});

test("renaming groups and categories updates all assigned items without changing order or saved data", () => {
  for (const [tab, field] of [["Students", "group"], ["Publications", "category"]]) {
    const options = ["First", "Other", "Unused"];
    const rows = [
      { [field]: "First", name: "Visible", title: "Visible", display_order: 9, year: 2026 },
      { [field]: " First ", name: "Hidden", title: "Hidden", visible: false, display_order: 1 },
      { [field]: "Other", name: "Other item", display_order: 3 },
      { [field]: "", name: "Unassigned" },
    ];
    const savedRows = structuredClone(rows);
    const renamed = renameContentOption(tab, options, rows, "First", " Renamed ");
    assert.deepEqual(renamed.options, ["Renamed", "Other", "Unused"]);
    assert.deepEqual(renamed.rows, rows.map((row, index) => index < 2 ? { ...row, [field]: "Renamed" } : row));
    assert.deepEqual(validateOptions(tab, renamed.options, validateRows(tab, renamed.rows)), renamed.options, "The combined save must pass API validation.");
    const unused = renameContentOption(tab, options, rows, "Unused", "Available");
    assert.deepEqual(unused.options, ["First", "Other", "Available"]);
    assert.deepEqual(unused.rows, rows);
    for (const value of ["", "   ", "Other", " Other ", "x".repeat(201)]) {
      assert.throws(() => renameContentOption(tab, options, rows, "First", value));
    }
    assert.throws(() => renameContentOption(tab, options, rows, "Missing", "Renamed"), /existing/);
    assert.deepEqual(rows, savedRows);
    assert.deepEqual(options, ["First", "Other", "Unused"]);
  }
  assert.throws(() => renameContentOption("Research", ["First"], [], "First", "Renamed"), /existing/);
});

test("group and category ordering changes sections while preserving member, year, and item order", () => {
  const options = ["First", "Second", "Unused"];
  const reordered = reorderList(options, 1, 0);
  assert.deepEqual(reordered, ["Second", "First", "Unused"]);
  assert.deepEqual(options, ["First", "Second", "Unused"], "Do not change saved choices before saving.");
  for (const [from, to] of [[-1, 0], [0, 3], [0.5, 1], [1, 1]]) assert.equal(reorderList(options, from, to), options);
  const rows = [
    { group: "First", category: "First", name: "Later", title: "Later", year: 2024, display_order: 3 },
    { group: "Second", category: "Second", name: "Second", title: "Second", year: 2020, display_order: 1 },
    { group: "First", category: "First", name: "Earlier", title: "Earlier", year: 2025, display_order: 2 },
    { group: "Second", category: "Second", name: "Hidden", title: "Hidden", visible: false },
    { group: "Legacy", category: "Legacy", name: "Legacy", title: "Legacy", display_order: 1 },
  ];
  assert.deepEqual(normalizeStudents(rows, reordered).map((item) => item.name), ["Second", "Earlier", "Later", "Legacy"]);
  assert.deepEqual(normalizePublications(rows, reordered).map((item) => item.title), ["Second", "Earlier", "Later", "Legacy"]);
  assert.deepEqual(normalizeStudents(rows).map((item) => item.name), ["Earlier", "Later", "Second", "Legacy"], "Legacy content keeps its existing order.");
});
