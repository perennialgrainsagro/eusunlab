import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE, validSession } from "../../../lib/admin-auth.ts";
import { readPost } from "../../../lib/database.ts";
import { loadSettings } from "../../../lib/content.ts";
import { SiteFrame } from "../../../site-components";
import { BlogArticle } from "../../../blog/article";

export const metadata = { title: "Blog preview", robots: { index: false, follow: false } };

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!validSession((await cookies()).get(SESSION_COOKIE)?.value)) notFound();
  const [settings, post] = await Promise.all([loadSettings(), readPost((await params).id, true)]);
  if (!post) notFound();
  return <SiteFrame settings={settings.data} demo={settings.demo} active="blog"><BlogArticle post={post} preview /></SiteFrame>;
}
