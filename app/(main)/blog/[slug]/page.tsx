import Link from "next/link";
import { notFound } from "next/navigation";
import { renderBlogDocument } from "../../../lib/blog.ts";
import { loadSettings } from "../../../lib/content.ts";
import { readPost } from "../../../lib/database.ts";
import { formatText, plainText } from "../../../lib/format-text.ts";
import { blogHref, Photo, postDate, SubPage } from "../../components";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context) {
  const post = await readPost((await params).slug);
  return { title: plainText(post?.title || "Blog"), description: post ? plainText(post.excerpt) : undefined };
}

export default async function NewBlogPostPage({ params }: Context) {
  const [settings, post] = await Promise.all([loadSettings(), readPost((await params).slug)]);
  if (!post) notFound();

  return (
    <SubPage settings={settings.data} back="/#blog" section="Blog">
      <section className="page__section page__section--intro">
        <span className="page__kicker">
          {post.writer_name ? <>{formatText(post.writer_name, false)} · </> : null}
          <time dateTime={post.published_at || undefined}>{postDate(post.published_at)}</time>
        </span>
        <h1 className="page__title post__title">{formatText(post.title, false)}</h1>
        {post.excerpt ? <p className="page__subtitle">{formatText(post.excerpt)}</p> : null}
      </section>

      {post.main_image_url ? (
        <section className="page__section">
          <figure>
            <Photo className="figure-full" src={post.main_image_url} alt={plainText(post.main_image_alt || post.title)} />
            {post.main_image_alt ? <figcaption>{formatText(post.main_image_alt, false)}</figcaption> : null}
          </figure>
        </section>
      ) : null}

      <section className="page__section page__section--last">
        <div className="prose prose--narrow">{renderBlogDocument(post.body)}</div>
        <Link className="link-caps" href={blogHref}>← All posts</Link>
      </section>
    </SubPage>
  );
}
