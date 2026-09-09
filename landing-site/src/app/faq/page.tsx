import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ContentShell } from "@/components/content-shell";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { pageMetadata } from "@/lib/seo";

const TITLE = "IndexedDB viewer FAQ — IdxBeaver";
const DESCRIPTION =
  "How to view, edit, export and clear IndexedDB data in Chrome, plus IdxBeaver's privacy, licensing and browser support answered in one place.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/faq",
});

/**
 * `a` is the rendered answer; `plain` is the same answer as a flat string for
 * the FAQPage JSON-LD. They are kept as separate fields because Google wants
 * the answer text verbatim and React nodes cannot be reliably flattened.
 * Keep them in sync when editing either one.
 */
type Faq = { q: string; a: ReactNode; plain: string };
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
        plain:
          "IdxBeaver is a Chrome DevTools extension that turns the Application panel into a real database client for browser storage. You get a dense data grid, MongoDB-style queries with index-aware planning, a row inspector, schema inference, and import/export across JSON, NDJSON, CSV, SQL, and ZIP — for IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage.",
      },
      {
        q: "Which browsers does it support?",
        a: (
          <>
            Any Chromium-based browser on version 120 or newer with Manifest V3
            support — Chrome, Edge, Brave, Arc, and Opera all work. Firefox and
            Safari are not currently supported because their devtools
            extension APIs differ.
          </>
        ),
        plain:
          "Any Chromium-based browser on version 120 or newer with Manifest V3 support — Chrome, Edge, Brave, Arc, and Opera all work. Firefox and Safari are not currently supported because their devtools extension APIs differ.",
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
        plain:
          "Install it from the Chrome Web Store. If you prefer to load it unpacked, every release ships a .zip on GitHub Releases.",
      },
    ],
  },
  {
    heading: "Working with IndexedDB",
    items: [
      {
        q: "How do I view IndexedDB data in Chrome?",
        a: (
          <>
            Open DevTools (F12), then either use Chrome&rsquo;s built-in
            Application panel &rarr; Storage &rarr; IndexedDB, or open the
            IdxBeaver panel for a database-client view. IdxBeaver lists every
            database and object store for the origin — including those inside
            iframes — and renders records in a sortable, filterable grid
            instead of a collapsed tree you have to click through row by row.
          </>
        ),
        plain:
          "Open DevTools (F12), then either use Chrome's built-in Application panel under Storage → IndexedDB, or open the IdxBeaver panel for a database-client view. IdxBeaver lists every database and object store for the origin — including those inside iframes — and renders records in a sortable, filterable grid instead of a collapsed tree you have to click through row by row.",
      },
      {
        q: "Can I edit IndexedDB values directly?",
        a: (
          <>
            Yes. Chrome&rsquo;s Application panel is read-only for keys and
            values — editing there means writing console code against the raw
            IndexedDB API. IdxBeaver lets you edit cells inline in the grid or
            field-by-field in the row inspector, with type indicators, NULL
            handling, and undo/redo for every write.
          </>
        ),
        plain:
          "Yes. Chrome's Application panel is read-only for keys and values — editing there means writing console code against the raw IndexedDB API. IdxBeaver lets you edit cells inline in the grid or field-by-field in the row inspector, with type indicators, NULL handling, and undo/redo for every write.",
      },
      {
        q: "How do I export IndexedDB data to JSON or CSV?",
        a: (
          <>
            Select a store and export it as JSON, NDJSON, CSV, SQL{" "}
            <code translate="no">INSERT</code> statements, or a ZIP snapshot. Exports
            round-trip non-JSON types that a naive{" "}
            <code translate="no">JSON.stringify</code> would destroy — <code translate="no">Date</code>,{" "}
            <code translate="no">BigInt</code>, <code translate="no">Map</code>, <code translate="no">Set</code>,{" "}
            <code translate="no">Blob</code>, <code translate="no">ArrayBuffer</code>, and circular
            references. The same formats import back in.
          </>
        ),
        plain:
          "Select a store and export it as JSON, NDJSON, CSV, SQL INSERT statements, or a ZIP snapshot. Exports round-trip non-JSON types that a naive JSON.stringify would destroy — Date, BigInt, Map, Set, Blob, ArrayBuffer, and circular references. The same formats import back in.",
      },
      {
        q: "How do I clear or delete an IndexedDB database?",
        a: (
          <>
            IdxBeaver can clear an object store or delete a whole database from
            the panel, without reloading the page. Because deletes are
            destructive and IndexedDB has no built-in undo, take a snapshot
            first — you can restore or diff against it afterwards, which is
            also the fastest way to verify a schema migration did what you
            expected.
          </>
        ),
        plain:
          "IdxBeaver can clear an object store or delete a whole database from the panel, without reloading the page. Because deletes are destructive and IndexedDB has no built-in undo, take a snapshot first — you can restore or diff against it afterwards, which is also the fastest way to verify a schema migration did what you expected.",
      },
      {
        q: "Does it work with Dexie, idb, PouchDB, and other wrappers?",
        a: (
          <>
            Yes. Those libraries all store data in plain IndexedDB, so
            IdxBeaver reads them like any other database — no adapter needed.
            Schema inference samples rows from a store and can emit the
            inferred shape as TypeScript types or a Dexie schema definition,
            which is useful when you are retrofitting types onto a store that
            grew organically.
          </>
        ),
        plain:
          "Yes. Those libraries all store data in plain IndexedDB, so IdxBeaver reads them like any other database — no adapter needed. Schema inference samples rows from a store and can emit the inferred shape as TypeScript types or a Dexie schema definition, which is useful when you are retrofitting types onto a store that grew organically.",
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
            <a href="/vs/chrome-devtools-application-panel/">comparison page</a>
            .
          </>
        ),
        plain:
          "Chrome's panel can list databases and dump records, but it has no filtering, no schema awareness, no bulk edits, no query history, and no exports that survive a refresh. IdxBeaver gives you all of that plus a query language, multi-tab editor, undo/redo for grid edits, and a Structure view that shows the inferred schema for each store.",
      },
      {
        q: "Can I write SQL queries?",
        a: (
          <>
            IdxBeaver ships a MongoDB-style JSON query language with{" "}
            <code translate="no">$eq</code>, <code translate="no">$gte</code>, <code translate="no">$in</code>, compound
            filters, projections, sorts, and limits. The query planner uses
            an IDB index when one matches, with an in-memory fallback for
            compound operators. Plain SQL is on the roadmap.
          </>
        ),
        plain:
          "IdxBeaver ships a MongoDB-style JSON query language with $eq, $gte, $in, compound filters, projections, sorts, and limits. The query planner uses an IDB index when one matches, with an in-memory fallback for compound operators. Plain SQL is on the roadmap.",
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
        plain:
          "Yes. IndexedDB is partitioned per frame origin. IdxBeaver scans every scriptable frame on the page in parallel and merges the results, so iframe-heavy apps surface their full storage footprint instead of just the top frame.",
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
            <a href="/privacy/">privacy policy</a> for the full list.
          </>
        ),
        plain:
          "No. IdxBeaver runs entirely in your browser. There is no telemetry, no auth, no servers — and no account to create. Inspected storage is read on demand only on the page you have DevTools open against.",
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
        plain:
          "Free, and MIT-licensed. The full source is on GitHub — fork it, audit it, run a build of your own.",
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
        plain:
          "Open an issue on GitHub. Reproductions with the affected origin and store name help most.",
      },
    ],
  },
];

export default function FaqPage() {
  const crumbs = [{ name: "FAQ", path: "/faq" }];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.plain },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ContentShell
        crumbs={crumbs}
        title="IndexedDB questions, answered."
        lede="How to view, edit, export, and clear IndexedDB data in Chrome — plus the short version on IdxBeaver itself: it runs locally, it's free, and the source is on GitHub."
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
