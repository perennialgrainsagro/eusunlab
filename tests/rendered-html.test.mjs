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
  ["/legacy_page", "Eusun Han's Lab"],
  ["/legacy_page/members/professor", "Eusun Han"],
  ["/legacy_page/members/students", "Graduate Student 01"],
  ["/legacy_page/members/alumni", "Alumni Example 01"],
  ["/legacy_page/research", "Human-Centered AI"],
  ["/legacy_page/projects", "Root Phenotyping for Resilient Crops"],
  ["/legacy_page/publications", "Example Paper"],
  ["/legacy_page/blog", "No blog posts yet"],
];

test("robots and sitemap use the current site address and exclude legacy pages", async () => {
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
    const pageUrls = ["/", "/people/professor", "/publications", "/blog", "/news"].map((path) => new URL(path, origin).href);
    const projectUrls = ["root-phenotyping-for-resilient-crops", "image-based-plant-growth-monitoring"].map((slug) => new URL(`/projects/${slug}`, origin).href);
    const newsUrls = ["the-new-lab-website-is-ready-for-content", "add-a-new-member-announcement-in-the-news-sheet", "link-a-paper-award-or-event-from-this-row"].map((slug) => new URL(`/news/sample-news-${slug}`, origin).href);
    assert.deepEqual(urls, [...pageUrls, ...projectUrls, ...newsUrls]);
    assert.doesNotMatch(xml, /\/legacy_page|\/admin|\/api\//);
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
    assert.match(html, /class="brand" href="\/legacy_page"/);
    assert.match(html, /href="\/legacy_page"[^>]*>Home<\/a>/);
    for (const [, href] of [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]) {
      if (href.startsWith("/")) assert.ok(href.startsWith("/legacy_page"), `Legacy navigation stays under /legacy_page: ${href}`);
    }
    assert.match(html, /<\/header><div class="site-scroll">/);
    assert.doesNotMatch(html, /<details|<summary/i);
    assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  });
}

test("the root renders the new home page with its layout, metadata, and detail links", async () => {
  const response = await fetch(baseUrl + "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /class="newlab /);
  assert.match(html, /data-roots-canvas/);
  assert.match(html, /<title>Eusun Han Lab · Root science, plant phenomics &amp; perennial agronomy<\/title>/);
  assert.match(html, /name="theme-color" content="#1d1915"/);
  for (const path of ["/people/professor", "/publications", "/blog", "/projects/root-phenotyping-for-resilient-crops"]) {
    assert.ok(html.includes(`href="${path}"`));
  }
  assert.doesNotMatch(html, /class="site-frame"/);
  assert.doesNotMatch(html, /<a\b[^>]*href="\/(?:newpage|legacy_page)/);
  assert.equal((await fetch(baseUrl + "/newpage/img/logo.png")).status, 200);
});

test("the old newpage address redirects to the root and preserves query parameters", async () => {
  for (const [oldPath, newPath] of [
    ["/newpage", "/"],
    ["/newpage/people/professor", "/people/professor"],
    ["/newpage/publications", "/publications"],
    ["/newpage/blog", "/blog"],
    ["/newpage/blog/example-post", "/blog/example-post"],
    ["/newpage/projects/root-phenotyping-for-resilient-crops", "/projects/root-phenotyping-for-resilient-crops"],
  ]) {
    const response = await fetch(baseUrl + oldPath + "?preview=1", { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), newPath + "?preview=1");
  }
});

test("new design detail pages return to sections on the root home page", async () => {
  // News and Blog lists sit at the top of the home page, so their pages link back to "/".
  for (const [path, back] of [
    ["/people/professor", "/#people"],
    ["/publications", "/#publications"],
    ["/blog", "/"],
    ["/news", "/"],
    ["/projects/root-phenotyping-for-resilient-crops", "/#projects"],
    ["/projects/image-based-plant-growth-monitoring", "/#projects"],
  ]) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /class="newlab /);
    assert.ok(html.includes(`href="${back}"`));
    assert.doesNotMatch(html, /<a\b[^>]*href="\/(?:newpage|legacy_page)/);
    assert.doesNotMatch(html, /class="site-frame"/);
  }
  assert.equal((await fetch(baseUrl + "/projects/missing-project")).status, 404);
  assert.equal((await fetch(baseUrl + "/blog/missing-post")).status, 404);
  assert.equal((await fetch(baseUrl + "/legacy_page/blog/missing-post")).status, 404);
});

test("Projects lists linked previews, titles, and summaries without the full descriptions or videos", async () => {
  const html = await (await fetch(baseUrl + "/legacy_page/projects")).text();
  assert.match(html, /<h1>Projects<\/h1>/);
  const projectLinks = [...html.matchAll(/<a\b[^>]*>/g)].filter(([link]) => /href="\/legacy_page\/projects"/.test(link) && /aria-current="page"/.test(link));
  assert.equal(projectLinks.length, 2);
  assert.match(html, /src="\/projects\/root-phenotyping.svg"/);
  assert.match(html, /src="\/projects\/plant-monitoring.svg"/);
  assert.match(html, /Connecting root architecture with water and nutrient use/);
  assert.match(html, /href="\/legacy_page\/projects\/root-phenotyping-for-resilient-crops"/);
  assert.match(html, /href="\/legacy_page\/projects\/image-based-plant-growth-monitoring"/);
  assert.doesNotMatch(html, /<video|<iframe|<h3>Project overview|root-workflow\.svg|flower\.mp4|It is not footage from the lab/);
  for (const asset of ["root-phenotyping.svg", "root-workflow.svg", "plant-monitoring.svg"]) {
    assert.equal((await fetch(baseUrl + "/projects/" + asset)).status, 200);
  }
});

test("project detail URLs render their own full content, media, metadata, and return link", async () => {
  const root = await fetch(baseUrl + "/legacy_page/projects/root-phenotyping-for-resilient-crops");
  assert.equal(root.status, 200);
  const rootHtml = await root.text();
  assert.match(rootHtml, /<h1>Root Phenotyping for Resilient Crops<\/h1>/);
  assert.match(rootHtml, /<title>Root Phenotyping for Resilient Crops<\/title>/);
  assert.match(rootHtml, /<strong>root imaging<\/strong>/);
  assert.match(rootHtml, /src="\/projects\/root-workflow.svg"/);
  assert.match(rootHtml, /href="\/legacy_page\/projects">← All projects<\/a>/);
  assert.ok([...rootHtml.matchAll(/<a\b[^>]*>/g)].some(([link]) => /href="\/legacy_page\/projects"/.test(link) && /aria-current="page"/.test(link)));
  assert.doesNotMatch(rootHtml, /Image-Based Plant Growth Monitoring|flower\.mp4/);

  const growth = await fetch(baseUrl + "/legacy_page/projects/image-based-plant-growth-monitoring");
  assert.equal(growth.status, 200);
  const growthHtml = await growth.text();
  assert.match(growthHtml, /<h1>Image-Based Plant Growth Monitoring<\/h1>/);
  assert.match(growthHtml, /<video[^>]*controls=""[^>]*preload="none"/);
  assert.match(growthHtml, /flower.mp4/);
  assert.match(growthHtml, /It is not footage from the lab/);
  assert.doesNotMatch(growthHtml, /Root Phenotyping for Resilient Crops/);
  assert.equal((await fetch(baseUrl + "/legacy_page/projects/missing-project")).status, 404);
});

test("alumni renders without profile images", async () => {
  const response = await fetch(baseUrl + "/legacy_page/members/alumni");
  const html = await response.text();
  assert.doesNotMatch(html, /member-image|portrait/i);
});

test("Members renders grouped profile rows with optional, formatted introductions", async () => {
  const html = await (await fetch(baseUrl + "/legacy_page/members/students")).text();
  assert.match(html, /<h1>Members<\/h1>/);
  assert.match(html, /href="\/legacy_page\/members\/professor"[^>]*>PI<\/a>/);
  assert.match(html, /href="\/legacy_page\/members\/students"[^>]*>Members<\/a>/);
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

test("Legacy home cards link to matching Research sections and share their titles, summaries, and images", async () => {
  const [html, researchHtml] = await Promise.all(
    ["/legacy_page", "/legacy_page/research"].map(async (pathname) => (await fetch(baseUrl + pathname)).text()),
  );
  const cards = [...html.matchAll(/<article class="home-card linked-content">([\s\S]*?)<\/article>/g)];
  const research = [...researchHtml.matchAll(/<article[^>]*class="research-item[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 3);
  for (const [index, card] of cards.entries()) {
    const target = card[0].match(/href="\/legacy_page\/research#([^"]+)"/)?.[1];
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

test("Legacy home shows the recent blog section and a More link when there are no published posts", async () => {
  const html = await (await fetch(baseUrl + "/legacy_page")).text();
  assert.match(html, /<aside class="home-blog" aria-labelledby="home-blog-title">/);
  assert.match(html, /<h2 id="home-blog-title">Latest blog posts<\/h2>/);
  assert.match(html, /No blog posts yet\./);
  const moreLink = html.match(/<a[^>]*class="home-blog-more"[^>]*>/)?.[0] ?? "";
  assert.match(moreLink, /href="\/legacy_page\/blog"/);
  assert.match(moreLink, /aria-label="More blog posts"/);
  assert.doesNotMatch(html, /class="home-blog-item"/);
});

test("Legacy home ends with the Join us invitation, email button, and upcoming PhD course", async () => {
  const html = await (await fetch(baseUrl + "/legacy_page")).text();
  const box = html.match(/<section class="home-join" aria-labelledby="home-join-title">([\s\S]*?)<\/section>/);
  assert.ok(box);
  assert.match(box[1], /<h1 id="home-join-title">Join us<\/h1>/);
  assert.match(box[1], /Come join us next summer! Hosting students to help with activities on a range of topics!/);
  assert.match(box[1], /Site visits, long-term research stays and questions are all welcome\./);
  assert.match(box[1], /href="mailto:eusun.han@agro.au.dk" class="home-join-contact"/);
  assert.match(box[1], /Say hello at.*eusun.han@agro.au.dk/);
  assert.match(box[1], /Root Methods PhD course \(Coming 2028\)/);
  assert.match(box[1], /A PhD course on root research methods, taught by the lab and colleagues\./);
  assert.ok(box.index > html.indexOf('class="section news-section"'));
  assert.match(html.slice(box.index + box[0].length), /^<\/div><\/main><footer/);
});

test("professor publications render as a numbered citation list with inline bold and links", async () => {
  const [professorHtml, labHtml] = await Promise.all(
    ["/legacy_page/members/professor", "/legacy_page/publications"].map(async (pathname) => (await fetch(baseUrl + pathname)).text()),
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
