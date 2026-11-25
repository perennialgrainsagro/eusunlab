import Image from "next/image";
import Link from "next/link";
import {
  formatMonth,
  loadNews,
  loadProfessor,
  loadProjects,
  loadPublications,
  loadResearch,
  loadSettings,
  loadStudents,
  newsHeading,
} from "../lib/content.ts";
import { listPosts } from "../lib/database.ts";
import { formatText, plainText } from "../lib/format-text.ts";
import { blogHref, IconLinks, newsHref, newsItemHref, paragraphs, Photo, postDate, postHref, professorHref, projectHref, splitTitle } from "./components";
import { BackToTop } from "./back-to-top";
import { LabRoot } from "./lab-root";
import { MobileMenu } from "./mobile-menu";
import { imageUrl } from "../lib/content-schema.ts";
import { methodPhotoPositions, projectFacts, projectSpecies } from "./static-content";

const layers = ["Surface", "Research", "Projects", "Methods", "People", "Publications", "Join us", "Contact"];
const layerIds = ["top", "research", "projects", "methods", "people", "publications", "join", "contact"];
const layerOf = (id: string) => layerIds.indexOf(id);
const SELECTED_PUBLICATIONS = 5;
const RECENT = 3;

const pad = (index: number) => String(index + 1).padStart(2, "0");

function LayerLabel({ index }: { index: number }) {
  return <div className="layer__label">{pad(index - 1)} · {layers[index]}</div>;
}

export default async function NewHomePage() {
  const [settingsResult, research, projects, professor, students, publications, news, posts] = await Promise.all([
    loadSettings(), loadResearch(), loadProjects(), loadProfessor(), loadStudents(), loadPublications(), loadNews(), listPosts(false, RECENT),
  ]);
  const settings = settingsResult.data;
  const labName = settings.lab_name || "Eusun Han Lab";
  const lastSpace = labName.lastIndexOf(" ");
  const kicker = settings.tagline || research.data.map((item) => plainText(item.title)).join(" · ");
  const pi = professor.data;
  const piBio = paragraphs(pi.bio)[0] ?? "";
  const email = settings.contact_email || pi.email;
  const methodBlocks = [
    { title: settings.methods_block_1_title, text: settings.methods_block_1_text },
    { title: settings.methods_block_2_title, text: settings.methods_block_2_text },
  ];
  const methodPhotos = [
    { src: settings.methods_photo_1_image_url, alt: settings.methods_photo_1_image_alt, caption: settings.methods_photo_1_caption },
    { src: settings.methods_photo_2_image_url, alt: settings.methods_photo_2_image_alt, caption: settings.methods_photo_2_caption },
    { src: settings.methods_photo_3_image_url, alt: settings.methods_photo_3_image_alt, caption: settings.methods_photo_3_caption },
  ].filter((photo) => photo.src);
  // Latest News + Blog shown on the first screen.
  const feeds = [
    { id: "news", title: "News", href: newsHref, empty: "No news yet.", items: news.data.slice(0, RECENT).map((item) => ({ key: item.slug, href: newsItemHref(item.slug), date: formatMonth(item.month), title: newsHeading(item.title, item.content) })) },
    { id: "blog", title: "Blog", href: blogHref, empty: "No blog posts yet.", items: posts.map((post) => ({ key: post.id, href: postHref(post.slug), date: postDate(post.published_at, "medium"), title: post.title })) },
  ];

  return (
    <LabRoot>
      <canvas className="roots-canvas" data-roots-canvas aria-hidden="true" />
      <MobileMenu items={layers.slice(1).map((label, i) => ({ label, id: layerIds[i + 1], layer: i + 1 }))} />
      <BackToTop />

      <nav className="depth-meter" data-depth-meter aria-label="Sections">
        {layers.map((label, index) => (
          <button key={label} type="button" className="depth-meter__stop" style={{ top: `${(index / (layers.length - 1)) * 100}%` }} data-go={index}>{label}</button>
        ))}
        <span className="depth-meter__dot" data-depth-dot />
      </nav>

      <header className="hero" data-layer={layerOf("top")} id="top">
        <div className="hero__head">
          <div className="hero__top">
            <Image className="hero__logo" src="/newpage/img/logo.png" alt={plainText(labName)} width={277} height={70} priority />
            <nav className="top-nav" aria-label="Page sections">
              {layers.slice(1).map((label, i) => (
                <a key={label} href={`#${layerIds[i + 1]}`} data-go={i + 1}>{label}</a>
              ))}
            </nav>
          </div>
        </div>
        <div className="hero__body">
          <div className="hero__main">
            {kicker ? <div className="hero__kicker">{formatText(kicker, false)}</div> : null}
            <h1 className="hero__title">
              {lastSpace > 0 ? <>{labName.slice(0, lastSpace)}<br /><em>{labName.slice(lastSpace + 1)}</em></> : labName}
            </h1>
            {settings.introduction ? <p className="hero__intro">{formatText(settings.introduction)}</p> : null}
            <div className="hero__picker">
              <span className="hero__picker-label" id="crop-label">Root system shown</span>
              <div className="hero__picker-row" role="group" aria-labelledby="crop-label">
                <button type="button" className="pill crop-btn" data-crop="grass" aria-pressed="true">Intermediate wheatgrass · fibrous</button>
                <button type="button" className="pill crop-btn" data-crop="silphium" aria-pressed="false">Silphium · taproot</button>
              </div>
            </div>
          </div>
          <div className="hero__feed">
            {feeds.map((feed) => (
              <section className="feed" key={feed.id} aria-labelledby={`${feed.id}-title`}>
                <div className="feed__head">
                  <h2 className="feed__title" id={`${feed.id}-title`}>{feed.title}</h2>
                  <Link href={feed.href}>More →</Link>
                </div>
                {feed.items.length ? feed.items.map((item) => (
                  <Link className="feed__item" href={item.href} key={item.key}>
                    <span className="feed__date">{item.date}</span>
                    <span className="feed__name">{formatText(item.title, false)}</span>
                  </Link>
                )) : <p className="feed__empty">{feed.empty}</p>}
              </section>
            ))}
          </div>
        </div>
        <div className="hero__scroll">Scroll down into the soil</div>
      </header>

      <main className="soil">
        <section className="layer" data-layer={layerOf("research")} id="research" aria-labelledby="research-title">
          <LayerLabel index={layerOf("research")} />
          <div className="panel" style={{ "--panel-gap": "28px" } as React.CSSProperties}>
            <h2 className="panel__title" id="research-title">{formatText(settings.research_heading || "Research", false)}</h2>
            {research.data.map((item, index) => (
              <div className="theme" key={index}>
                <span className="theme__num">{pad(index)}</span>
                <strong className="theme__title">{formatText(item.title)}</strong>
                <div className="theme__body">
                  {item.summary ? <p className="theme__summary">{formatText(item.summary)}</p> : null}
                  {paragraphs(item.details).map((line, i) => <p key={i}>{formatText(line)}</p>)}
                  {item.link_url ? <p><a href={item.link_url}>{formatText(item.link_label || "Learn more", false)} →</a></p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="layer" data-layer={layerOf("projects")} id="projects" aria-labelledby="projects-title">
          <LayerLabel index={layerOf("projects")} />
          <div className="panel" style={{ "--panel-gap": "36px" } as React.CSSProperties}>
            <h2 className="panel__title" id="projects-title">Projects &amp; field sites</h2>
            <span className="mono-label">{projectFacts}</span>
            <div className="chips">
              {projectSpecies.map((name) => <span className="chip" key={name}>{name}</span>)}
            </div>
            <div className="project-list">
              {projects.data.map((item, index) => {
                const { name, sub } = splitTitle(item.title);
                return (
                  <Link className="project-link" href={projectHref(item.slug)} key={item.slug}>
                    <div className="project-link__head"><h3 className="project-link__name">{formatText(name, false)}</h3><span className="project-link__num">{pad(index)}</span></div>
                    {sub ? <span className="project-link__sub">{formatText(sub, false)}</span> : null}
                    {item.summary ? <p className="project-link__text">{formatText(item.summary, false)}</p> : null}
                    <span className="project-link__cta">Project page →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="layer" data-layer={layerOf("methods")} id="methods" aria-labelledby="methods-title">
          <LayerLabel index={layerOf("methods")} />
          <div className="panel" style={{ "--panel-gap": "26px" } as React.CSSProperties}>
            <h2 className="panel__title" id="methods-title">{formatText(settings.methods_heading || "Methods & tools", false)}</h2>
            {settings.methods_manual_url ? <a className="manual-link" href={settings.methods_manual_url} target="_blank" rel="noopener noreferrer">{formatText(settings.methods_manual_label || "Methods manual", false)} →</a> : null}
            <div className="block block--loose">
              <strong className="block__title">{formatText(settings.methods_segmentation_title)}</strong>
              <span className="block__text">{formatText(settings.methods_segmentation_text)}</span>
              <div className="seg-row">
                <button type="button" className="pill seg-btn" data-seg-toggle aria-pressed="false">Show segmentation view</button>
                <div className="seg-legend" data-seg-legend hidden>
                  <span><i style={{ background: "#f0b44c" }} />primary</span>
                  <span><i style={{ background: "#4fd0c0" }} />1st-order lateral</span>
                  <span><i style={{ background: "#e77bb4" }} />2nd-order lateral</span>
                </div>
              </div>
            </div>
            {methodBlocks.map((block, index) => block.title || block.text ? (
              <div className="block" key={index}>
                <strong className="block__title">{formatText(block.title)}</strong>
                <span className="block__text">{formatText(block.text)}</span>
              </div>
            ) : null)}
            {settings.methods_facilities_title || settings.methods_facilities_text ? (
              <div className="block block--loose">
                <strong className="block__title">{formatText(settings.methods_facilities_title)}</strong>
                <span className="block__text" style={{ fontSize: 14, marginTop: 12 }}>{formatText(settings.methods_facilities_text)}</span>
              </div>
            ) : null}
            {/* Plain <img> as in eusun-lab-website: next/image's size attributes would override the 3/4 crop in .method-photos. */}
            {settings.methods_toolkit_image_url ? (
              <figure className="toolkit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(settings.methods_toolkit_image_url)} alt={plainText(settings.methods_toolkit_image_alt)} width={1280} height={980} loading="lazy" />
                {settings.methods_toolkit_caption ? <figcaption>{formatText(settings.methods_toolkit_caption)}</figcaption> : null}
              </figure>
            ) : null}
            {methodPhotos.length ? (
              <div className="method-photos">
                {methodPhotos.map((photo) => (
                  <figure key={photo.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(photo.src)} alt={plainText(photo.alt)} style={{ objectPosition: methodPhotoPositions[photo.src] }} loading="lazy" />
                    {photo.caption ? <figcaption>{formatText(photo.caption)}</figcaption> : null}
                  </figure>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="layer" data-layer={layerOf("people")} id="people" aria-labelledby="people-title">
          <LayerLabel index={layerOf("people")} />
          <div className="panel panel--wide" style={{ "--panel-gap": "30px" } as React.CSSProperties}>
            <h2 className="panel__title" id="people-title">People</h2>
            <div className="pi">
              <div className="photo-frame"><Photo className="pi__photo" src={pi.photo_url} alt={plainText(pi.name)} /></div>
              <div className="pi__info">
                <span className="pi__role">Principal investigator</span>
                <strong className="pi__name">{formatText(pi.name)}</strong>
                {pi.title ? <span className="pi__title">{formatText(pi.title)}</span> : null}
                {piBio ? <p className="pi__bio">{formatText(piBio)}</p> : null}
                {pi.email ? <a className="link-mail" href={`mailto:${pi.email}`}>{pi.email}</a> : null}
                <Link className="link-caps" href={professorHref}>Full profile →</Link>
              </div>
            </div>
            <div className="team">
              {students.data.map((member, index) => (
                <div className="member" key={index}>
                  <div className="photo-frame"><Photo className="member__photo" src={member.photo_url} alt={plainText(member.name)} style={{ objectPosition: "50% 20%" }} /></div>
                  <strong className="member__name">{formatText(member.name, false)}</strong>
                  {member.status || member.group ? <span className="member__role">{formatText(member.status || member.group, false)}</span> : null}
                  {member.research_topics ? <span className="member__focus">{formatText(member.research_topics)}</span> : null}
                  <IconLinks name={plainText(member.name)} email={member.email} personal={member.personal_url} cv={member.cv_url} scholar={member.scholar_url} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="layer" data-layer={layerOf("publications")} id="publications" aria-labelledby="publications-title">
          <LayerLabel index={layerOf("publications")} />
          <div className="panel">
            <h2 className="panel__title panel__title--tight" id="publications-title">Selected publications</h2>
            {publications.data.slice(0, SELECTED_PUBLICATIONS).map((item, index) => (
              <div className="entry" key={index}>
                <span className="entry__date">{item.year || ""}</span>
                <div className="entry__body">
                  {item.paper_url
                    ? <a className="entry__title" href={item.paper_url} target="_blank" rel="noopener noreferrer">{formatText(item.title, false)}</a>
                    : <span className="entry__title">{formatText(item.title)}</span>}
                  <span className="entry__meta">
                    {formatText(item.authors)}
                    {item.venue ? <> · <em>{formatText(item.venue)}</em></> : null}
                  </span>
                </div>
              </div>
            ))}
            <div className="panel-links">
              <Link href="/publications">Full publication list →</Link>
              {pi.scholar_url ? <a href={pi.scholar_url} target="_blank" rel="noopener noreferrer">Google Scholar →</a> : null}
            </div>
          </div>
        </section>

        <section className="layer layer--short" data-layer={layerOf("join")} id="join" aria-labelledby="join-title">
          <LayerLabel index={layerOf("join")} />
          <div className="panel" style={{ "--panel-gap": "22px" } as React.CSSProperties}>
            <h2 className="panel__title" id="join-title">{formatText(settings.join_us_heading || "Join us", false)}</h2>
            {settings.join_us_intro ? <p className="join__lede">{formatText(settings.join_us_intro)}</p> : null}
            {settings.join_us_description ? <p className="join__text">{formatText(settings.join_us_description)}</p> : null}
            {settings.join_us_email ? (
              <a className="btn-gold" href={`mailto:${settings.join_us_email}`}>{plainText(settings.join_us_contact_label)} {settings.join_us_email}</a>
            ) : null}
            {settings.join_us_course_title ? (
              <div className="course">
                <strong>{formatText(settings.join_us_course_title)}</strong>
                {settings.join_us_course_description ? <span>{formatText(settings.join_us_course_description)}</span> : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="contact" data-layer={layerOf("contact")} id="contact" aria-label="Contact">
          <LayerLabel index={layerOf("contact")} />
          <div className="contact__grid">
            <div className="contact__brand">
              <Image src="/newpage/img/logo-symbol.png" alt="" width={48} height={48} />
              <strong>{formatText(labName, false)}</strong>
              {settings.affiliation ? <span>{formatText(settings.affiliation)}</span> : null}
            </div>
            {email ? <div className="contact__col"><span className="mono-label">Email</span><a className="contact__email" href={`mailto:${email}`}>{email}</a></div> : null}
            {settings.address ? <div className="contact__col"><span className="mono-label">Address</span><span className="contact__address">{formatText(settings.address)}</span></div> : null}
            <button type="button" className="pill back-top" data-go="0">↑ Back to the surface</button>
          </div>
        </section>
      </main>
    </LabRoot>
  );
}
