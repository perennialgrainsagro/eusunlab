import Link from "next/link";
import { renderBlogDocument, type BlogPost } from "../lib/blog.ts";
import { FallbackImage } from "../fallback-image";

export function BlogArticle({ post, preview = false }: { post: BlogPost; preview?: boolean }) {
  return (
    <article className="container section blog-article">
      {preview ? <div className="blog-preview-notice"><strong>Admin preview · {post.published ? "Published" : "Draft"}</strong><p>Only visible to administrators. Showing the last saved version.</p></div> : null}
      <Link className="text-link" href={preview ? "/admin" : "/blog"}>{preview ? "← Dashboard" : "← All posts"}</Link>
      <header className="blog-article-header">
        <div className="blog-byline">{post.writer_name ? <span>{post.writer_name} · </span> : null}<time dateTime={post.published_at || undefined}>{post.published_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.published_at)) : ""}</time></div>
        <h1>{post.title}</h1>
        {post.excerpt ? <p className="blog-excerpt">{post.excerpt}</p> : null}
      </header>
      {post.main_image_url ? <FallbackImage src={post.main_image_url} alt={post.main_image_alt || post.title} className="content-image blog-main-image" /> : null}
      <div className="blog-body">{renderBlogDocument(post.body)}</div>
    </article>
  );
}
