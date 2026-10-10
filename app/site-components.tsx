import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { FallbackImage } from "./fallback-image";
import type { Settings } from "./lib/types";
import { formatText, plainText } from "./lib/format-text";
import { MobileNavigation } from "./mobile-navigation";

export type ActivePage = "home" | "members" | "research" | "projects" | "publications" | "blog";

export function ExternalLink({ href, children, className }: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (!href) return null;
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
    >
      {children}
    </a>
  );
}

export function Multiline({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="multiline">
      {text.split(/\r?\n/).filter(Boolean).map((line, index) => (
        <p key={index}>{formatText(line)}</p>
      ))}
    </div>
  );
}

function Header({ settings, active, memberPage }: {
  settings: Settings;
  active: ActivePage;
  memberPage?: string;
}) {
  const memberLinks = [
    ["PI", "/members/professor"],
    ["Members", "/members/students"],
    ["Alumni", "/members/alumni"],
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="site-masthead">
        <div className="brand-shell">
          <Link className="brand" href="/">
            <Image
              className="brand-logo"
              src="/logos/logo-transparent.png"
              alt={plainText(settings.lab_name || "Eusun Han Lab")}
              width={640}
              height={162}
              loading="eager"
              unoptimized
            />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="nav-shell">
          <nav className="site-nav" aria-label="Primary navigation">
            <Link className={`nav-link ${active === "home" ? "active" : ""}`} href="/">Home</Link>
            <div className={`member-menu ${active === "members" ? "active" : ""}`}>
              <button className="member-trigger" type="button" aria-haspopup="true">
                Team
              </button>
              <div className="member-submenu">
                {memberLinks.map(([label, href]) => (
                  <Link key={href} href={href} className={href === `/members/${memberPage}` ? "active" : ""}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <Link className={`nav-link ${active === "research" ? "active" : ""}`} href="/research">Research</Link>
            <Link className={`nav-link ${active === "projects" ? "active" : ""}`} href="/projects" aria-current={active === "projects" ? "page" : undefined}>Projects</Link>
            <Link className={`nav-link ${active === "publications" ? "active" : ""}`} href="/publications">Publications</Link>
            <Link className={"nav-link " + (active === "blog" ? "active" : "")} href="/blog">Blog</Link>
          </nav>
          <MobileNavigation labName={formatText(settings.lab_name || "Eusun Han Lab")} active={active} memberPage={memberPage} memberLinks={memberLinks} />
        </div>
      </header>
    </>
  );
}

function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <Link className="footer-logo" href="/" aria-label="Eusun Han Lab home">
          <Image src="/logos/logo-symbol.png" alt="" width={192} height={192} unoptimized />
        </Link>
        <div>
          <p>{formatText(settings.footer_text || settings.lab_name)}</p>
          {settings.affiliation ? <p>{formatText(settings.affiliation)}</p> : null}
        </div>
        <div className="footer-contact">
          {settings.contact_email ? (
            <p><ExternalLink href={`mailto:${settings.contact_email}`}>{settings.contact_email}</ExternalLink></p>
          ) : null}
          {settings.address ? <p>{formatText(settings.address)}</p> : null}
        </div>
      </div>
    </footer>
  );
}

export function SiteFrame({ settings, demo, active, memberPage, children }: {
  settings: Settings;
  demo: boolean;
  active: ActivePage;
  memberPage?: string;
  children: ReactNode;
}) {
  return (
    <div className="site-frame" data-page={memberPage || active}>
      <Header settings={settings} active={active} memberPage={memberPage} />
      <div className="site-scroll">
        {demo ? (
          <aside className="demo-banner" aria-label="Sample content notice">
            <p>Sample content is shown. Upload the template to Google Sheets and set GOOGLE_SHEET_ID to use live content.</p>
          </aside>
        ) : null}
        <main id="main-content" className="page-main">{children}</main>
        <Footer settings={settings} />
      </div>
    </div>
  );
}

export { FallbackImage };
