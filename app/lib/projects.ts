import { imageUrl } from "./content-schema.ts";
import type { ProjectItem } from "./types.ts";

export function projectPreview(item: Pick<ProjectItem, "preview_image_url" | "image_url" | "image_alt" | "title" | "details">) {
  const preview = imageUrl(item.preview_image_url);
  if (preview) return { src: preview, alt: item.title };
  const src = imageUrl(item.image_url);
  if (src) return { src, alt: item.image_alt || item.title };
  // shortcut: fallback reads inline Markdown images; set Image URL for reference-style images.
  for (const match of item.details.matchAll(/!\[([^\]\r\n]*)\]\(\s*(<[^>\r\n]+>|[^\s)]+)(?:\s+"[^"\r\n]*")?\s*\)/g)) {
    const src = imageUrl(match[2].replace(/^<|>$/g, ""));
    if (src) return { src, alt: match[1] || item.title };
  }
  return { src: "", alt: item.title };
}
