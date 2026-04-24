"use client";

import { useEffect, type RefObject } from "react";

/**
 * Wires mouse-parallax tilt on a container. Applied transform lives on the
 * `.tilt-target` descendant so the outer element can keep its layout.
 * Disabled below `1024px` (touch devices / small screens don't benefit).
 */
export function useMouseParallax(
  containerRef: RefObject<HTMLElement | null>,
  targetSelector = ".tilt-target"
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mql = window.matchMedia("(min-width: 1024px)");
    if (!mql.matches) return;

    const target = container.querySelector<HTMLElement>(targetSelector);
    if (!target) return;

    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      target.style.transform = `perspective(1800px) rotateY(${x * 1.4}deg) rotateX(${-y * 1.2}deg) translateY(-4px)`;
    };
    const onLeave = () => {
      target.style.transform = "";
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      target.style.transform = "";
    };
  }, [containerRef, targetSelector]);
}
