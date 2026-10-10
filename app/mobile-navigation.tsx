"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { ActivePage } from "./site-components";

export function MobileNavigation({ labName, active, memberPage, memberLinks }: {
  labName: ReactNode;
  active: ActivePage;
  memberPage?: string;
  memberLinks: string[][];
}) {
  const [open, setOpen] = useState(false);
  const [showLabName, setShowLabName] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const masthead = document.querySelector(".site-masthead");
    if (!masthead) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowLabName(entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(masthead);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <Link className={"mobile-lab-name" + (showLabName ? " visible" : "")} href="/" onClick={close}>{labName}</Link>
    <div className="mobile-menu">
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!open}>
        <Link className={active === "home" ? "active" : ""} href="/" onClick={close}>Home</Link>
        <div className={`mobile-member-menu ${active === "members" ? "active" : ""}`}>
          <span>Team</span>
          <div className="mobile-member-submenu">
            {memberLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={href === `/members/${memberPage}` ? "active" : ""}
                onClick={close}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <Link className={active === "research" ? "active" : ""} href="/research" onClick={close}>Research</Link>
        <Link className={active === "projects" ? "active" : ""} href="/projects" aria-current={active === "projects" ? "page" : undefined} onClick={close}>Projects</Link>
        <Link className={active === "publications" ? "active" : ""} href="/publications" onClick={close}>Publications</Link>
        <Link className={active === "blog" ? "active" : ""} href="/blog" onClick={close}>Blog</Link>
      </nav>
    </div>
    </>
  );
}
