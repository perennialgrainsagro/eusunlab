import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { contentUrl, imageUrl, projectVideo, validateRows } from "../app/lib/content-schema.ts";
import { normalizeProjects } from "../app/lib/content.ts";
import { renderBlogDocument } from "../app/lib/blog.ts";
import { projectPreview } from "../app/lib/projects.ts";

test("Dropbox image links render the file while ordinary hyperlinks retain the sharing page", () => {
  for (const path of ["/s/token/image.jpg", "/scl/fi/token/image.jpg"]) {
    const shared = `https://www.dropbox.com${path}?rlkey=access-key&st=share-token&dl=0`;
    const direct = imageUrl(shared);
    const url = new URL(direct);
    assert.equal(url.searchParams.get("raw"), "1");
    assert.equal(url.searchParams.has("dl"), false);
    assert.equal(url.searchParams.get("rlkey"), "access-key");
    assert.equal(url.searchParams.get("st"), "share-token");
    assert.equal(imageUrl(direct), direct);
    const html = renderToStaticMarkup(renderBlogDocument(`![Diagram](${shared})\n\n[Source](${shared})`));
    assert.ok(html.includes(`src="${direct.replaceAll("&", "&amp;")}"`));
    assert.ok(html.includes(`href="${shared.replaceAll("&", "&amp;")}"`));
  }
  for (const url of ["/projects/root-phenotyping.svg", "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "https://example.com/image.jpg?dl=0", "https://dropbox.com.evil.test/s/token/image.jpg?dl=0", "https://www.dropbox.com/sh/folder?dl=0"]) assert.equal(imageUrl(url), url);
  for (const url of ["javascript:alert(1)", "mailto:lab@example.org", "//example.com/image.jpg", ""]) assert.equal(imageUrl(url), "");
});

test("project previews prefer the uploaded preview, then a cover or content image, and handle missing or unsafe images", () => {
  const item = { title: "Project", preview_image_url: "", image_url: "/projects/root-phenotyping.svg", image_alt: "Cover", details: "![Workflow](/projects/root-workflow.svg)" };
  const preview_image_url = "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  assert.deepEqual(projectPreview({ ...item, preview_image_url }), { src: preview_image_url, alt: "Project" });
  assert.deepEqual(projectPreview(item), { src: item.image_url, alt: "Cover" });
  assert.deepEqual(projectPreview({ ...item, image_url: "" }), { src: "/projects/root-workflow.svg", alt: "Workflow" });
  assert.deepEqual(projectPreview({ ...item, image_url: "", details: '![Diagram](<https://www.dropbox.com/s/token/image.jpg?dl=0> "Caption")' }), { src: "https://www.dropbox.com/s/token/image.jpg?raw=1", alt: "Diagram" });
  assert.deepEqual(projectPreview({ ...item, image_url: "", details: "No images" }), { src: "", alt: "Project" });
  assert.deepEqual(projectPreview({ ...item, image_url: "javascript:alert(1)", details: "![Bad](javascript:alert)\n\n![](/projects/root-workflow.svg)" }), { src: "/projects/root-workflow.svg", alt: "Project" });
  assert.deepEqual(projectPreview({ ...item, preview_image_url: "javascript:alert(1)" }), { src: item.image_url, alt: "Cover" });
});

test("Projects save uploaded preview URLs while supporting existing projects without a preview", () => {
  const preview_image_url = "/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const rows = validateRows("Projects", [{ title: "Uploaded preview", preview_image_url }, { title: "Existing project" }]);
  assert.equal(rows[0].preview_image_url, preview_image_url);
  assert.equal(rows[1].preview_image_url, "");
  const projects = normalizeProjects(rows);
  assert.equal(projects[0].preview_image_url, preview_image_url);
  assert.equal(projects[1].preview_image_url, "");
  assert.equal(normalizeProjects([{ title: "Legacy project" }])[0].preview_image_url, "");
  for (const url of ["javascript:alert(1)", "mailto:lab@example.org", "//example.com/preview.jpg"]) assert.throws(() => validateRows("Projects", [{ title: "Project", preview_image_url: url }]));
});

test("project URLs are unique, support formatted and non-Latin titles, and follow projects when reordered", () => {
  const rows = [
    { title: "**Root** [Science](https://example.com)", display_order: 2 },
    { title: "한글 프로젝트", display_order: 1 },
    { title: "Private draft", visible: false },
  ];
  const projects = normalizeProjects(rows);
  assert.deepEqual(projects.map((item) => item.slug), ["한글-프로젝트", "root-science"]);
  assert.deepEqual(normalizeProjects([...rows].reverse()), projects);
  const duplicates = normalizeProjects([{ title: "Same" }, { title: "Same" }, { title: "Same-2" }, { title: "!!!" }, { title: "" }, { title: "Project" }]);
  assert.deepEqual(duplicates.map((item) => item.slug), ["same", "same-2", "same-2-2", "project", "project-2"]);
});

test("project videos accept direct files and canonical YouTube links while rejecting unsafe embeds", () => {
  for (const url of [
    "https://youtu.be/aqz-KE-bpKQ?t=2",
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ&autoplay=1",
    "https://www.youtube.com/embed/aqz-KE-bpKQ",
    "https://youtube.com/shorts/aqz-KE-bpKQ",
    "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
  ]) {
    assert.deepEqual(projectVideo(url), { kind: "youtube", url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" });
    assert.doesNotThrow(() => validateRows("Projects", [{ title: "Example", video_url: url }]));
  }
  for (const url of ["https://example.com/demo.mp4?token=public", "https://example.com/demo.WEBM", "/projects/demo.mp4"]) {
    assert.deepEqual(projectVideo(url), { kind: "file", url });
  }
  for (const url of ["javascript:alert(1)", "data:video/mp4;base64,AA", "mailto:example@lab.org", "https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ", "https://youtu.be/invalid", "https://example.com/embed", "//example.com/demo.mp4"]) {
    assert.equal(projectVideo(url), null);
    assert.throws(() => validateRows("Projects", [{ title: "Example", video_url: url }]));
  }
  assert.equal(projectVideo(""), null);
  assert.doesNotThrow(() => validateRows("Projects", [{ title: "No video", video_url: "" }]));
});

test("Projects retain each item's media and Markdown, sort by order, and filter hidden items", () => {
  const rows = validateRows("Projects", [
    { display_order: 2, title: "Same title", details: "**Second**", video_url: "https://example.com/second.mp4", video_captions_url: "https://example.com/captions.vtt" },
    { display_order: 1, title: "Same title", details: "**First**", image_url: "/projects/root-phenotyping.svg" },
    { display_order: 0, title: "Hidden", visible: false },
    { display_order: 3, title: "" },
  ]);
  const projects = normalizeProjects(rows);
  assert.deepEqual(projects.map((item) => item.details), ["**First**", "**Second**"]);
  assert.equal(projects[0].image_url, "/projects/root-phenotyping.svg");
  assert.equal(projects[1].video_url, "https://example.com/second.mp4");
  assert.equal(projects[1].video_captions_url, "https://example.com/captions.vtt");
  assert.throws(() => validateRows("Projects", [{ video_captions_url: "mailto:example@lab.org" }]));
});

test("project Markdown displays local illustrations and uploaded images without allowing raw HTML", () => {
  const html = renderToStaticMarkup(renderBlogDocument("### Overview\n\n![Workflow](/projects/root-workflow.svg)\n\n![Upload](/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert(1))"));
  assert.match(html, /<h3>Overview<\/h3>/);
  assert.match(html, /src="\/projects\/root-workflow.svg"/);
  assert.match(html, /src="\/media\/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"/);
  assert.doesNotMatch(html, /<script|javascript:/);
  for (const url of ["/projects/../admin", "/projects/bad.svg?script=1", "/projects/demo.html", "/projects//evil.svg"]) assert.equal(contentUrl(url), "");
});
