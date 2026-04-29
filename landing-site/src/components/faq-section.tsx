const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What does IdxBeaver do?",
    a: (
      <>
        IdxBeaver is a Chrome DevTools extension that turns the Application
        panel into a real database client for browser storage. You get a dense
        data grid, MongoDB-style queries with index-aware planning, a row
        inspector, schema inference, and import/export across JSON, NDJSON,
        CSV, SQL, and ZIP — for IndexedDB, LocalStorage, SessionStorage,
        Cookies, and Cache Storage.
      </>
    ),
  },
  {
    q: "How is it different from Chrome's built-in Application panel?",
    a: (
      <>
        Chrome&rsquo;s panel can list databases and dump records, but it has
        no filtering, no schema awareness, no bulk edits, no query history,
        and no exports that survive a refresh. IdxBeaver gives you all of
        that — plus a query language, multi-tab editor, undo/redo for grid
        edits, and a Structure view that shows the inferred schema for each
        store.
      </>
    ),
  },
  {
    q: "Does IdxBeaver send my data anywhere?",
    a: (
      <>
        No. IdxBeaver runs entirely in your browser. There is no telemetry,
        no auth, no servers — and no account to create. Inspected storage is
        read on demand only on the page you have DevTools open against. See
        the{" "}
        <a
          className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
          href="/privacy"
        >
          privacy policy
        </a>{" "}
        for the full list.
      </>
    ),
  },
  {
    q: "Is it free? What's the license?",
    a: (
      <>
        Free, and{" "}
        <a
          className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
          href="https://github.com/adityaongit/idxbeaver/blob/main/LICENSE"
          target="_blank"
          rel="noopener"
        >
          MIT-licensed
        </a>
        . Source on{" "}
        <a
          className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
          href="https://github.com/adityaongit/idxbeaver"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        .
      </>
    ),
  },
  {
    q: "Which browsers does it support?",
    a: (
      <>
        Any Chromium-based browser on version 110 or newer with Manifest V3
        support — Chrome, Edge, Brave, Arc, and Opera all work. Firefox and
        Safari are not currently supported because their devtools extension
        APIs differ.
      </>
    ),
  },
  {
    q: "Can I write SQL queries?",
    a: (
      <>
        IdxBeaver ships a MongoDB-style JSON query language with{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-[12px]">
          $eq
        </code>
        ,{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-[12px]">
          $gte
        </code>
        ,{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-[12px]">
          $in
        </code>
        , compound filters, projections, sorts, and limits. The query planner
        uses an IDB index when one matches, with an in-memory fallback for
        compound operators. Plain SQL is on the roadmap.
      </>
    ),
  },
  {
    q: "Where can I report bugs or request features?",
    a: (
      <>
        Open an issue on{" "}
        <a
          className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
          href="https://github.com/adityaongit/idxbeaver/issues/new"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        . Reproductions with the affected origin and store name help most.
      </>
    ),
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="r relative py-20 sm:py-28 lg:py-32"
    >
      <div className="relative mx-auto max-w-[860px] px-5 sm:px-8">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-dim)]">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="font-semibold text-[var(--color-ink)]"
          style={{
            fontSize: "clamp(28px, 4.4vw, 56px)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
          }}
        >
          Common questions.
        </h2>
        <p className="mt-5 max-w-[600px] text-[15px] text-[var(--color-ink-dim)] sm:text-[17px]">
          The short version: it runs locally, it&rsquo;s free, and the source
          is on GitHub.
        </p>

        <dl className="mt-12 divide-y divide-[var(--color-hair)] border-y border-[var(--color-hair)]">
          {FAQS.map((item) => (
            <div key={item.q} className="grid gap-3 py-6 sm:grid-cols-[1fr_2fr] sm:gap-10 sm:py-8">
              <dt className="text-[16px] font-medium text-[var(--color-ink)] sm:text-[18px]">
                {item.q}
              </dt>
              <dd className="text-[15px] leading-[1.6] text-[var(--color-ink-dim)] sm:text-[16px]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
