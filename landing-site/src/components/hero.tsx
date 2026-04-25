import { Button } from "@/components/ui/button";

function HeroMark() {
  return (
    <div
      className="r-init ri1 relative flex h-[160px] w-[160px] shrink-0 items-center justify-center sm:h-[180px] sm:w-[180px] lg:h-[260px] lg:w-[260px]"
      aria-hidden="true"
    >
      <div
        className="hero-glow pointer-events-none absolute inset-[-40px] lg:inset-[-60px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(138,92,246,.34), rgba(244,114,182,.14) 50%, transparent 78%)",
          filter: "blur(28px)",
        }}
      />
      {/* Sonar ping rings (emerge from center, fade outward) */}
      <div className="hero-ping pointer-events-none absolute inset-0 rounded-full border border-[rgba(167,139,250,.35)]" />
      <div className="hero-ping-2 pointer-events-none absolute inset-0 rounded-full border border-[rgba(244,114,182,.22)]" />
      {/* Static-ish concentric rings, each breathing at its own tempo */}
      <div className="hero-ring-1 absolute inset-0 rounded-full border border-[var(--color-hair-3)]" />
      <div className="hero-ring-2 absolute inset-[14px] rounded-full border border-[var(--color-hair-2)] lg:inset-[20px]" />
      <div className="hero-ring-3 absolute inset-[28px] rounded-full border border-[var(--color-hair)] lg:inset-[40px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark-256.png"
        alt="IdxBeaver"
        width={256}
        height={256}
        className="hero-mark relative h-[112px] w-[112px] select-none sm:h-[128px] sm:w-[128px] lg:h-[184px] lg:w-[184px]"
        style={{
          filter:
            "drop-shadow(0 14px 32px rgba(138,92,246,.45)) drop-shadow(0 4px 10px rgba(0,0,0,.55))",
        }}
      />
    </div>
  );
}

export function Hero() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-57px)] max-w-[960px] flex-col justify-center px-5 py-12 sm:py-16 lg:max-w-[1180px] lg:py-20">
      <div className="flex flex-col items-center gap-8 text-center sm:gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-14 lg:text-left">
        {/* Mobile: mark sits above the headline. Desktop: order swaps so text is on the left. */}
        <div className="order-1 lg:order-2 lg:shrink-0">
          <HeroMark />
        </div>

        <div className="order-2 w-full lg:order-1 lg:max-w-[660px]">
          <h1
            className="r-init ri2 font-sans font-semibold text-[var(--color-ink)]"
            style={{
              fontSize: "clamp(40px, 8.4vw, 84px)",
              lineHeight: 1,
              letterSpacing: "-0.048em",
            }}
          >
            Browser storage,
            <br />
            managed like a <span className="ir">database.</span>
          </h1>

          <p
            className="r-init ri3 mt-6 max-w-[560px] text-[16px] leading-[1.55] tracking-[-.005em] text-[var(--color-ink-dim)] sm:text-[18px] lg:mx-0 mx-auto"
          >
            A native-feeling database client for{" "}
            <b className="font-medium text-[var(--color-ink-2)]">
              IndexedDB, LocalStorage, Sessions, Cookies and Cache Storage
            </b>{" "}
            — inside Chrome DevTools. Dense grid. Mongo-style queries. Row
            inspector. Schema inference.
          </p>

          <div className="r-init ri4 mt-9 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center lg:justify-start">
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

          <div className="r-init ri4 mono mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-[var(--color-ink-mute)] lg:justify-start">
            <span>Chromium 110+</span>
            <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
            <span>Manifest V3</span>
            <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
            <span>MIT</span>
            <span className="h-[3px] w-[3px] rounded-full bg-[var(--color-ink-faint)]" />
            <span>No telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
}
