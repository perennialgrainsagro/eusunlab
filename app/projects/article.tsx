import Link from "next/link";
import { renderBlogDocument } from "../lib/blog.ts";
import { projectVideo } from "../lib/content-schema.ts";
import { formatText, plainText } from "../lib/format-text.ts";
import type { ProjectItem } from "../lib/types.ts";
import { ExternalLink, FallbackImage } from "../site-components";

export function ProjectArticle({ item }: { item: ProjectItem }) {
  const video = projectVideo(item.video_url);
  return (
    <article className="container section blog-article project-article">
      <Link className="text-link" href="/projects">← All projects</Link>
      <header className="blog-article-header">
        <h1>{formatText(item.title)}</h1>
        {item.summary ? <p className="blog-excerpt">{formatText(item.summary)}</p> : null}
      </header>
      {item.image_url ? <FallbackImage src={item.image_url} alt={plainText(item.image_alt || item.title)} className="content-image blog-main-image" /> : null}
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
    </article>
  );
}
