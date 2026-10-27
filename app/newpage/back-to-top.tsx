"use client";

import { useEffect, useState } from "react";

// Pixels from the end of the page at which the button hides again (the footer/contact has its own way back up).
const BOTTOM_ZONE = 40;

// Round floating button, shown once the visitor has scrolled past most of the first screen
// and hidden again at the very bottom of the page.
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const { scrollY, innerHeight } = window;
      const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - BOTTOM_ZONE;
      setVisible(scrollY > innerHeight * 0.6 && !atBottom);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const toTop = () => {
    history.replaceState(history.state, "", location.pathname + location.search);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button type="button" className={`to-top${visible ? " is-visible" : ""}`} onClick={toTop} aria-label="Back to top" tabIndex={visible ? 0 : -1}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      Top
    </button>
  );
}
