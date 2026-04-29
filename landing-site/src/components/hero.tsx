import { CHROME_WEB_STORE_URL } from "@/lib/brand";

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
        <div className="order-1 hidden lg:order-2 lg:block lg:shrink-0">
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
            A Chrome DevTools extension that gives you a real database client
            for{" "}
            <b className="font-medium text-[var(--color-ink-2)]">
              IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache
              Storage
            </b>
            . Dense grid, Mongo-style queries, row inspector, schema inference.
          </p>

          <div className="r-init ri4 mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            <a
              href={CHROME_WEB_STORE_URL}
              target="_blank"
              rel="noopener"
              aria-label="Install IdxBeaver from the Chrome Web Store"
              className="group inline-flex h-[52px] items-center gap-3 rounded-[12px] bg-white px-5 text-[#1f2024] shadow-[0_1px_0_rgba(255,255,255,.04),0_10px_28px_-12px_rgba(0,0,0,.6)] ring-1 ring-inset ring-black/5 transition-all hover:bg-[#f5f5f7] hover:shadow-[0_1px_0_rgba(255,255,255,.04),0_14px_32px_-12px_rgba(0,0,0,.7)] active:translate-y-px"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/chrome-web-store-icon.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 select-none"
                draggable={false}
              />
              <span className="text-[16px] font-semibold leading-none tracking-[-0.01em]">
                Add to Chrome
              </span>
              <span className="text-[14px] leading-none text-[#5f6368]">
                <span className="mr-1.5 text-[#c4c7cc]">|</span> it&rsquo;s free
              </span>
            </a>
            <a
              href="#product"
              className="inline-flex h-[52px] items-center justify-center rounded-[12px] border border-[var(--color-hair-2)] bg-white/[0.02] px-5 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white/[0.05] hover:border-[var(--color-hair-3)] active:translate-y-px"
            >
              See the product
            </a>
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
