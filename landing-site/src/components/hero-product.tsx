"use client";

import { useRef } from "react";

import { MockFooter } from "@/components/hero-product/mock-footer";
import { MockGrid } from "@/components/hero-product/mock-grid";
import { MockInspector } from "@/components/hero-product/mock-inspector";
import { MockSidebar } from "@/components/hero-product/mock-sidebar";
import { MockTitlebar } from "@/components/hero-product/mock-titlebar";
import { useMouseParallax } from "@/hooks/use-mouse-parallax";

export function HeroProduct() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useMouseParallax(wrapRef);

  return (
    <div className="r-init ri5 mx-auto max-w-[1240px] px-5 sm:px-8">
      <div ref={wrapRef} className="relative">
        <div className="mb-5 flex items-center justify-between px-1">
          <span className="mono text-[11px] tracking-[0.1em] text-[var(--color-ink-mute)]">
            FIG 0.1
          </span>
          <span className="mono hidden text-[11px] tracking-[0.1em] text-[var(--color-ink-mute)] sm:inline">
            DEVTOOLS PANEL · APP.ACME.COM
          </span>
        </div>

        <div
          className="tilt-target relative overflow-hidden rounded-[14px] border border-[var(--color-hair-3)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,21,23,.95) 0%, rgba(12,13,15,.95) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.06), 0 40px 100px -30px rgba(0,0,0,.7), 0 20px 50px -20px rgba(244,114,182,.1)",
            transition: "transform .8s cubic-bezier(.16,1,.3,1)",
          }}
        >
          <span
            className="hero-product-seam pointer-events-none absolute top-0 left-[15%] right-[15%] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(138,92,246,.55) 30%, rgba(244,114,182,.55) 50%, rgba(251,146,60,.45) 70%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          <MockTitlebar />

          {/* Grid layout:
              <lg: grid only
              lg: grid + inspector
              xl: sidebar + grid + inspector */}
          <div className="grid min-h-[340px] grid-cols-1 bg-[var(--color-bg-2)] sm:min-h-[400px] lg:min-h-[440px] lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
            <div className="hidden xl:block">
              <MockSidebar />
            </div>
            <MockGrid />
            <div className="hidden lg:block">
              <MockInspector />
            </div>
          </div>

          <MockFooter />
        </div>
      </div>
    </div>
  );
}
