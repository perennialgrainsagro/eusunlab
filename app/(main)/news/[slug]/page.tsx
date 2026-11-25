import Link from "next/link";
import { notFound } from "next/navigation";
import { renderBlogDocument } from "../../../lib/blog.ts";
import { formatMonth, loadNews, loadSettings } from "../../../lib/content.ts";
import { bodySummary, formatText, plainText } from "../../../lib/format-text.ts";
import { newsHref, Photo, SubPage } from "../../components";

type Context = { params: Promise<{ slug: string }> };

async function findNews(slug: string) {
  return (await loadNews()).data.find((item) => item.slug === slug);
}

export async function generateMetadata({ params }: Context) {
  const item = await findNews((await params).slug);
  return { title: plainText(item ? item.title : "News"), description: item ? plainText(bodySummary(item.details)) || undefined : undefined };
}

export default async function NewsItemPage({ params }: Context) {
  const [settings, item] = await Promise.all([loadSettings(), findNews((await params).slug)]);
  if (!item) notFound();
  return (
    <SubPage settings={settings.data} back="/" section="News">
      <section className="page__section page__section--intro">
        <span className="page__kicker">{formatMonth(item.month)}</span>
        <h1 className="page__title post__title">{formatText(item.title, false)}</h1>
      </section>

      {item.image_url ? (
        <section className="page__section">
          <figure>
            <Photo className="figure-full" src={item.image_url} alt={plainText(item.image_alt || item.title)} />
            {item.image_alt ? <figcaption>{formatText(item.image_alt, false)}</figcaption> : null}
          </figure>
        </section>
      ) : null}

      <section className="page__section page__section--last">
        {item.details ? <div className="prose prose--narrow">{renderBlogDocument(item.details)}</div> : null}
        {item.link_url ? (
          <div className="read-more">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer">{formatText(item.link_label || "Learn more", false)} →</a>
          </div>
        ) : null}
        <Link className="link-caps" href={newsHref}>← All news</Link>
      </section>
    </SubPage>
  );
}
