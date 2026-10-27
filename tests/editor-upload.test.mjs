import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { blogImage, insertContentImage } from "../app/admin/upload.ts";
import { renderBlogDocument } from "../app/lib/blog.ts";
import { projectPreview } from "../app/lib/projects.ts";

test("uploaded content images appear at the cursor without deleting surrounding text", () => {
  const url = "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const text = "Before\n\nAfter";
  for (const position of [0, 6, text.length]) {
    const insertion = insertContentImage(text, url, position);
    assert.ok(insertion.value.startsWith(text.slice(0, position)));
    assert.ok(insertion.value.endsWith(text.slice(position)));
    assert.equal(insertion.value.slice(position, insertion.cursor), `\n\n![Project image](${url})\n\n`);
    const html = renderToStaticMarkup(renderBlogDocument(insertion.value));
    assert.ok(html.includes(`src="${url}"`));
    assert.ok(html.includes("Before"));
    assert.ok(html.includes("After"));
    assert.deepEqual(projectPreview({ title: "Project", preview_image_url: "", image_url: "", image_alt: "", details: insertion.value }), { src: url, alt: "Project image" });
  }
  assert.match(insertContentImage("", url, 0).value, /!\[Project image\]/);
  assert.throws(() => insertContentImage("x".repeat(30000), url, 100), /30,000 characters/);
});

test("blog article images use the article's alt text and length limit", () => {
  const url = "/media/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const insertion = insertContentImage("Intro\n\nOutro", url, 5, blogImage);
  assert.equal(insertion.value, `Intro\n\n![Blog image](${url})\n\n\n\nOutro`);
  assert.ok(renderToStaticMarkup(renderBlogDocument(insertion.value)).includes(`src="${url}"`));
  assert.ok(insertContentImage("x".repeat(30000), url, 100, blogImage).value.length > 30000, "Articles allow more than the project limit.");
  assert.throws(() => insertContentImage("x".repeat(300000), url, 100, blogImage), /300,000 characters/);
});
