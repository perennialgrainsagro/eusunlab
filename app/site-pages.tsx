import Link from "next/link";
import {
  formatMonth,
  loadAlumni,
  loadNews,
  loadProfessor,
  loadProfessorDetails,
  loadProfessorPublications,
  loadPublications,
  loadProjects,
  loadResearch,
  loadSettings,
  loadStudents,
} from "./lib/content";
import type { Publication, Student } from "./lib/types";
import { firstSentence, formatText, plainText } from "./lib/format-text";
import { listPosts } from "./lib/database.ts";
import { renderBlogDocument } from "./lib/blog.ts";
import { projectVideo } from "./lib/content-schema.ts";
import {
  ExternalLink,
  FallbackImage,
  Multiline,
  SiteFrame,
} from "./site-components";

function EmptyState({ children }: { children: string }) {
  return <div className="empty-state">{children}</div>;
}

function PageHero({ title }: { title: string }) {
  return (
    <div className="container page-hero">
      <h1>{title}</h1>
    </div>
  );
}

function ProfileLinks({ email, personal, cv, scholar }: {
  email?: string;
  personal?: string;
  cv?: string;
  scholar?: string;
}) {
  return (
    <div className="link-row">
      {email ? <ExternalLink href={`mailto:${email}`}>Email</ExternalLink> : null}
      {personal ? <ExternalLink href={personal}>Personal page</ExternalLink> : null}
      {cv ? <ExternalLink href={cv}>CV</ExternalLink> : null}
      {scholar ? <ExternalLink href={scholar}>Google Scholar</ExternalLink> : null}
    </div>
  );
}

export async function HomePage() {
  const [settingsResult, newsResult, cardsResult, recentPosts] = await Promise.all([
    loadSettings(), loadNews(), loadResearch(), listPosts(false, 3),
  ]);
  const settings = settingsResult.data;
  const news = newsResult.data;
  const cards = cardsResult.data.slice(0, 3);
  const demo = settingsResult.demo || newsResult.demo || cardsResult.demo;

  return (
    <SiteFrame settings={settings} demo={demo} active="home">
      <div className="container home-layout">
        <section className="home-content">
          <div className={`hero ${settings.hero_image_url ? "" : "no-image"}`}>
            <div>
              <h1>{formatText(settings.lab_name)}</h1>
              {settings.affiliation ? <p className="affiliation">{formatText(settings.affiliation)}</p> : null}
              {settings.tagline ? <p className="tagline">{formatText(settings.tagline)}</p> : null}
              <Multiline text={settings.introduction} />
            </div>
            {settings.hero_image_url ? (
              <div className="hero-media">
                <FallbackImage
                  src={settings.hero_image_url}
                  alt={plainText(settings.hero_image_alt || `${settings.lab_name} representative image`)}
                  className="content-image"
                />
              </div>
            ) : null}
          </div>
        </section>
        <aside className="home-blog" aria-labelledby="home-blog-title">
          <h2 id="home-blog-title">Latest blog posts</h2>
          <div className="home-blog-list">
            {recentPosts.length ? recentPosts.map((post) => (
              <article className="home-blog-item" key={post.id}>
                {post.published_at ? <time dateTime={post.published_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(post.published_at))}</time> : null}
                <h3><Link href={"/blog/" + encodeURIComponent(post.slug)}>{post.title}</Link></h3>
                {post.excerpt ? <p>{post.excerpt}</p> : null}
              </article>
            )) : <p className="home-blog-empty">No blog posts yet.</p>}
          </div>
          <Link className="home-blog-more" href="/blog" aria-label="More blog posts"><span>More</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></Link>
        </aside>
        {cards.length ? (
          <section className="home-card-section" aria-label="Research areas">
            <div className="home-card-grid">
              {cards.map((card, index) => (
                <Link href={`/research#research-${index + 1}`} className="home-card" key={`${card.title}-${index}`}>
                  <FallbackImage
                    src={card.image_url}
                    alt={plainText(card.image_alt || card.title)}
                    className="content-image"
                  />
                  <div className="home-card-copy">
                    <h2>{formatText(card.title)}</h2>
                    {card.summary ? <p>{formatText(firstSentence(card.summary))}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <section className="section news-section">
          <div>
            <div className="section-heading">
              <h2>News</h2>
            </div>
            {news.length ? (
              <div className="news-list">
                {news.map((item, index) => (
                  <article className="news-item" key={`${item.month}-${index}`}>
                    <time className="news-date">{formatMonth(item.month)}</time>
                    <div className="news-content">
                      <p>{formatText(item.content)}</p>
                      <ExternalLink href={item.link_url} className="text-link">
                        {formatText(item.link_label || "Learn more")} →
                      </ExternalLink>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState>No news has been added yet.</EmptyState>}
          </div>
        </section>
      </div>
    </SiteFrame>
  );
}

export async function ProfessorPage() {
  const [settingsResult, professorResult, detailsResult, publicationsResult] = await Promise.all([
    loadSettings(),
    loadProfessor(),
    loadProfessorDetails(),
    loadProfessorPublications(),
  ]);
  const professor = professorResult.data;
  const details = detailsResult.data;
  const publicationCategories = [...new Set(publicationsResult.data.map((item) => item.category))];
  const sections = [...new Set([
    ...details.map((item) =>
      /^(publication list|publications|selected publications)$/i.test(plainText(item.section).trim())
        ? "Publication List"
        : item.section,
    ),
    "Publication List",
  ])];

  return (
    <SiteFrame
      settings={settingsResult.data}
      demo={settingsResult.demo || professorResult.demo || detailsResult.demo || publicationsResult.demo}
      active="members"
      memberPage="professor"
    >
      <section className="container profile-hero">
        <FallbackImage
          src={professor.photo_url}
          alt={`${plainText(professor.name)} portrait`}
          className="profile-image"
        />
        <div className="profile-copy">
          <h1>{formatText(professor.name)}</h1>
          {professor.secondary_name ? <p className="secondary-name">{formatText(professor.secondary_name)}</p> : null}
          {professor.title ? <p className="role">{formatText(professor.title)}</p> : null}
          {professor.affiliation ? <p className="affiliation">{formatText(professor.affiliation)}</p> : null}
          {professor.bio ? <p className="profile-bio">{formatText(professor.bio)}</p> : null}
          <ProfileLinks
            email={professor.email}
            personal={professor.personal_url}
            cv={professor.cv_url}
            scholar={professor.scholar_url}
          />
        </div>
      </section>
      <section className="section">
        <div className="container">
          {sections.map((section) => (
            <section className="detail-section" key={section}>
              <h2>{formatText(section, true)}</h2>
              {section === "Publication List" ? (
                publicationsResult.data.length ? (
                  <div className="professor-publications">
                    {publicationCategories.map((category) => (
                      <section className="professor-publication-group" key={category}>
                        <h3>{formatText(category)}</h3>
                        {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Preserve list semantics when CSS suppresses native markers. */}
                        <ol className="professor-publication-list" role="list">
                          {publicationsResult.data.filter((item) => item.category === category).map((item, index) => (
                            <li key={index}><span>{formatText(item.content, true)}</span></li>
                          ))}
                        </ol>
                      </section>
                    ))}
                  </div>
                ) : <EmptyState>Publications will be added soon.</EmptyState>
              ) : (
                <ul className="detail-list">
                  {details.filter((item) => item.section === section).map((item, index) => (
                    <li className="detail-item" key={`${item.content}-${index}`}>
                      <p>{formatText(item.content, true)}</p>
                      {item.subtext ? <p className="subtext">{formatText(item.subtext, true)}</p> : null}
                      <ExternalLink href={item.link_url} className="text-link">
                        {formatText(item.link_label || "View")} →
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}

function StudentCard({ student }: { student: Student }) {
  return (
    <article className="member-card">
      <FallbackImage
        src={student.photo_url}
        alt={`${plainText(student.name)} portrait`}
        className="member-image"
      />
      <h3>{formatText(student.name)}</h3>
      {student.secondary_name ? <p className="member-meta">{formatText(student.secondary_name)}</p> : null}
      {student.status ? <p className="role">{formatText(student.status)}</p> : null}
      {student.affiliation ? <p className="member-meta">{formatText(student.affiliation)}</p> : null}
      {student.research_topics ? <p className="member-meta">{formatText(student.research_topics)}</p> : null}
      <ProfileLinks
        email={student.email}
        personal={student.personal_url}
        cv={student.cv_url}
        scholar={student.scholar_url}
      />
    </article>
  );
}

export async function StudentsPage() {
  const [settingsResult, studentsResult] = await Promise.all([loadSettings(), loadStudents()]);
  const students = studentsResult.data;
  const groups = [...new Set(students.map((student) => student.group))];

  return (
    <SiteFrame
      settings={settingsResult.data}
      demo={settingsResult.demo || studentsResult.demo}
      active="members"
      memberPage="students"
    >
      <PageHero title="Peoples" />
      <section className="section">
        <div className="container">
          {groups.length ? groups.map((group) => {
            const members = students.filter((student) => student.group === group);
            return (
              <section className="group-block" key={group}>
                <div className="group-title">
                  <h2>{formatText(group)}</h2>
                  <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                </div>
                <div className="member-grid">
                  {members.map((student, index) => <StudentCard key={`${student.name}-${index}`} student={student} />)}
                </div>
              </section>
            );
          }) : <EmptyState>Student profiles will be added soon.</EmptyState>}
        </div>
      </section>
    </SiteFrame>
  );
}

export async function AlumniPage() {
  const [settingsResult, alumniResult] = await Promise.all([loadSettings(), loadAlumni()]);
  const alumni = alumniResult.data;
  return (
    <SiteFrame
      settings={settingsResult.data}
      demo={settingsResult.demo || alumniResult.demo}
      active="members"
      memberPage="alumni"
    >
      <PageHero title="Alumni" />
      <section className="section">
        <div className="container">
          {alumni.length ? (
            <div className="alumni-list">
              {alumni.map((person, index) => (
                <article className="alumni-card" key={`${person.name}-${index}`}>
                  <h3>{formatText(person.name)}</h3>
                  {person.secondary_name ? <p className="member-meta">{formatText(person.secondary_name)}</p> : null}
                  {[person.degree, person.period].filter(Boolean).length ? (
                    <p className="role">{formatText([person.degree, person.period].filter(Boolean).join(" · "))}</p>
                  ) : null}
                  {person.current_position ? <p className="member-meta">Now: {formatText(person.current_position)}</p> : null}
                  <div className="link-row">
                    <ExternalLink href={person.personal_url}>Personal page</ExternalLink>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState>Alumni profiles will be added soon.</EmptyState>}
        </div>
      </section>
    </SiteFrame>
  );
}

export async function ResearchPage() {
  const [settingsResult, researchResult] = await Promise.all([loadSettings(), loadResearch()]);
  const settings = settingsResult.data;
  const research = researchResult.data;
  return (
    <SiteFrame settings={settings} demo={settingsResult.demo || researchResult.demo} active="research">
      <PageHero title="Research" />
      <section className="section">
        <div className="container research-list">
          {research.length ? research.map((item, index) => (
            <article id={`research-${index + 1}`} className={`research-item ${item.image_url ? "" : "no-image"}`} key={`${item.title}-${index}`}>
              {item.image_url ? (
                <FallbackImage
                  src={item.image_url}
                  alt={plainText(item.image_alt || `${item.title} research`)}
                  className="content-image"
                />
              ) : null}
              <div className="research-copy">
                <h2>{formatText(item.title)}</h2>
                {item.summary ? <p className="summary">{formatText(item.summary)}</p> : null}
                <Multiline text={item.details} />
                <ExternalLink href={item.link_url} className="text-link">
                  {formatText(item.link_label || "Learn more")} →
                </ExternalLink>
              </div>
            </article>
          )) : <EmptyState>Research areas will be added soon.</EmptyState>}
        </div>
      </section>
    </SiteFrame>
  );
}

export async function ProjectsPage() {
  const [settingsResult, projectsResult] = await Promise.all([loadSettings(), loadProjects()]);
  return (
    <SiteFrame settings={settingsResult.data} demo={settingsResult.demo || projectsResult.demo} active="projects">
      <PageHero title="Projects" />
      <section className="section">
        <div className="container research-list">
          {projectsResult.data.length ? projectsResult.data.map((item, index) => {
            const video = projectVideo(item.video_url);
            return (
              <article id={`project-${index + 1}`} className={`research-item project-item ${item.image_url ? "" : "no-image"}`} key={`${item.title}-${index}`}>
                {item.image_url ? <FallbackImage src={item.image_url} alt={plainText(item.image_alt || item.title)} className="content-image" /> : null}
                <div className="research-copy project-copy">
                  <h2>{formatText(item.title)}</h2>
                  {item.summary ? <p className="summary">{formatText(item.summary)}</p> : null}
                  <div className="blog-body project-body">{renderBlogDocument(item.details)}</div>
                  {video ? (
                    <figure className="project-video">
                      {video.kind === "youtube" ? (
                        <iframe src={video.url} title={plainText(item.title) + " video"} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                      ) : (
                        // eslint-disable-next-line jsx-a11y/media-has-caption -- Caption tracks render when a URL is provided.
                        <video src={video.url} controls playsInline preload="none" aria-label={plainText(item.title) + " video"}>
                          {item.video_captions_url ? <track kind="captions" src={item.video_captions_url} srcLang="en" label="English" default /> : null}
                          Your browser cannot play this video. <a href={video.url}>Download the video</a>.
                        </video>
                      )}
                      {item.video_caption ? <figcaption>{formatText(item.video_caption)}</figcaption> : null}
                    </figure>
                  ) : null}
                  <ExternalLink href={item.link_url} className="text-link">{formatText(item.link_label || "Learn more")} →</ExternalLink>
                </div>
              </article>
            );
          }) : <EmptyState>Projects will be added soon.</EmptyState>}
        </div>
      </section>
    </SiteFrame>
  );
}

function PublicationLinks({ publication }: { publication: Publication }) {
  const links = [
    ["Paper", publication.paper_url],
    ["Project", publication.project_url],
    ["Code", publication.code_url],
    ["Video", publication.video_url],
  ];
  return (
    <div className="link-row">
      {links.map(([label, href]) => href ? <ExternalLink key={label} href={href}>{label}</ExternalLink> : null)}
    </div>
  );
}

function PublicationList({ publications }: { publications: Publication[] }) {
  const categories = [...new Set(publications.map((publication) => publication.category))];
  return (
    <>
      {categories.length ? categories.map((category) => {
        const categoryItems = publications.filter((publication) => publication.category === category);
        const years = [...new Set(categoryItems.map((publication) => publication.year))];
        return (
          <section className="publication-category" key={category}>
            <h2>{formatText(category)}</h2>
            {years.map((year) => (
              <div className="publication-year" key={year}>
                <h3>{year || "—"}</h3>
                <ol className="publication-list">
                  {categoryItems.filter((publication) => publication.year === year).map((publication, index) => (
                    <li className="publication-item" key={`${publication.title}-${index}`}>
                      {publication.venue ? <span className="venue">{formatText(publication.venue)}</span> : null}
                      <h3>{formatText(publication.title)}</h3>
                      {publication.authors ? <p className="authors">{formatText(publication.authors)}</p> : null}
                      <PublicationLinks publication={publication} />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        );
      }) : <EmptyState>Publications will be added soon.</EmptyState>}
    </>
  );
}

export async function PublicationsPage() {
  const [settingsResult, publicationsResult] = await Promise.all([loadSettings(), loadPublications()]);
  return (
    <SiteFrame settings={settingsResult.data} demo={settingsResult.demo || publicationsResult.demo} active="publications">
      <PageHero title="Publications" />
      <section className="section">
        <div className="container">
          <PublicationList publications={publicationsResult.data} />
        </div>
      </section>
    </SiteFrame>
  );
}
