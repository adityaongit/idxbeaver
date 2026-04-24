import type { ReactNode } from "react";

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group flex min-h-[170px] flex-col gap-2 bg-[var(--color-bg)] p-7 transition-colors hover:bg-white/[.012]">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-[7px] border border-[var(--color-hair-2)] bg-white/[.04] text-[var(--color-ink-2)] transition-all group-hover:-translate-y-[2px] group-hover:border-[var(--color-hair-3)]">
        {icon}
      </div>
      <h4 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{title}</h4>
      <p className="text-[13px] leading-[1.55] text-[var(--color-ink-dim)]">{body}</p>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-28 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="r mb-16 max-w-[760px] lg:mb-20">
          <div className="mono mb-5 flex items-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--color-hair-3)]" />
            <span>FIG 0.4 · More</span>
          </div>
          <h2
            className="font-semibold text-[var(--color-ink)]"
            style={{
              fontSize: "clamp(30px, 4.4vw, 60px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
            }}
          >
            Everything a real database client has.
          </h2>
          <p className="mt-4 max-w-[580px] text-[15px] leading-[1.5] text-[var(--color-ink-dim)] sm:text-[17px]">
            Minus the connection string.
          </p>
        </div>

        <div
          className="r rd1 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-[var(--color-hair)] sm:grid-cols-2 lg:grid-cols-4"
          style={{ background: "var(--color-hair)" }}
        >
          <Feature
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            }
            title="Row inspector"
            body="Type-aware editor with NULL handling and a syntax-highlighted JSON tree."
          />
          <Feature
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 3v10h10M6 10l2-3 2 2 3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Schema inference"
            body="Samples 500 rows per store. Exports to TypeScript or Dexie in one click."
          />
          <Feature
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 7h10M7 3v10" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            }
            title="Snapshots & diffs"
            body="Capture state, diff later. Field-level add / remove / change, one-click restore."
          />
          <Feature
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v10m0 0l-3-3m3 3l3-3M3 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Bulk import / export"
            body="NDJSON, CSV, SQL INSERT, ZIP. Non-JSON types round-trip losslessly."
          />
        </div>
      </div>
    </section>
  );
}
