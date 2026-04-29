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
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-dim)]">
          Open source · MIT
        </p>
        <h2
          className="font-semibold text-[var(--color-ink)]"
          style={{
            fontSize: "clamp(36px, 6vw, 80px)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          Inspect the <span className="ir">inspector.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[620px] text-[15px] text-[var(--color-ink-dim)] sm:mt-6 sm:text-[18px]">
          IdxBeaver runs entirely in your browser — no telemetry, no servers, no
          account. Read the source, file an issue, or grab the unpacked build to
          run a fork.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <Button
            as="a"
            href="https://github.com/adityaongit/idxbeaver"
            target="_blank"
            rel="noopener"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            View on GitHub
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
          <Button
            as="a"
            href="https://github.com/adityaongit/idxbeaver/releases/latest"
            target="_blank"
            rel="noopener"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            Download .zip
          </Button>
        </div>
      </div>
    </section>
  );
}
