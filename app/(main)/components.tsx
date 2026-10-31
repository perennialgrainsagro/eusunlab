import Link from "next/link";
import type { ReactNode } from "react";
import { imageUrl } from "../lib/content-schema.ts";
import { formatText } from "../lib/format-text.ts";
import type { Settings } from "../lib/types.ts";
import { Icon, type IconName } from "./icons";

export const professorHref = "/people/professor";
export const projectHref = (slug: string) => `/projects/${slug}`;
export const blogHref = "/blog";
export const postHref = (slug: string) => `${blogHref}/${encodeURIComponent(slug)}`;

export function postDate(value: string | null, style: "medium" | "long" = "long") {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: style, timeZone: "UTC" }).format(new Date(value)) : "";
}

// "PerennialTraits: Showcasing …" → name "PerennialTraits", subtitle "Showcasing …".
export function splitTitle(title: string) {
  const index = title.indexOf(": ");
  return index > 0 ? { name: title.slice(0, index), sub: title.slice(index + 2) } : { name: title, sub: "" };
}

export function paragraphs(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function Photo({ src, alt, className, style }: { src: string; alt: string; className: string; style?: React.CSSProperties }) {
  const url = imageUrl(src);
  if (!url) return null;
  // Dashboard-managed image hosts are not known ahead of deployment.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={url} alt={alt} style={style} loading="lazy" />;
}

export function IconLinks({ name, email, personal, cv, scholar }: { name: string; email?: string; personal?: string; cv?: string; scholar?: string }) {
  const links: [IconName, string, string][] = [
    ["mail", "Email", email ? `mailto:${email}` : ""],
    ["home", "Personal page", personal ?? ""],
    ["cv", "CV", cv ?? ""],
    ["scholar", "Google Scholar", scholar ?? ""],
  ];
  const shown = links.filter(([, , href]) => href);
  if (!shown.length) return null;
  return (
    <div className="icon-links">
      {shown.map(([icon, label, href]) => (
        <a key={icon} className="icon-link" href={href} title={label} aria-label={`${label} · ${name}`}
          target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
          <Icon name={icon} />
        </a>
      ))}
    </div>
  );
}

export function SubPage({ section, back, children, settings }: { section: string; back: string; children: ReactNode; settings: Settings }) {
  return (
    <div className="page">
      <header className="page__bar">
        <Link href={back}>← {settings.lab_name || "Eusun Han Lab"}</Link>
        <span>{section}</span>
      </header>
      <main>{children}</main>
      <footer className="page__footer">
        <span>
          {[settings.footer_text || settings.lab_name, settings.affiliation, settings.address].filter(Boolean).map((part, index) => (
            <span key={index}>{index ? " · " : null}{formatText(part)}</span>
          ))}
        </span>
        <Link href={back}>← Back to lab</Link>
      </footer>
    </div>
  );
}
