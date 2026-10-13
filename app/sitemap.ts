import type { MetadataRoute } from "next";
import { listPosts } from "./lib/database";
import { siteUrl } from "./lib/site-url";
import { loadProjects } from "./lib/content";

const pages = [
  "/",
  "/members/professor",
  "/members/students",
  "/members/alumni",
  "/research",
  "/projects",
  "/publications",
  "/blog",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [base, posts, projects] = await Promise.all([siteUrl(), listPosts(), loadProjects()]);
  return [
    ...pages.map((path) => ({ url: new URL(path, base).href })),
    ...projects.data.map((item) => ({ url: new URL(`/projects/${encodeURIComponent(item.slug)}`, base).href })),
    ...posts.map((post) => ({
      url: new URL(`/blog/${encodeURIComponent(post.slug)}`, base).href,
      lastModified: new Date(post.updated_at),
    })),
  ];
}
