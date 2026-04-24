import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section id="install" className="r relative py-24 text-center sm:py-32 lg:py-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[min(900px,100%)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,.12), rgba(138,92,246,.06) 50%, transparent 80%)",
          filter: "blur(50px)",
        }}
      />
      <div className="relative mx-auto max-w-[920px] px-5 sm:px-8">
        <h2
          className="font-semibold text-[var(--color-ink)]"
          style={{
            fontSize: "clamp(36px, 6vw, 80px)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          Treat browser storage like a <span className="ir">real database.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[15px] text-[var(--color-ink-dim)] sm:mt-6 sm:text-[18px]">
          Install the extension, open DevTools. That&apos;s the whole setup.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <Button as="a" href="#" variant="primary" size="lg" className="w-full sm:w-auto">
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
          <Button as="a" href="#" variant="outline" size="lg" className="w-full sm:w-auto">
            Build from source
          </Button>
        </div>
      </div>
    </section>
  );
}
