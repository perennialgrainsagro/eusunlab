import Link from "next/link";
import { formatMonth, loadNews, loadSettings } from "../../lib/content.ts";
import { formatText, plainText } from "../../lib/format-text.ts";
import { projectPreview } from "../../lib/projects.ts";
import { newsItemHref, Photo, SubPage } from "../components";

export const metadata = { title: "News" };

// Visible News items from the dashboard, in the dashboard's order.
export default async function NewsPage() {
  const [settings, news] = await Promise.all([loadSettings(), loadNews()]);

  return (
    <SubPage settings={settings.data} back="/" section="News">
      <section className="page__section page__section--intro">
        <h1 className="page__title">News</h1>
      </section>

      <section className="page__section page__section--last">
        {news.data.length ? (
          <div className="post-list">
            {news.data.map((item) => {
              const preview = projectPreview({ ...item, preview_image_url: "", title: plainText(item.title) });
              return (
                <article className="post-item" key={item.slug}>
                  <div className="post-item__copy">
                    <span className="post-item__byline">{formatMonth(item.month)}</span>
                    <h2 className="post-item__title"><Link href={newsItemHref(item.slug)}>{formatText(item.title, false)}</Link></h2>
                    <Link className="link-caps" href={newsItemHref(item.slug)}>Read news →</Link>
                  </div>
                  {preview.src ? (
                    <Link className="post-item__thumb" href={newsItemHref(item.slug)} tabIndex={-1} aria-hidden="true">
                      <Photo className="post-item__img" src={preview.src} alt={plainText(preview.alt)} />
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : <p className="body-text">No news yet. Check back soon.</p>}
      </section>
    </SubPage>
  );
}
