import { createElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { contentUrl, markdownUrl } from "./content-schema.ts";
import { plainText } from "./format-text.ts";

export type BlogInput = { title: string; writer_name: string; slug: string; excerpt: string; main_image_url: string; main_image_alt: string; body: string; published: boolean };
export type BlogPost = BlogInput & { id: string; published_at: string | null; created_at: string; updated_at: string };

export function makeSlug(title: string) {
  return plainText(title).toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 120).replace(/-$/, "");
}

export function validatePost(value: unknown): BlogInput {
  if (!value || typeof value !== "object") throw new Error("Invalid blog post.");
  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase() : "";
  const writer = typeof input.writer_name === "string" ? input.writer_name.trim() : "";
  const imageUrl = input.main_image_url ?? "";
  const imageAlt = input.main_image_alt ?? "";
  if (!title || title.length > 300) throw new Error("Enter a title of up to 300 characters.");
  if (!slug || slug.length > 120 || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) throw new Error("Use letters, numbers, and hyphens for the blog URL.");
  if (!writer || writer.length > 100) throw new Error("Enter a writer name of up to 100 characters.");
  if (typeof input.excerpt !== "string" || input.excerpt.length > 1000) throw new Error("Keep the summary under 1,000 characters.");
  if (typeof imageUrl !== "string" || imageUrl.length > 2048 || (imageUrl.trim() && !contentUrl(imageUrl))) throw new Error("Use a valid HTTP or HTTPS URL for the main image.");
  if (typeof imageAlt !== "string" || imageAlt.length > 500) throw new Error("Keep the image description under 500 characters.");
  if (typeof input.body !== "string" || input.body.length > 300000) throw new Error("Keep the article under 300,000 characters.");
  if (typeof input.published !== "boolean") throw new Error("Invalid publication status.");
  return { title, writer_name: writer, slug, excerpt: input.excerpt.trim(), main_image_url: imageUrl.trim(), main_image_alt: imageAlt.trim(), body: input.body, published: input.published };
}

export function renderBlogDocument(markdown: string): ReactNode {
  return createElement(Markdown, {
    skipHtml: true,
    remarkPlugins: [remarkGfm],
    urlTransform: markdownUrl,
  }, markdown);
}

export function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString())) return "image/gif";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}
