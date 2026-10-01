"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivePage } from "./site-components";

export function MobileNavigation({ active, memberPage, memberLinks }: {
  active: ActivePage;
  memberPage?: string;
  memberLinks: string[][];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
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
          <span>Members</span>
          <div className="mobile-member-submenu">
            {memberLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={memberPage === label.toLowerCase() ? "active" : ""}
                onClick={close}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <Link className={active === "research" ? "active" : ""} href="/research" onClick={close}>Research</Link>
        <Link className={active === "publications" ? "active" : ""} href="/publications" onClick={close}>Publications</Link>
      </nav>
    </div>
  );
}
