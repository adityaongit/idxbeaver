import type { Metadata } from "next";

import { ContentSection, ContentShell } from "@/components/content-shell";
import { Button } from "@/components/ui/button";
import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { resolveSiteUrl } from "@/lib/site";

const TITLE = "IdxBeaver vs Chrome DevTools Application panel";
const DESCRIPTION =
  "An honest comparison of IdxBeaver and Chrome's built-in Application panel for IndexedDB, LocalStorage, Cookies, and Cache Storage — features, queries, schema, exports, performance.";

export const metadata: Metadata = {
  title: `${TITLE} — IdxBeaver`,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/chrome-devtools-application-panel" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/vs/chrome-devtools-application-panel",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function VsApplicationPanelPage() {
  const base = resolveSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    mainEntityOfPage: `${base}/vs/chrome-devtools-application-panel`,
    author: { "@type": "Person", name: "Aditya Jindal" },
    publisher: { "@type": "Organization", name: "IdxBeaver" },
    datePublished: "2026-04-29",
    dateModified: "2026-04-29",
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "vs Chrome DevTools Application panel", path: "/vs/chrome-devtools-application-panel" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContentShell
        eyebrow="Comparison"
        title="IdxBeaver vs Chrome DevTools Application panel"
        lede="Chrome's built-in Application panel can list IndexedDB databases and dump records. IdxBeaver gives you a real database client over the same data — queries, filters, schema awareness, bulk edits, exports. Here's the side-by-side."
      >
        <ContentSection title="At a glance">
          <ComparisonTable
            rows={[
              ["Storage surfaces", "IndexedDB, LocalStorage, SessionStorage, Cookies, Cache Storage", "Same set, plus Service Workers and Web SQL (deprecated)"],
              ["Inline grid editing", "Type a value, hit enter, undo/redo per cell", "no"],
              ["Query language", "MongoDB-style filters, projection, sort, limit; index-aware planner", "no"],
              ["Schema inference", "Sampled per store; powers autocomplete + Structure view + TS/Dexie export", "no"],
              ["Multi-tab editor", "Several queries open per origin, switchable like browser tabs", "no"],
              ["Saved queries + history", "Per-origin; auto-trim to 100 most recent", "no"],
              ["Bulk filter → edit/delete", "First-class via the grid", "no"],
              ["Import", "JSON, NDJSON, CSV, SQL INSERT, ZIP", "no"],
              ["Export beyond a single row", "JSON, NDJSON, CSV, SQL INSERT, ZIP snapshots, TS/Dexie schema", "Right-click → copy single record"],
              ["Multi-frame discovery", "Scans every scriptable frame on the page", "Top frame only in most flows"],
              ["Non-JSON type round-trip", "BigInt, Date, RegExp, Map, Set, ArrayBuffer, Blob, circular refs", "Limited — many types stringify"],
              ["Column pin / resize / sticky headers", "Yes", "no"],
              ["Virtualized grid for large stores", "Yes — hundreds of thousands of rows scroll without jank", "no"],
              ["Service Worker debugging", "no", "Yes — first-party DevTools integration"],
              ["Open source", "Yes — MIT licensed, source on GitHub", "Closed (part of Chrome)"],
              ["Telemetry", "no", "Same as Chrome itself"],
            ]}
          />
        </ContentSection>

        <ContentSection title="Where the Application panel is enough">
          <p>
            Don&rsquo;t over-engineer. If your workflow is &ldquo;is the value
            still in IndexedDB after the latest deploy?&rdquo; or &ldquo;clear
            this LocalStorage key,&rdquo; the built-in panel does the job.
            Specifically:
          </p>
          <ul>
            <li>One-off lookup of a key/value pair.</li>
            <li>Eyeballing a small object store (under ~50 rows).</li>
            <li>Wiping a database during local development.</li>
            <li>Watching a Service Worker&rsquo;s lifecycle (IdxBeaver
              doesn&rsquo;t touch SW debugging — that&rsquo;s squarely
              DevTools&rsquo; lane).</li>
          </ul>
        </ContentSection>

        <ContentSection title="Where IdxBeaver pays off">
          <h3>1. You actually need to query the data</h3>
          <p>
            Once a store has more than a few hundred rows, scrolling and
            squinting stops working. IdxBeaver lets you write filters
            directly:
          </p>
          <pre>
            <code>{`{
  "store": "orders",
  "filter": {
    "status": "delivered",
    "total":  { "$gte": 20000 },
    "createdAt": { "$gte": "2026-01-01" }
  },
  "sort":  { "createdAt": -1 },
  "limit": 50
}`}</code>
          </pre>
          <p>
            The planner inspects the filter for single-field equality/range
            expressions and uses an <code>IDBIndex</code> when one matches.
            Compound operators fall back to an in-memory match on the result
            of the index scan. Either way, the chosen plan is reported
            alongside results so you can spot a missing index.
          </p>

          <h3>2. The schema isn&rsquo;t obvious</h3>
          <p>
            On a real app, an object store is rarely a flat shape. IdxBeaver
            samples the rows and shows you what fields exist, their types,
            and their coverage (<em>&ldquo;90% of rows have a
            <code>shippingCity</code> string&rdquo;</em>). That powers
            autocomplete in the query editor and a Structure view you can
            export to a TypeScript interface or a Dexie schema. Useful when
            onboarding new contributors or auditing what your client app
            actually persists.
          </p>

          <h3>3. You need to round-trip data</h3>
          <p>
            The Application panel can copy a single record. IdxBeaver exports
            a whole filtered slice — JSON, NDJSON, CSV for spreadsheet
            handoff, SQL <code>INSERT</code> statements for replays into a
            seed script, or a ZIP snapshot of the entire database. Imports
            preserve non-JSON types (BigInt, Date, RegExp, Map, Set,
            ArrayBuffer, Blob) by serializing through a versioned wire
            format.
          </p>

          <h3>4. You&rsquo;re editing at scale</h3>
          <p>
            Inline edits in the grid are first-class: type a value, hit
            enter, and the change is committed with a per-cell undo entry.
            Undo/redo stacks are capped per store, so a fat-finger
            doesn&rsquo;t become irreversible. The Application panel
            doesn&rsquo;t expose a writable grid for nested fields at all.
          </p>

          <h3>5. Multiple frames, same origin</h3>
          <p>
            IndexedDB is partitioned per frame origin. Apps that embed
            cross-origin iframes (auth, payments, embedded dashboards) end up
            with multiple databases the parent frame can&rsquo;t see.
            IdxBeaver scans every scriptable frame in parallel and merges
            the results; the built-in panel typically only surfaces the top
            frame.
          </p>
        </ContentSection>

        <ContentSection title="Performance and footprint">
          <p>
            IdxBeaver is a regular MV3 extension: a service worker that
            routes RPC requests, a panel React app, and an injected
            execution context that runs the cursor loop in the inspected
            page&rsquo;s MAIN world. The grid itself is virtualized, so a
            store with hundreds of thousands of rows scrolls without
            jank. Reads happen on demand — opening a database
            doesn&rsquo;t pre-fetch every store.
          </p>
          <p>
            The Application panel is part of DevTools and has tighter
            integration with the renderer, but no virtualization for large
            stores. For tables over ~10k rows, expect the panel to slow
            down noticeably. Both tools share the same IndexedDB API
            constraints — you can&rsquo;t do anything Chrome itself
            can&rsquo;t do.
          </p>
        </ContentSection>

        <ContentSection title="Privacy comparison">
          <p>
            Both tools are local-only. IdxBeaver makes no network requests
            (no telemetry, no analytics, no remote config), and its source
            is{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver"
              target="_blank"
              rel="noopener"
            >
              MIT-licensed on GitHub
            </a>
            {" "}— you can audit it. Chrome&rsquo;s Application panel is
            similarly local but is part of a closed-source binary; trust it
            to the same degree you trust Chrome itself.
          </p>
        </ContentSection>

        <ContentSection title="When to use which">
          <ul>
            <li>
              <strong>Use the Application panel</strong> for one-off lookups,
              service-worker debugging, and clearing storage during local
              development.
            </li>
            <li>
              <strong>Use IdxBeaver</strong> when you need to filter, sort,
              edit in bulk, export, import, share queries with teammates, or
              understand the shape of a store you didn&rsquo;t design.
            </li>
          </ul>
        </ContentSection>

        <div className="mt-16 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button
            as="a"
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            Add IdxBeaver to Chrome
          </Button>
          <Button
            as="a"
            href="https://github.com/adityaongit/idxbeaver"
            target="_blank"
            rel="noopener"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            View source on GitHub
          </Button>
        </div>
      </ContentShell>
    </>
  );
}

type Cell = string;

function ComparisonTable({ rows }: { rows: Array<[string, Cell, Cell]> }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[34%]" />
          <col className="w-[34%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--color-hair)] text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
            <th className="px-3 py-4 align-bottom">Capability</th>
            <th className="px-3 py-4 align-bottom text-[var(--color-ink)]">IdxBeaver</th>
            <th className="px-3 py-4 align-bottom">Application panel</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([cap, idx, app], i) => (
            <tr
              key={cap}
              className={[
                "border-b border-[var(--color-hair)] align-top",
                i % 2 === 1 ? "bg-white/[.015]" : "",
              ].join(" ")}
            >
              <td className="px-3 py-4 font-medium text-[var(--color-ink)]">{cap}</td>
              <td className="px-3 py-4">
                <ComparisonCell value={idx} positive />
              </td>
              <td className="px-3 py-4">
                <ComparisonCell value={app} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonCell({ value, positive = false }: { value: Cell; positive?: boolean }) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "no" || trimmed === "none" || trimmed === "n/a") {
    return <NoIcon />;
  }
  if (trimmed === "yes") {
    return <YesIcon />;
  }
  return (
    <span
      className={[
        "leading-[1.55]",
        positive ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)]",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function NoIcon() {
  return (
    <span
      role="img"
      aria-label="not supported"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(244,114,182,.12)] text-[#f472b6] ring-1 ring-inset ring-[rgba(244,114,182,.35)]"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M3 3l6 6M9 3l-6 6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function YesIcon() {
  return (
    <span
      role="img"
      aria-label="supported"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(167,139,250,.14)] text-[var(--color-brand)] ring-1 ring-inset ring-[rgba(167,139,250,.35)]"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path
          d="M2.5 6.8l2.6 2.6 5.4-5.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
