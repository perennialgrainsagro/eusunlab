import { notFound } from "next/navigation";
import { renderBlogDocument } from "../../../lib/blog.ts";
import { loadProjects, loadSettings } from "../../../lib/content.ts";
import { projectVideo } from "../../../lib/content-schema.ts";
import { formatText, plainText } from "../../../lib/format-text.ts";
import { BASE, paragraphs, Photo, splitTitle, SubPage } from "../../components";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context) {
  const { slug } = await params;
  const { data } = await loadProjects();
  const item = data.find((item) => item.slug === slug);
  return { title: plainText(item ? splitTitle(item.title).name : "Projects"), description: item ? plainText(item.summary) : undefined };
}

export default async function NewProjectPage({ params }: Context) {
  const { slug } = await params;
  const [settings, projects] = await Promise.all([loadSettings(), loadProjects()]);
  const index = projects.data.findIndex((item) => item.slug === slug);
  const item = projects.data[index];
  if (!item) notFound();
  const { name, sub } = splitTitle(item.title);
  const video = projectVideo(item.video_url);

  return (
    <SubPage settings={settings.data} back={`${BASE}#projects`} section={`Project ${String(index + 1).padStart(2, "0")} · ${plainText(name)}`}>
      <section className="page__section page__section--intro">
        <h1 className="page__title">{formatText(name, false)}</h1>
        {sub ? <p className="page__subtitle">{formatText(sub)}</p> : null}
      </section>

      {item.image_url ? (
        <section className="page__section">
          <figure>
            <Photo className="figure-full" src={item.image_url} alt={plainText(item.image_alt || name)} />
            {item.image_alt ? <figcaption>{formatText(item.image_alt, false)}</figcaption> : null}
          </figure>
        </section>
      ) : null}

      <section className="page__section">
        <div className="prose prose--narrow">
          {item.details
            ? renderBlogDocument(item.details)
            : paragraphs(item.summary).map((line, i) => <p key={i}>{formatText(line)}</p>)}
        </div>
      </section>

      {video ? (
        <section className="page__section">
          <figure className="project-video">
            {video.kind === "youtube" ? (
              <iframe src={video.url} title={plainText(name) + " video"} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- Caption tracks render when a URL is provided.
              <video src={video.url} controls playsInline preload="none" aria-label={plainText(name) + " video"}>
                {item.video_captions_url ? <track kind="captions" src={item.video_captions_url} srcLang="en" label="English" default /> : null}
                Your browser cannot play this video. <a href={video.url}>Download the video</a>.
              </video>
            )}
            {item.video_caption ? <figcaption>{formatText(item.video_caption)}</figcaption> : null}
          </figure>
        </section>
      ) : null}

      {item.link_url ? (
        <section className="page__section page__section--last">
          <div className="read-more">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer">{formatText(item.link_label || "Learn more", false)} →</a>
          </div>
        </section>
      ) : null}
    </SubPage>
  );
}
