const ITEMS = [
  {
    n: "01",
    h: "Clean & focused",
    p: "Hairlines. One accent. Zero gradients inside the product. The data is the interface.",
  },
  {
    n: "02",
    h: "High performance",
    p: "Frame-parallel discovery, index-aware queries, 24k+ rows scrolling without a stutter.",
  },
  {
    n: "03",
    h: "Keyboard first",
    p: "⌘K palette, tab nav, inline edit, run-query. Never need a mouse.",
  },
  {
    n: "04",
    h: "Round-trip honest",
    p: "Date, BigInt, Map, Set, RegExp, Blob — in and out, through every format.",
  },
  {
    n: "05",
    h: "Open & free",
    p: "MIT licensed, no sign-in, no telemetry, no cloud. Ship a PR, ship a release.",
  },
  {
    n: "06",
    h: "Quick support",
    p: "One inbox, one GitHub. Replies in hours, not quarters.",
  },
];

export function Principles() {
  return (
    <section id="principles" className="py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="r mb-16 max-w-[760px] lg:mb-20">
          <div className="mono mb-5 flex items-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
            <span>FIG 0.4 · Principles</span>
          </div>
          <h2
            className="font-semibold text-[var(--color-ink)]"
            style={{
              fontSize: "clamp(30px, 4.2vw, 58px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
            }}
          >
            Six values,
            <br className="hidden sm:block" />
            obsessively enforced.
          </h2>
        </div>

        {/* Grid: 1-col mobile, 2-col tablet, 3-col desktop. Borders via negative-margin + pseudo trick: use wrapper with border-t and individual cells with border-r/b. */}
        <div className="r rd1 grid grid-cols-1 border-t border-[var(--color-hair)] sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => {
            const col3 = i % 3;
            const col2 = i % 2;
            return (
              <div
                key={item.n}
                className={[
                  "flex min-h-[200px] flex-col gap-[10px] border-b border-[var(--color-hair)] px-6 py-8 transition-colors hover:bg-white/[.012] sm:px-7 sm:py-9 lg:px-8 lg:py-10",
                  // right border on tablet: hide on 2nd column
                  col2 === 0 ? "sm:border-r sm:border-[var(--color-hair)]" : "",
                  // right border on desktop: show on 1st and 2nd, hide on 3rd
                  col3 !== 2 ? "lg:border-r lg:border-[var(--color-hair)]" : "lg:border-r-0",
                  // re-enable right border on tablet for all cells (overridden by above for odd)
                ].join(" ")}
              >
                <div className="mono mb-2 text-[11px] tracking-[0.12em] text-[var(--color-ink-mute)]">
                  {item.n}
                </div>
                <h4 className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-ink)] sm:text-[17px]">
                  {item.h}
                </h4>
                <p className="max-w-[300px] text-[13.5px] leading-[1.6] text-[var(--color-ink-dim)]">
                  {item.p}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
