import { loadProfessor, loadProfessorDetails, loadProfessorPublications, loadSettings } from "../../../lib/content.ts";
import { contentUrl } from "../../../lib/content-schema.ts";
import { formatText, plainText } from "../../../lib/format-text.ts";
import type { ProfessorDetail } from "../../../lib/types.ts";
import { paragraphs, Photo, SubPage } from "../../components";

const PUBLICATIONS = "Publication List";

// Dashboard row → the eusun-lab-website timeline layout:
//   content "**Postdoc,** Dept…, University"  subtext "2016.04.01-2020.05.27, Denmark"
//   → when "2016.04.01-2020.05.27", title "Postdoc", place "Dept…, University · Denmark".
// A bold title without a trailing comma ("**Ph.D.** Agricultural Sciences, …") runs to the first comma.
// Rows without a leading bold title (media, awards) render as a single line of text.
function timelineEntry(item: ProfessorDetail) {
  const comma = item.subtext.indexOf(", ");
  const when = comma < 0 ? item.subtext : item.subtext.slice(0, comma);
  const location = comma < 0 ? "" : item.subtext.slice(comma + 2);
  const match = /^\*\*(.+?)\*\*\s*(.*)$/.exec(item.content);
  if (!match) return { when, title: "", place: "", text: item.content };
  const [, bold, after] = match;
  let title = bold, rest = after;
  if (/,\s*$/.test(bold)) title = bold.replace(/,\s*$/, "");
  else {
    const next = after.indexOf(", ");
    title = `${bold} ${next < 0 ? after : after.slice(0, next)}`.trim();
    rest = next < 0 ? "" : after.slice(next + 2);
  }
  return { when, title, place: [rest.trim(), location].filter(Boolean).join(" · "), text: "" };
}

// A trailing "[label](https://doi.org/…)" becomes the separate DOI link of the original layout.
function citation(content: string) {
  const match = /\s*\[[^\]}]*[\]}]\((https?:\/\/[^)\s]+)\)\.?\s*$/.exec(content);
  const url = match ? contentUrl(match[1], false) : "";
  if (!match || !url) return { cite: content, url: "", label: "" };
  return { cite: content.slice(0, match.index).trim(), url, label: url.replace(/^https?:\/\//, "") };
}

export async function generateMetadata() {
  const { data } = await loadProfessor();
  return { title: plainText(data.name) };
}

export default async function NewProfessorPage() {
  const [settings, professorResult, detailsResult, publicationsResult] = await Promise.all([
    loadSettings(), loadProfessor(), loadProfessorDetails(), loadProfessorPublications(),
  ]);
  const professor = professorResult.data;
  const details = detailsResult.data;
  const publications = publicationsResult.data;
  const categories = [...new Set(publications.map((item) => item.category))];
  // Same placement rule as /legacy_page/members/professor: a "Publication List"-like section keeps its position, otherwise it goes last.
  const sections = [...new Set([
    ...details.map((item) => /^(publication list|publications|selected publications)$/i.test(plainText(item.section).trim()) ? PUBLICATIONS : item.section),
    PUBLICATIONS,
  ])];
  const links = [
    ["Email", professor.email ? `mailto:${professor.email}` : ""],
    ["Personal page", professor.personal_url],
    ["CV", professor.cv_url],
    ["Google Scholar", professor.scholar_url],
  ].filter(([, href]) => href);

  return (
    <SubPage settings={settings.data} back="/#people" section="People · Principal investigator">
      <section className="page__section page__section--intro profile">
        <Photo className="profile__photo" src={professor.photo_url} alt={plainText(professor.name)} />
        <div className="profile__info">
          <span className="page__kicker">{[professor.title, professor.affiliation].filter(Boolean).map(plainText).join(" · ")}</span>
          <h1 className="page__title profile__title">{formatText(professor.name, false)}</h1>
          {professor.secondary_name ? <p className="page__subtitle">{formatText(professor.secondary_name)}</p> : null}
          {paragraphs(professor.bio).map((line, i) => <p className="lead" key={i}>{formatText(line)}</p>)}
          <div className="profile__links">
            {links.map(([label, href]) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{label}</a>
            ))}
          </div>
        </div>
      </section>

      {sections.map((section) => section === PUBLICATIONS ? (
        publications.length ? (
          <section className="page__section page__section--last" id="publications" key={section}>
            <h2 className="page__h2 page__h2--md">Publication list</h2>
            {categories.map((category, index) => (
              <div key={category}>
                <h3 className={`pub-group${index ? " pub-group--spaced" : ""}`}>{formatText(category, false)}</h3>
                {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Preserve list semantics when CSS suppresses native markers. */}
                <ol className="pubs" role="list">
                  {publications.filter((item) => item.category === category).map((item, i) => {
                    const { cite, url, label } = citation(item.content);
                    return (
                      <li key={i}>
                        <div className="pubs__body">
                          <span className="pubs__cite">{formatText(cite)}</span>
                          {url ? <a className="pubs__doi" href={url} target="_blank" rel="noopener noreferrer">{label}</a> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        ) : null
      ) : (
        <section className="page__section" key={section}>
          <h2 className="page__h2 page__h2--md">{formatText(section, false)}</h2>
          <div className="timeline">
            {details.filter((item) => item.section === section).map((item, i) => {
              const entry = timelineEntry(item);
              const link = item.link_url ? <> <a href={item.link_url} target="_blank" rel="noopener noreferrer">{formatText(item.link_label || "View", false)} →</a></> : null;
              return (
                <div key={i}>
                  <span className="timeline__when">{formatText(entry.when, false)}</span>
                  {entry.title ? (
                    <div className="timeline__what">
                      <strong>{formatText(entry.title)}</strong>
                      {entry.place || link ? <span>{formatText(entry.place)}{link}</span> : null}
                    </div>
                  ) : (
                    <span className="timeline__text">{formatText(entry.text)}{link}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </SubPage>
  );
}
