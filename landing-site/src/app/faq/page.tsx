import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ContentShell } from "@/components/content-shell";

const TITLE = "FAQ — IdxBeaver";
const DESCRIPTION =
  "Common questions about IdxBeaver — what it does, how it compares to Chrome's Application panel, privacy, licensing, and browser support.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/faq", type: "website" },
};

type Faq = { q: string; a: ReactNode };
type FaqGroup = { heading: string; items: Faq[] };

const GROUPS: FaqGroup[] = [
  {
    heading: "About IdxBeaver",
    items: [
      {
        q: "What is IdxBeaver?",
        a: (
          <>
            IdxBeaver is a Chrome DevTools extension that turns the Application
            panel into a real database client for browser storage. You get a
            dense data grid, MongoDB-style queries with index-aware planning,
            a row inspector, schema inference, and import/export across JSON,
            NDJSON, CSV, SQL, and ZIP — for IndexedDB, LocalStorage,
            SessionStorage, Cookies, and Cache Storage.
          </>
        ),
      },
      {
        q: "Which browsers does it support?",
        a: (
          <>
            Any Chromium-based browser on version 110 or newer with Manifest V3
            support — Chrome, Edge, Brave, Arc, and Opera all work. Firefox and
            Safari are not currently supported because their devtools
            extension APIs differ.
          </>
        ),
      },
      {
        q: "Where do I install it?",
        a: (
          <>
            From the{" "}
            <a
              href="https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb"
              target="_blank"
              rel="noopener"
            >
              Chrome Web Store
            </a>
            . If you prefer to load it unpacked, every release ships a .zip
            on{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver/releases"
              target="_blank"
              rel="noopener"
            >
              GitHub Releases
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "How it compares",
    items: [
      {
        q: "How is IdxBeaver different from Chrome's built-in Application panel?",
        a: (
          <>
            Chrome&rsquo;s panel can list databases and dump records, but it
            has no filtering, no schema awareness, no bulk edits, no query
            history, and no exports that survive a refresh. IdxBeaver gives
            you all of that plus a query language, multi-tab editor,
            undo/redo for grid edits, and a Structure view that shows the
            inferred schema for each store. There&rsquo;s a full breakdown
            on the{" "}
            <a href="/vs/chrome-devtools-application-panel">comparison page</a>
            .
          </>
        ),
      },
      {
        q: "Can I write SQL queries?",
        a: (
          <>
            IdxBeaver ships a MongoDB-style JSON query language with{" "}
            <code>$eq</code>, <code>$gte</code>, <code>$in</code>, compound
            filters, projections, sorts, and limits. The query planner uses
            an IDB index when one matches, with an in-memory fallback for
            compound operators. Plain SQL is on the roadmap.
          </>
        ),
      },
      {
        q: "Does it support multiple frames?",
        a: (
          <>
            Yes. IndexedDB is partitioned per frame origin. IdxBeaver scans
            every scriptable frame on the page in parallel and merges the
            results, so iframe-heavy apps surface their full storage
            footprint instead of just the top frame.
          </>
        ),
      },
    ],
  },
  {
    heading: "Privacy & licensing",
    items: [
      {
        q: "Does IdxBeaver send my data anywhere?",
        a: (
          <>
            No. IdxBeaver runs entirely in your browser. There is no
            telemetry, no auth, no servers — and no account to create.
            Inspected storage is read on demand only on the page you have
            DevTools open against. See the{" "}
            <a href="/privacy">privacy policy</a> for the full list.
          </>
        ),
      },
      {
        q: "Is it free? What's the license?",
        a: (
          <>
            Free, and{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver/blob/main/LICENSE"
              target="_blank"
              rel="noopener"
            >
              MIT-licensed
            </a>
            . The full source is on{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver"
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>{" "}
            — fork it, audit it, run a build of your own.
          </>
        ),
      },
      {
        q: "Where can I report bugs or request features?",
        a: (
          <>
            Open an issue on{" "}
            <a
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
    ],
  },
];

export default function FaqPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://indexbeaver.vercel.app/" },
      { "@type": "ListItem", position: 2, name: "FAQ", item: "https://indexbeaver.vercel.app/faq" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContentShell
        eyebrow="FAQ"
        title="Common questions."
        lede="The short version: it runs locally, it's free, and the source is on GitHub. The longer version is grouped below — click to expand."
      >
        <div className="mt-4 space-y-14">
          {GROUPS.map((group) => (
            <FaqGroupBlock key={group.heading} group={group} />
          ))}
        </div>
      </ContentShell>
    </>
  );
}

function FaqGroupBlock({ group }: { group: FaqGroup }) {
  return (
    <section>
      <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)] sm:text-[24px]">
        {group.heading}
      </h2>
      <ul className="list-none divide-y divide-[var(--color-hair)] overflow-hidden rounded-2xl border border-[var(--color-hair)] bg-[var(--color-bg-2)]">
        {group.items.map((item) => (
          <li key={item.q}>
            <FaqItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FaqItem({ item }: { item: Faq }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-white/[.02] sm:px-7 sm:py-6 sm:text-[16px]">
        <span>{item.q}</span>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-hair-2)] bg-white/[.03] text-[var(--color-ink)] transition-transform duration-200 group-open:rotate-45"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5v11M1.5 7h11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </summary>
      <div className="px-5 pb-6 text-[15px] leading-[1.65] text-[var(--color-ink-dim)] sm:px-7 sm:pb-7 [&_a]:underline [&_a]:decoration-[var(--color-hair-2)] [&_a]:underline-offset-4 [&_a:hover]:text-[var(--color-ink)] [&_code]:mono [&_code]:rounded [&_code]:bg-[var(--color-hair)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px]">
        {item.a}
      </div>
    </details>
  );
}
