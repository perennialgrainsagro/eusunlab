import { notFound } from "next/navigation";
import { readPost } from "../../lib/database.ts";
import { loadSettings } from "../../lib/content.ts";
import { SiteFrame } from "../../site-components";
import { BlogArticle } from "../article";
import { plainText } from "../../lib/format-text.ts";

type Context = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Context) {
  const post = await readPost((await params).slug);
  return { title: plainText(post?.title || "Blog"), description: post ? plainText(post.excerpt) : undefined };
}

export default async function BlogPostPage({ params }: Context) {
  const [settings, post] = await Promise.all([loadSettings(), readPost((await params).slug)]);
  if (!post) notFound();
  return (
    <SiteFrame settings={settings.data} demo={settings.demo} active="blog">
      <BlogArticle post={post} />
    </SiteFrame>
  );
}
