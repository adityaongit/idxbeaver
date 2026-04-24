import { CompareSlider } from "@/components/compare-slider";

export function ProductSection() {
  return (
    <section id="product" className="py-20 sm:py-28 lg:py-40">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="r mx-auto mb-12 max-w-[760px] text-center sm:mb-16 lg:mb-20">
          <div className="mono mb-5 flex items-center justify-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
            <span>FIG 0.2 · Product</span>
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
          </div>
          <h3
            className="font-semibold text-[var(--color-ink)]"
            style={{
              fontSize: "clamp(28px, 3.4vw, 46px)",
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
            }}
          >
            A dense, keyboard-first grid for every storage surface.
          </h3>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-[1.6] text-[var(--color-ink-dim)] sm:text-[16.5px]">
            22-pixel rows. Tabular numerics. Sticky headers. Pinnable columns. Inline-edit any cell. Round-trips{" "}
            <b className="font-medium text-[var(--color-ink-2)]">
              Date, BigInt, Map, Set, RegExp, Blob, ArrayBuffer
            </b>{" "}
            through every export format.
          </p>
        </div>

        <div
          className="r rd1 relative overflow-hidden rounded-[14px] border border-[var(--color-hair-2)]"
          style={{
            background: "var(--color-bg-2)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.06), 0 40px 100px -30px rgba(0,0,0,.7)",
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-[15%] right-[15%] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
            }}
          />
          <CompareSlider />
        </div>
      </div>
    </section>
  );
}
