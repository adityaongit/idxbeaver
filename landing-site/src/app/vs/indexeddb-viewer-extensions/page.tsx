import type { Metadata } from "next";

import { ComparisonTable } from "@/components/comparison-table";
import { ContentSection, ContentShell } from "@/components/content-shell";
import { CwsInstallButton } from "@/components/cws-install-button";
import { ProductFigure } from "@/components/product-figure";
import { Button } from "@/components/ui/button";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { entityRef, ORG_ID, PERSON_ID } from "@/lib/entities";
import { OG_IMAGE_PATH, pageMetadata } from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site";

const TITLE = "IndexedDB viewer extensions compared";
const DESCRIPTION =
  "IdxBeaver, Kahuna, IndexedDB Browser, idb-crud, IndexedDB Explorer and IndexedDBEdit compared: storage surfaces, queries, schema editing, exports, type support, and which to pick.";

const VERIFIED_ON = "10 September 2026";

export const metadata: Metadata = pageMetadata({
  title: `${TITLE} — IdxBeaver`,
  socialTitle: TITLE,
  description: DESCRIPTION,
  path: "/vs/indexeddb-viewer-extensions",
  type: "article",
  publishedTime: "2026-09-09",
  modifiedTime: "2026-09-10",
});

const PRODUCTS = [
  "IdxBeaver",
  "Kahuna",
  "IndexedDB Browser",
  "idb-crud",
  "IndexedDB Explorer",
  "IndexedDBEdit",
];

export default async function VsIndexedDbExtensionsPage() {
  const base = resolveSiteUrl();
  const path = "/vs/indexeddb-viewer-extensions/";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    mainEntityOfPage: `${base}${path}`,
    url: `${base}${path}`,
    image: [`${base}${OG_IMAGE_PATH}`],
    author: entityRef(PERSON_ID),
    publisher: entityRef(ORG_ID),
    datePublished: "2026-09-09",
    dateModified: "2026-09-10",
    isAccessibleForFree: true,
  };

  const crumbs = [{ name: "IndexedDB viewer extensions compared", path }];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);

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
        crumbs={crumbs}
        title="IndexedDB viewer extensions, compared"
        lede="There are a handful of Chrome extensions for looking at IndexedDB. Most of them do the same thing: render an object store as a table and let you edit a cell. Here is what actually separates them, including where IdxBeaver is the wrong choice."
      >
        <ContentSection title="The short version">
          <p>
            Every tool here can open an object store and show you rows. If
            that is all you need, install whichever one you like the look of
            and stop reading, they are all free.
          </p>
          <p>
            The differences show up once the store is large, the data is not
            plain JSON, or you need to ask a question more specific than
            &ldquo;show me everything&rdquo;. That is where a table viewer and
            a database client stop being the same category of thing.
          </p>
          <p>
            IdxBeaver is the only one of the six that ships a query language
            or infers a schema, and the only one that covers Cookies and Cache
            Storage alongside IndexedDB. Kahuna is the closest thing to a peer:
            it also handles the awkward structured-clone types, exports in
            Dexie&rsquo;s format, runs on Firefox, and can edit a schema, which
            IdxBeaver cannot. If you want the honest counter-argument, skip
            to{" "}
            <a href="#when-not-idxbeaver">when not to use IdxBeaver</a>.
          </p>
        </ContentSection>

        <ContentSection title="Capability matrix">
          <p>
            Claims for the other five tools were taken from their public
            READMEs and Chrome Web Store listings, checked on {VERIFIED_ON}.
            &ldquo;Not documented&rdquo; means the capability is absent from
            those sources, not that it has been tested and found missing. If
            one of these is wrong or out of date,{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver/issues"
              target="_blank"
              rel="noopener"
            >
              open an issue
            </a>{" "}
            and it will be corrected.
          </p>
          <ComparisonTable
            products={PRODUCTS}
            rows={[
              [
                "Storage surfaces",
                "IndexedDB, LocalStorage, SessionStorage, Cookies, Cache Storage",
                "IndexedDB only",
                "IndexedDB only",
                "IndexedDB, LocalStorage, SessionStorage",
                "IndexedDB only",
                "IndexedDB only",
              ],
              [
                "Where it runs",
                "DevTools panel",
                "Overlay on the page, outside DevTools",
                "DevTools panel",
                "Drawer UI, outside DevTools",
                "Not stated on listing",
                "DevTools panel",
              ],
              [
                "Query language",
                "MongoDB-style filter, projection, sort, limit",
                "A JavaScript console over Dexie's API; no declarative query",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Index-aware query planning",
                "Picks an IDBIndex when the filter allows, and reports the plan it used",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Saved queries and history",
                "Per origin, auto-trimmed to the 100 most recent",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Schema inference",
                "Samples rows for field types and coverage; powers autocomplete and a Structure view",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Schema export to code",
                "TypeScript interface or Dexie schema",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Data export formats",
                "JSON, NDJSON, CSV, SQL INSERT, ZIP snapshot",
                "Dexie, JSON, CSV",
                "Not documented",
                "Export and import, formats unspecified",
                "Not documented",
                "Not documented",
              ],
              [
                "Non-JSON value round-trip",
                "Date, BigInt, RegExp, Map, Set, ArrayBuffer, Blob, circular refs",
                "Documents editing Dates, Maps, Sets, RegExps, typed arrays, Blobs, Files and ImageData",
                "Documents sets, maps and typed arrays as unsupported",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Large object stores",
                "Virtualized grid; rows render on demand",
                "Paginated grid, page size not stated",
                "Documents slower loads for stores with hundreds of thousands of objects",
                "Not documented",
                "Paged, up to 5,000 records per page",
                "Not documented",
              ],
              [
                "Multi-frame discovery",
                "Scans every scriptable frame and merges results",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Schema editing",
                "Delete a database or store; no create, add or alter",
                "Create and delete databases, add and remove object stores and indexes",
                "Not documented",
                "Not documented",
                "Not documented",
                "Not documented",
              ],
              [
                "Browsers",
                "Chromium 120 or newer",
                "Chromium and Firefox",
                "Chrome Web Store only",
                "Chrome Web Store only",
                "Chrome Web Store only",
                "Chrome Web Store only",
              ],
              [
                "Editing model",
                "Inline grid edits with per-cell undo and redo",
                "Full create, read, update, delete",
                "Add, edit and delete in a table",
                "Full create, read, update, delete",
                "Add or delete records",
                "Modify or delete key-value records",
              ],
              [
                "Search, sort, column control",
                "Filter bar, sort, column pin and resize, sticky headers",
                "Filters with regex, sortable grid, configurable, reorderable and hideable columns",
                "Table search, per-column filter, drag-to-reorder columns",
                "Advanced sorting and filtering, customizable columns",
                "Real-time record search",
                "Not documented",
              ],
              [
                "Source available",
                "Yes, MIT",
                "Yes, on GitHub",
                "Yes, on GitHub",
                "Described as open source",
                "Not stated on listing",
                "Yes, on GitHub",
              ],
            ]}
          />
        </ContentSection>

        <ContentSection title="What the differences look like in practice">
          <h3>A table viewer answers &ldquo;what is in here&rdquo;</h3>
          <p>
            Five of these six tools are built around one interaction: pick a
            store, render it as a table, click a cell to change it. That is
            genuinely the right shape for most debugging. You have twelve rows
            of app settings and one of them is wrong.
          </p>
          <p>
            It stops working at scale. Once a store holds tens of thousands of
            records, &ldquo;render it as a table and search visible
            columns&rdquo; means paging through data hunting for the row you
            want. IndexedDB Browser is upfront about this in its own README,
            noting it is designed for small to medium stores and that loads get
            slower in the hundreds of thousands. IndexedDB Explorer takes the
            other approach and pages at up to 5,000 records at a time.
          </p>

          <h3>A query answers &ldquo;which rows match&rdquo;</h3>
          <p>
            IdxBeaver treats the store as something you interrogate rather than
            scroll:
          </p>
          <ProductFigure
            asset="query"
            alt="The IdxBeaver query editor running a MongoDB-style filter against an IndexedDB object store, with the chosen query plan displayed next to the results"
            caption="Filters, projection, sort and limit, with the chosen query plan reported alongside the results."
          />
          <p>
            The planner looks for single-field equality and range expressions
            it can push down to an <code translate="no">IDBIndex</code>, and falls back to an
            in-memory match for compound operators. It then tells you which
            path it took, which is how you notice a store is missing an index
            it should have. No other tool in this comparison documents anything
            equivalent.
          </p>

          <h3>Types are where naive viewers quietly lose data</h3>
          <p>
            IndexedDB stores structured-clone values, not JSON. A record can
            hold a <code translate="no">Date</code>, a <code translate="no">Map</code>, a <code translate="no">Set</code>, a{" "}
            <code translate="no">BigInt</code>, an <code translate="no">ArrayBuffer</code>, a{" "}
            <code translate="no">Blob</code>, or a circular reference. Render that through{" "}
            <code translate="no">JSON.stringify</code> and a <code translate="no">Date</code> becomes a
            string, a <code translate="no">Map</code> becomes <code translate="no">{"{}"}</code>, and a
            circular reference throws.
          </p>
          <p>
            This is the one place the difference is documented rather than
            inferred: IndexedDB Browser states plainly that sets, maps and
            typed arrays are not supported. IdxBeaver serializes through a
            versioned wire format specifically so these survive a round trip
            through an export and back. Kahuna documents the same care here,
            and goes further than we do on <code translate="no">File</code> and{" "}
            <code translate="no">ImageData</code> values.
          </p>

          <h3>IndexedDB is not the only storage you are debugging</h3>
          <p>
            A session bug is rarely confined to one storage API. The token is
            in a cookie, the feature flag is in LocalStorage, the cached
            response is in Cache Storage, and the user data is in IndexedDB.
            Four of these tools are IndexedDB-only; idb-crud adds LocalStorage
            and SessionStorage. IdxBeaver covers all five surfaces in one
            panel, so you are not switching tools mid-investigation.
          </p>
          <ProductFigure
            asset="dark"
            alt="IdxBeaver's data grid in Chrome DevTools showing an IndexedDB object store with pinned columns and an expanded row inspector"
            caption="One panel for IndexedDB, LocalStorage, SessionStorage, Cookies and Cache Storage."
          />
        </ContentSection>

        <ContentSection title="When not to use IdxBeaver" id="when-not-idxbeaver">
          <p>
            A comparison page written by the author of one of the tools is
            worth exactly as much as its willingness to say this part.
          </p>
          <ul>
            <li>
              <strong>You want storage inspection without opening DevTools.</strong>{" "}
              IdxBeaver is a DevTools panel, so it only exists while DevTools
              is open. Kahuna&rsquo;s overlay and idb-crud&rsquo;s drawer both
              work outside DevTools, which is a genuinely nicer fit for a quick
              look at a flag. Kahuna additionally shows the database count for
              the current site on its toolbar icon, so you can tell a site uses
              IndexedDB without opening anything at all.
            </li>
            <li>
              <strong>You need to create a database, or add a store or index.</strong>{" "}
              IdxBeaver can delete a database or an object store but cannot
              create or alter one. Kahuna has a schema editor for exactly this.
            </li>
            <li>
              <strong>You want charts or store size breakdowns.</strong>{" "}
              IndexedDB Explorer advertises size calculations and chart
              generation. IdxBeaver does neither.
            </li>
            <li>
              <strong>You are on Firefox or Safari.</strong> IdxBeaver is
              Chromium 120 or newer today. Kahuna ships on both Chromium and
              Firefox, so it is the answer for a mixed-browser team.
            </li>
            <li>
              <strong>You need Service Worker debugging.</strong> That belongs
              to Chrome&rsquo;s own Application panel and IdxBeaver does not
              try to replace it. The{" "}
              <a href="/vs/chrome-devtools-application-panel/">
                comparison against the built-in panel
              </a>{" "}
              covers where each one wins.
            </li>
            <li>
              <strong>You want the most widely installed option.</strong>{" "}
              IdxBeaver is new. Several of these tools have been around
              considerably longer.
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Which one should you pick">
          <ul>
            <li>
              <strong>Editing a handful of values.</strong> Any of them.
              IndexedDBEdit is the smallest and most focused.
            </li>
            <li>
              <strong>Browsing a small store in a nice table.</strong>{" "}
              IndexedDB Browser, which documents its scope honestly and does
              that job well.
            </li>
            <li>
              <strong>Quick look without DevTools.</strong> Kahuna or idb-crud.
            </li>
            <li>
              <strong>Editing a schema, or working on Firefox.</strong> Kahuna.
            </li>
            <li>
              <strong>Large stores, real queries, exports, unusual types, or
              more than one storage API.</strong>{" "}
              IdxBeaver.
            </li>
          </ul>
        </ContentSection>

        <div className="mt-16 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <CwsInstallButton className="w-full sm:w-auto" />
          <Button
            as="a"
            href="https://github.com/adityaongit/idxbeaver"
            target="_blank"
            rel="noopener"
            variant="outline"
            size="lg"
            className="h-[52px] w-full rounded-[8px] px-5 text-[15px] sm:w-auto"
          >
            View source on GitHub
          </Button>
        </div>
      </ContentShell>
    </>
  );
}
