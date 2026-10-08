import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", base).href,
  };
}
