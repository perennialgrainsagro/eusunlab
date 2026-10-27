import Link from "next/link";
import { loadSettings } from "../../lib/content.ts";
import { listPosts } from "../../lib/database.ts";
import { formatText, plainText } from "../../lib/format-text.ts";
import { BASE, Photo, postDate, postHref, SubPage } from "../components";

export const metadata = { title: "Blog" };

// Published posts from the dashboard's blog editor, newest first (same source as /blog).
export default async function NewBlogPage() {
  const [settings, posts] = await Promise.all([loadSettings(), listPosts()]);

  return (
    <SubPage settings={settings.data} back={`${BASE}#blog`} section="Blog">
      <section className="page__section page__section--intro">
        <h1 className="page__title">Blog</h1>
      </section>

      <section className="page__section page__section--last">
        {posts.length ? (
          <div className="post-list">
            {posts.map((post) => (
              <article className="post-item" key={post.id}>
                <div className="post-item__copy">
                  <span className="post-item__byline">
                    {post.writer_name ? <>{formatText(post.writer_name, false)} · </> : null}
                    <time dateTime={post.published_at || undefined}>{postDate(post.published_at)}</time>
                  </span>
                  <h2 className="post-item__title"><Link href={postHref(post.slug)}>{formatText(post.title, false)}</Link></h2>
                  {post.excerpt ? <p className="body-text">{formatText(post.excerpt)}</p> : null}
                  <Link className="link-caps" href={postHref(post.slug)}>Read article →</Link>
                </div>
                {post.main_image_url ? (
                  <Link className="post-item__thumb" href={postHref(post.slug)} tabIndex={-1} aria-hidden="true">
                    <Photo className="post-item__img" src={post.main_image_url} alt={plainText(post.main_image_alt || post.title)} />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : <p className="body-text">No blog posts yet. Check back soon.</p>}
      </section>
    </SubPage>
  );
}
