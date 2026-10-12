import Link from "next/link";
import { listPosts } from "../lib/database.ts";
import { loadSettings } from "../lib/content.ts";
import { SiteFrame } from "../site-components";
import { FallbackImage } from "../fallback-image";
import { formatText, plainText } from "../lib/format-text.ts";

export const metadata = { title: "Blog" };
export default async function BlogPage() {
  const [settings, posts] = await Promise.all([loadSettings(), listPosts()]);
  return (
    <SiteFrame settings={settings.data} demo={settings.demo} active="blog">
      <div className="container page-hero"><h1>Blog</h1></div>
      <section className="container section">
        {posts.length ? (
          <div className="blog-list">
            {posts.map((post) => (
              <article className="blog-list-item" key={post.id}>
                <div className="blog-list-copy">
                <div className="blog-byline">{post.writer_name ? <span>{formatText(post.writer_name)} · </span> : null}<time dateTime={post.published_at || undefined}>{post.published_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.published_at)) : ""}</time></div>
                <h2 className="linked-content">{formatText(post.title)}<Link className="content-link-overlay" href={"/blog/" + encodeURIComponent(post.slug)} aria-label={plainText(post.title)} /></h2>
                {post.excerpt ? <p>{formatText(post.excerpt)}</p> : null}
                <Link className="text-link" href={"/blog/" + encodeURIComponent(post.slug)}>Read article →</Link>
                </div>
                {post.main_image_url ? <Link className="blog-thumbnail-link" href={"/blog/" + encodeURIComponent(post.slug)}><FallbackImage src={post.main_image_url} alt={plainText(post.main_image_alt || post.title)} className="content-image blog-thumbnail" /></Link> : null}
              </article>
            ))}
          </div>
        ) : <p className="empty-state">No blog posts yet. Check back soon.</p>}
      </section>
    </SiteFrame>
  );
}
