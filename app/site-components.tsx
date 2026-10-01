import Link from "next/link";
import type { ReactNode } from "react";
import { FallbackImage } from "./fallback-image";
import type { Settings } from "./lib/types";
import { formatText } from "./lib/format-text";
import { MobileNavigation } from "./mobile-navigation";

export type ActivePage = "home" | "members" | "research" | "publications";

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
    ["Professor", "/members/professor"],
    ["Students", "/members/students"],
    ["Alumni", "/members/alumni"],
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="nav-shell">
          <Link className="brand" href="/">{formatText(settings.lab_name || "Eusun Han's Lab")}</Link>
          <nav className="site-nav" aria-label="Primary navigation">
            <Link className={`nav-link ${active === "home" ? "active" : ""}`} href="/">Home</Link>
            <div className={`member-menu ${active === "members" ? "active" : ""}`}>
              <button className="member-trigger" type="button" aria-haspopup="true">
                Members
              </button>
              <div className="member-submenu">
                {memberLinks.map(([label, href]) => (
                  <Link key={href} href={href} className={memberPage === label.toLowerCase() ? "active" : ""}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <Link className={`nav-link ${active === "research" ? "active" : ""}`} href="/research">Research</Link>
            <Link className={`nav-link ${active === "publications" ? "active" : ""}`} href="/publications">Publications</Link>
          </nav>
          <MobileNavigation active={active} memberPage={memberPage} memberLinks={memberLinks} />
        </div>
      </header>
    </>
  );
}

function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p>{formatText(settings.footer_text || settings.lab_name)}</p>
          {settings.affiliation ? <p>{formatText(settings.affiliation)}</p> : null}
        </div>
        <div>
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
