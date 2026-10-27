import { loadPublications, loadSettings } from "../../lib/content.ts";
import { formatText } from "../../lib/format-text.ts";
import type { Publication } from "../../lib/types.ts";
import { BASE, SubPage } from "../components";

export const metadata = { title: "Publications" };

function PublicationLinks({ publication }: { publication: Publication }) {
  const links = [
    ["Paper", publication.paper_url],
    ["Project", publication.project_url],
    ["Code", publication.code_url],
    ["Video", publication.video_url],
  ].filter(([, href]) => href);
  if (!links.length) return null;
  return (
    <div className="pub-links">
      {links.map(([label, href]) => (
        <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{label} →</a>
      ))}
    </div>
  );
}

// Same grouping as /publications: category (dashboard order) → year (newest first) → display_order.
export default async function NewPublicationsPage() {
  const [settings, publications] = await Promise.all([loadSettings(), loadPublications()]);
  const categories = [...new Set(publications.data.map((item) => item.category))];

  return (
    <SubPage settings={settings.data} back={`${BASE}#publications`} section="Publications">
      <section className="page__section page__section--intro">
        <h1 className="page__title">Publications</h1>
      </section>

      {categories.length ? categories.map((category, index) => {
        const items = publications.data.filter((item) => item.category === category);
        const years = [...new Set(items.map((item) => item.year))];
        return (
          <section className={`page__section${index === categories.length - 1 ? " page__section--last" : ""}`} key={category}>
            <h2 className="page__h2 page__h2--md">{formatText(category, false)}</h2>
            <div className="pub-years">
              {years.map((year) => (
                <div className="pub-year" key={year}>
                  <span className="pub-year__label">{year || "—"}</span>
                  {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Preserve list semantics when CSS suppresses native markers. */}
                  <ol className="pub-year__list" role="list">
                    {items.filter((item) => item.year === year).map((item, i) => (
                      <li className="pub-item" key={`${item.title}-${i}`}>
                        {item.venue ? <span className="pub-item__venue">{formatText(item.venue, false)}</span> : null}
                        <strong className="pub-item__title">{formatText(item.title)}</strong>
                        {item.authors ? <span className="pub-item__authors">{formatText(item.authors)}</span> : null}
                        <PublicationLinks publication={item} />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        );
      }) : (
        <section className="page__section page__section--last">
          <p className="body-text">Publications will be added soon.</p>
        </section>
      )}
    </SubPage>
  );
}
