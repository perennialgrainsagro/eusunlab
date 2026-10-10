import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { contentUrl, projectVideo, validateRows } from "../app/lib/content-schema.ts";
import { normalizeProjects } from "../app/lib/content.ts";
import { renderBlogDocument } from "../app/lib/blog.ts";

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
