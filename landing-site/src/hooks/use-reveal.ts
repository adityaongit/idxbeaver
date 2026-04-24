"use client";

import { useEffect } from "react";

/**
 * Walks the DOM once on mount, attaches a single IntersectionObserver to every
 * `.r` and `.divider` element, and adds `.in` when they enter the viewport.
 *
 * Call this once from a top-level client component (e.g. <Page />).
 */
export function useReveal() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".r, .divider, .fig-col")
    );

    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    for (const el of targets) io.observe(el);

    return () => io.disconnect();
  }, []);
}
