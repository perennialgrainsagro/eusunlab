import type { MetadataRoute } from "next";
import { listPosts } from "./lib/database";
import { siteUrl } from "./lib/site-url";

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
  const [base, posts] = await Promise.all([siteUrl(), listPosts()]);
  return [
    ...pages.map((path) => ({ url: new URL(path, base).href })),
    ...posts.map((post) => ({
      url: new URL(`/blog/${encodeURIComponent(post.slug)}`, base).href,
      lastModified: new Date(post.updated_at),
    })),
  ];
}
