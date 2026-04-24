import { FigColumn } from "@/components/figures/fig-column";
import { FigCommandPalette } from "@/components/figures/fig-command-palette";
import { FigCubeCluster } from "@/components/figures/fig-cube-cluster";
import { FigStorageStack } from "@/components/figures/fig-storage-stack";

export function Philosophy() {
  return (
    <section id="philosophy" className="py-20 sm:py-28 lg:py-40">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="r mx-auto mb-16 max-w-[760px] text-center sm:mb-20 lg:mb-24">
          <div className="mono mb-6 flex items-center justify-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
            <span>The philosophy</span>
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
          </div>
          <h2
            className="font-semibold text-[var(--color-ink)]"
            style={{
              fontSize: "clamp(30px, 4.4vw, 60px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
            }}
          >
            Three ideas, obsessively enforced.
          </h2>
          <p className="mx-auto mt-4 max-w-[580px] text-[15px] leading-[1.5] text-[var(--color-ink-dim)] sm:text-[17px]">
            A small product, a short list of principles. Hover any figure to see it move.
          </p>
        </div>

        <div className="grid grid-cols-1 border-t border-b border-[var(--color-hair)] lg:grid-cols-3">
          <FigColumn
            number="FIG 0.2"
            title="Every surface, one panel."
            description="IndexedDB, LocalStorage, Sessions, Cookies, Cache — stacked into one dense grid. One query language across all of them."
          >
            <FigStorageStack />
          </FigColumn>

          <FigColumn
            number="FIG 0.3"
            title="Every frame, every origin."
            description="IndexedDB is partitioned per origin and per frame. IdxBeaver scans them in parallel and labels every source — zero ambiguity."
          >
            <FigCubeCluster />
          </FigColumn>

          <FigColumn
            number="FIG 0.4"
            title="Keyboard as primary."
            description="⌘K palette, tab nav, arrow-key cell edit, starrable history. The mouse is a fallback — not the plan."
          >
            <FigCommandPalette />
          </FigColumn>
        </div>
      </div>
    </section>
  );
}
