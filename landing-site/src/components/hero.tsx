import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="mx-auto max-w-[960px] px-5 pt-14 pb-10 text-center sm:pt-20 lg:pt-24">
      <h1
        className="r-init ri2 mx-auto font-sans font-semibold text-[var(--color-ink)]"
        style={{
          fontSize: "clamp(40px, 9vw, 92px)",
          lineHeight: 1,
          letterSpacing: "-0.048em",
        }}
      >
        Browser storage,
        <br />
        managed like a <span className="ir">database.</span>
      </h1>

      <p
        className="r-init ri3 mx-auto mt-7 max-w-[560px] text-[16px] leading-[1.55] tracking-[-.005em] text-[var(--color-ink-dim)] sm:text-[18px]"
      >
        A native-feeling database client for{" "}
        <b className="font-medium text-[var(--color-ink-2)]">
          IndexedDB, LocalStorage, Sessions, Cookies and Cache Storage
        </b>{" "}
        — inside Chrome DevTools. Dense grid. Mongo-style queries. Row
        inspector. Schema inference.
      </p>

      <div className="r-init ri4 mt-9 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <Button as="a" href="#install" variant="primary" size="lg" className="w-full sm:w-auto">
          Add to Chrome
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3 6h6M6 3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        <Button as="a" href="#product" variant="outline" size="lg" className="w-full sm:w-auto">
          See the product
        </Button>
      </div>

      <div className="r-init ri4 mono mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-[var(--color-ink-mute)]">
        <span>Chromium 110+</span>
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
        <span>Manifest V3</span>
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
        <span>MIT</span>
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
        <span>No telemetry</span>
      </div>
    </div>
  );
}
