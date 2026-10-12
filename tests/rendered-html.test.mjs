import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
let app;
let baseUrl;

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3100;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

before(async () => {
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  app = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: { ...process.env, GOOGLE_SHEET_ID: "", DATABASE_URL: "", CONTENT_SOURCE: "sample" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  app.stdout.on("data", (chunk) => { output += chunk; });
  app.stderr.on("data", (chunk) => { output += chunk; });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (app.exitCode !== null) throw new Error(`Next.js exited before startup:\n${output}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await wait(100);
  }
  throw new Error(`Next.js did not start:\n${output}`);
});

after(async () => {
  if (!app || app.exitCode !== null) return;
  app.kill("SIGTERM");
  const timeout = setTimeout(() => app.kill("SIGKILL"), 5000);
  await once(app, "exit");
  clearTimeout(timeout);
});

const routes = [
  ["/", "Eusun Han's Lab"],
  ["/members/professor", "Eusun Han"],
  ["/members/students", "Graduate Student 01"],
  ["/members/alumni", "Alumni Example 01"],
  ["/research", "Human-Centered AI"],
  ["/projects", "Root Phenotyping for Resilient Crops"],
  ["/publications", "Example Paper"],
  ["/blog", "No blog posts yet"],
];

test("robots and sitemap use the current site address and include only public pages", async () => {
  for (const origin of [baseUrl, "https://lab.example"]) {
    const headers = {
      "x-forwarded-host": new URL(origin).host,
      "x-forwarded-proto": new URL(origin).protocol.slice(0, -1),
    };
    const robots = await fetch(baseUrl + "/robots.txt", { headers });
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get("content-type") ?? "", /^text\/plain\b/);
    assert.equal(await robots.text(), `User-Agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);

    const sitemap = await fetch(baseUrl + "/sitemap.xml", { headers });
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get("content-type") ?? "", /xml/);
    const xml = await sitemap.text();
    assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    assert.deepEqual(urls, routes.map(([path]) => new URL(path, origin).href));
    assert.doesNotMatch(xml, /\/admin|\/api\//);
  }
});

for (const [pathname, expected] of routes) {
  test(`server-renders ${pathname}`, async () => {
    const response = await fetch(baseUrl + pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.ok(html.toLowerCase().includes(expected.toLowerCase()));
    assert.match(html, /Sample content is shown/);
    assert.match(html, /class="member-trigger"[^>]*>Team<\/button>/);
    assert.match(html, /class="mobile-lab-name"[^>]*>Eusun Han&#x27;s Lab<\/a>/);
    assert.match(html, /aria-controls="mobile-navigation"/);
    assert.match(html, /<\/header><div class="site-scroll">/);
    assert.doesNotMatch(html, /<details|<summary/i);
    assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  });
}

test("Projects renders editable example descriptions, inline images, video, and active navigation", async () => {
  const html = await (await fetch(baseUrl + "/projects")).text();
  assert.match(html, /<h1>Projects<\/h1>/);
  const projectLinks = [...html.matchAll(/<a\b[^>]*>/g)].filter(([link]) => /href="\/projects"/.test(link) && /aria-current="page"/.test(link));
  assert.equal(projectLinks.length, 2);
  assert.match(html, /<strong>root imaging<\/strong>/);
  assert.match(html, /src="\/projects\/root-workflow.svg"/);
  assert.match(html, /<video[^>]*controls=""[^>]*preload="none"/);
  assert.match(html, /flower.mp4/);
  assert.match(html, /It is not footage from the lab/);
  for (const asset of ["root-phenotyping.svg", "root-workflow.svg", "plant-monitoring.svg"]) {
    assert.equal((await fetch(baseUrl + "/projects/" + asset)).status, 200);
  }
});

test("alumni renders without profile images", async () => {
  const response = await fetch(baseUrl + "/members/alumni");
  const html = await response.text();
  assert.doesNotMatch(html, /member-image|portrait/i);
});

test("Members renders grouped profile rows with optional, formatted introductions", async () => {
  const html = await (await fetch(baseUrl + "/members/students")).text();
  assert.match(html, /<h1>Members<\/h1>/);
  assert.match(html, /href="\/members\/professor"[^>]*>PI<\/a>/);
  assert.match(html, /href="\/members\/students"[^>]*>Members<\/a>/);
  const lists = [...html.matchAll(/<ul class="member-list" role="list">([\s\S]*?)<\/ul>/g)];
  assert.equal(lists.length, 2);
  const rows = lists.flatMap((list) => [...list[1].matchAll(/<li><article class="member-row">([\s\S]*?)<\/article><\/li>/g)]);
  assert.equal(rows.length, 3);
  assert.match(rows[0][1], /Graduate Student 01/);
  assert.match(rows[0][1], /Studies <strong>human-centered AI<\/strong>/);
  assert.match(rows[0][1], /<p>Builds interactive tools and evaluates them through user studies\.<\/p>/);
  assert.match(rows[0][1], /href="mailto:student01@example.edu"/);
  assert.match(rows[1][1], /Graduate Student 02/);
  assert.match(rows[2][1], /Undergraduate Student 01/);
  for (const row of rows.slice(1)) assert.doesNotMatch(row[1], /class="member-bio"/);
});

test("Home cards link to matching Research sections and share their titles, summaries, and images", async () => {
  const [html, researchHtml] = await Promise.all(
    ["/", "/research"].map(async (pathname) => (await fetch(baseUrl + pathname)).text()),
  );
  const cards = [...html.matchAll(/<article class="home-card linked-content">([\s\S]*?)<\/article>/g)];
  const research = [...researchHtml.matchAll(/<article[^>]*class="research-item[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 3);
  for (const [index, card] of cards.entries()) {
    const target = card[0].match(/href="\/research#([^"]+)"/)?.[1];
    assert.ok(target);
    assert.equal(research[index][0].match(/id="([^"]+)"/)?.[1], target);
    assert.equal(research.filter((item) => item[0].includes(`id="${target}"`)).length, 1);
    assert.match(card[1], /class="content-image"/);
    assert.match(card[1], /<h2>.+<\/h2><p>.+<\/p>/);
    assert.equal(card[1].match(/<h2>(.*?)<\/h2>/)?.[1], research[index][1].match(/<h2>(.*?)<\/h2>/)?.[1]);
    assert.equal(card[1].match(/<p>(.*?)<\/p>/)?.[1], research[index][1].match(/<p class="summary">(.*?)<\/p>/)?.[1]);
    assert.equal(card[1].match(/<img[^>]*src="([^"]+)"/)?.[1], research[index][1].match(/<img[^>]*src="([^"]+)"/)?.[1]);
  }
});

test("Admin pages and APIs block framing and send defensive browser headers", async () => {
  for (const [path, status] of [["/admin", 200], ["/admin/preview/missing-post", 404], ["/api/admin/content/News", 401]]) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "same-origin");
  }
});

test("Home shows the recent blog section and a More link when there are no published posts", async () => {
  const html = await (await fetch(baseUrl + "/")).text();
  assert.match(html, /<aside class="home-blog" aria-labelledby="home-blog-title">/);
  assert.match(html, /<h2 id="home-blog-title">Latest blog posts<\/h2>/);
  assert.match(html, /No blog posts yet\./);
  const moreLink = html.match(/<a[^>]*class="home-blog-more"[^>]*>/)?.[0] ?? "";
  assert.match(moreLink, /href="\/blog"/);
  assert.match(moreLink, /aria-label="More blog posts"/);
  assert.doesNotMatch(html, /class="home-blog-item"/);
});

test("professor publications render as a numbered citation list with inline bold and links", async () => {
  const [professorHtml, labHtml] = await Promise.all(
    ["/members/professor", "/publications"].map(async (pathname) => (await fetch(baseUrl + pathname)).text()),
  );
  const lists = [...professorHtml.matchAll(/<ol class="professor-publication-list" role="list">([\s\S]*?)<\/ol>/g)];
  assert.equal(lists.length, 2);
  assert.equal(lists.reduce((total, list) => total + [...list[1].matchAll(/<li\b/g)].length, 0), 2);
  assert.match(professorHtml, /<div class="professor-publications">/);
  assert.match(professorHtml, /class="professor-publication-group"><h3>International Conference<\/h3>/);
  assert.match(professorHtml, /class="professor-publication-group"><h3>Journal<\/h3>/);
  assert.match(lists[0][1], /<li><span><strong>Eusun Han<\/strong> and Sample Collaborators \(2026\)/);
  assert.match(lists[0][1], /href="https:\/\/example.com" target="_blank" rel="noreferrer noopener">Paper<\/a>/);
  assert.match(lists[1][1], /Example Professor Journal Article/);
  assert.doesNotMatch(professorHtml, /class="publication-category"|class="publication-year"/);
  assert.match(labHtml, /class="publication-category"/);
  assert.match(labHtml, /class="publication-year"><h3>2026<\/h3>/);
  assert.match(professorHtml, /<h2>Publication List<\/h2>/);
  assert.match(professorHtml, /Example Professor Paper/);
  assert.match(professorHtml, /<strong>Eusun Han<\/strong>/);
  assert.doesNotMatch(professorHtml, /Example Paper: Replace This/);
  assert.doesNotMatch(labHtml, /Example Professor Paper/);
});
