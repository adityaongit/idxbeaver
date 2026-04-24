"use client";

import { useEffect, useRef } from "react";

export function CompareSlider() {
  const cmpRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cmp = cmpRef.current;
    const handle = handleRef.current;
    if (!cmp || !handle) return;

    let dragging = false;

    const applyPct = (pct: number) => {
      cmp.style.setProperty("--pos", pct + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(pct)));
      cmp.classList.toggle("at-start", pct <= 2);
      cmp.classList.toggle("at-end", pct >= 98);
    };

    const setPos = (clientX: number) => {
      const r = cmp.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(100, ((clientX - r.left) / r.width) * 100)
      );
      applyPct(pct);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      cmp.classList.add("dragging");
      cmp.setPointerCapture?.(e.pointerId);
      setPos(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) setPos(e.clientX);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      cmp.classList.remove("dragging");
      cmp.releasePointerCapture?.(e.pointerId);
    };
    const onKey = (e: KeyboardEvent) => {
      const cur = parseFloat(
        getComputedStyle(cmp).getPropertyValue("--pos")
      ) || 50;
      const step = e.shiftKey ? 10 : 2;
      let next = cur;
      if (e.key === "ArrowLeft") next = Math.max(0, cur - step);
      if (e.key === "ArrowRight") next = Math.min(100, cur + step);
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = 100;
      if (next !== cur) {
        e.preventDefault();
        applyPct(next);
      }
    };

    cmp.addEventListener("pointerdown", onDown);
    cmp.addEventListener("pointermove", onMove);
    cmp.addEventListener("pointerup", onUp);
    cmp.addEventListener("pointercancel", onUp);
    handle.addEventListener("keydown", onKey);

    return () => {
      cmp.removeEventListener("pointerdown", onDown);
      cmp.removeEventListener("pointermove", onMove);
      cmp.removeEventListener("pointerup", onUp);
      cmp.removeEventListener("pointercancel", onUp);
      handle.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={cmpRef} className="compare" id="cmp">
      <img
        className="img-base"
        src="/screenshots/dark.png"
        alt="IdxBeaver · dark theme"
        draggable={false}
      />
      <img
        className="img-top"
        src="/screenshots/light.png"
        alt="IdxBeaver · light theme"
        draggable={false}
      />
      <span className="cmp-tag l">Light</span>
      <span className="cmp-tag d">Dark</span>
      <div className="cmp-line" />
      <div
        ref={handleRef}
        className="cmp-handle"
        role="slider"
        aria-label="Compare light and dark themes"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={50}
        tabIndex={0}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 6 3 12 9 18" />
          <polyline points="15 6 21 12 15 18" />
        </svg>
      </div>
    </div>
  );
}
