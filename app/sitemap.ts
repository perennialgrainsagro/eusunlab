import type { MetadataRoute } from "next";
import { listPosts } from "./lib/database";
import { siteUrl } from "./lib/site-url";
import { loadNews, loadProjects } from "./lib/content";

const pages = [
  "/",
  "/people/professor",
  "/publications",
  "/blog",
  "/news",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [base, posts, projects, news] = await Promise.all([siteUrl(), listPosts(), loadProjects(), loadNews()]);
  return [
    ...pages.map((path) => ({ url: new URL(path, base).href })),
    ...projects.data.map((item) => ({
      url: new URL(`/projects/${encodeURIComponent(item.slug)}`, base).href,
    })),
    ...news.data.map((item) => ({
      url: new URL(`/news/${encodeURIComponent(item.slug)}`, base).href,
    })),
    ...posts.map((post) => ({
      url: new URL(`/blog/${encodeURIComponent(post.slug)}`, base).href,
      lastModified: new Date(post.updated_at),
    })),
  ];
}
