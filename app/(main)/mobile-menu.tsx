"use client";

import { useEffect, useRef, useState } from "react";

// Mobile replacement for the top menu (shown ≤819px, where the depth meter is hidden too).
// Links keep data-go, so roots.js does the same smooth scroll as the other menus.
export function MobileMenu({ items }: { items: { label: string; id: string; layer: number }[] }) {
  const [open, setOpen] = useState(false);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button type="button" className={`menu-toggle${open ? " is-open" : ""}`} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
        <span /><span /><span />
      </button>
      <nav id="mobile-menu" className={`mobile-menu${open ? " is-open" : ""}`} aria-label="Page sections" hidden={!open}>
        <ol>
          {items.map((item, index) => (
            <li key={item.id}>
              <a ref={index ? undefined : firstLink} href={`#${item.id}`} data-go={item.layer} onClick={() => setOpen(false)}>
                <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
