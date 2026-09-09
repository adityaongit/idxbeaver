import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ContentSection } from "@/components/content-shell";
import { getPostBySlug, postLastModified } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

const SLUG = "querying-indexeddb-with-mongo-style-filters";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = pageMetadata({
  title: `${post.title} — IdxBeaver`,
  socialTitle: post.title,
  description: post.description,
  path: `/blog/${SLUG}`,
  type: "article",
  publishedTime: post.publishedOn,
  modifiedTime: postLastModified(post),
});

export default async function Page() {
  return (
    <BlogPostShell post={post}>
      <ContentSection title="First, querying IndexedDB natively">
        <p>
          Before any of this, it is worth being precise about what IndexedDB
          gives you out of the box, because the native primitives are the thing
          a filter language compiles down to.
        </p>
        <p>
          There are three ways to read: get a single record by key, get many
          records matching a key range, or walk a cursor.
        </p>
        <CodeBlock
          lang="js"
          code={`const tx = db.transaction("orders", "readonly");
const store = tx.objectStore("orders");

// 1. One record by primary key
store.get("ord_1042");

// 2. Many records, optionally bounded by a key range
store.getAll();                                  // everything
store.getAll(IDBKeyRange.bound("ord_1", "ord_2")); // a slice
store.count(IDBKeyRange.lowerBound("ord_5"));      // just the count

// 3. A cursor, when you need to inspect or edit as you go
store.openCursor().onsuccess = (event) => {
  const cursor = event.target.result;
  if (!cursor) return;
  console.log(cursor.key, cursor.value);
  cursor.continue();
};`}
        />
        <p>
          Ranges are built with <code translate="no">IDBKeyRange</code>:{" "}
          <code translate="no">only</code>, <code translate="no">bound</code>, <code translate="no">lowerBound</code> and{" "}
          <code translate="no">upperBound</code>, each taking an optional flag to make the
          endpoint exclusive. Anything more selective than a key range needs an
          index:
        </p>
        <CodeBlock
          lang="js"
          code={`// Query by a non-key field, via an index declared in onupgradeneeded
const byStatus = store.index("by_status");
byStatus.getAll("pending");

// Descending walk over an index
byStatus.openCursor(null, "prev").onsuccess = (event) => {
  const cursor = event.target.result;
  if (!cursor) return;
  console.log(cursor.value);
  cursor.continue();
};`}
        />
        <p>
          That is the whole query surface. Notice what is missing: there is no
          way to express &ldquo;status is pending <em>and</em> total is over
          20000&rdquo; in one call. IndexedDB has no compound predicate, no
          sorting beyond index order, and no projection. You get one index per
          query, and everything else is a loop you write yourself.
        </p>
        <p>
          So in practice every non-trivial IndexedDB query becomes: pick the
          most selective index, range-scan it, then filter the results in
          memory. A filter language is a way of not hand-writing that every
          time.
        </p>
      </ContentSection>

      <ContentSection title="Why we need a query language at all">
        <p>
          IndexedDB&rsquo;s native API is verbose by design — it predates
          async/await, was designed around opening a transaction, getting an
          object store, getting an index, opening a cursor, advancing it,
          collecting matches into an array. Half the code in any IDB-using
          app is plumbing.
        </p>
        <p>
          A filter language hides the plumbing. The same query that takes 25
          lines of cursor code can be expressed as a JSON object that&rsquo;s
          shareable, version-controllable, and inspectable in a panel. The
          language doesn&rsquo;t replace the API — it{" "}
          <em>compiles down to it</em>, with the same operational
          characteristics.
        </p>
      </ContentSection>

      <ContentSection title="The shape of the language">
        <p>
          MongoDB&rsquo;s filter syntax is a good fit because IDB rows are
          (effectively) BSON-shaped: structured-clone documents, nested
          objects, arrays of primitives. The full IdxBeaver query is four
          fields:
        </p>
        <CodeBlock
          lang="jsonc"
          code={`{
  "store":  "orders",                      // required
  "filter": { ...mongo-style filter... },  // required (can be {})
  "project": ["id", "total", "status"],    // optional column projection
  "sort":   { "createdAt": -1 },           // optional, in-memory sort
  "limit":  50                             // optional
}`}
        />
        <p>
          The filter is the interesting part. It supports the standard equality
          shorthand, plus operator-prefixed fields:
        </p>
        <CodeBlock
          lang="jsonc"
          code={`// equality
{ "status": "delivered" }

// comparison
{ "total": { "$gte": 20000, "$lt": 40000 } }

// membership
{ "currency": { "$in": ["USD", "EUR"] } }

// negation
{ "status": { "$ne": "refunded" } }

// composition
{ "$and": [
    { "status": "delivered" },
    { "createdAt": { "$gte": "2026-01-01" } }
] }

// nested paths use dotted keys
{ "shipping.city": "Lisbon" }`}
        />
      </ContentSection>

      <ContentSection title="How it compiles down">
        <p>
          The whole point of this layer is preserving IDB&rsquo;s index
          machinery. The planner does two passes:
        </p>
        <ol>
          <li>
            <strong>Index-hint scan.</strong> Walk the filter looking for
            single-field equality or range expressions where an{" "}
            <code translate="no">IDBIndex</code> exists with a matching{" "}
            <code translate="no">keyPath</code>. If it finds one, the cursor opens against
            that index with an <code translate="no">IDBKeyRange</code> derived from the
            filter — bounded scan, not full-store.
          </li>
          <li>
            <strong>In-memory match.</strong> Apply the rest of the filter
            (compound operators, nested paths, anything the index can&rsquo;t
            cover) to each row produced by the cursor. The remaining ops are
            cheap because the cardinality is already reduced.
          </li>
        </ol>
        <p>
          The chosen plan is reported alongside the result so you can spot a
          missing index. A typical good plan reads:
        </p>
        <CodeBlock
          lang="text"
          code={`used index "status" · scanned 18 · matched 12 · returned 12`}
        />
        <p>
          And a typical bad plan — full scan because no useful index exists —
          reads:
        </p>
        <CodeBlock
          lang="text"
          code={`full object-store scan · scanned 12,408 · matched 87 · returned 50`}
        />
        <p>
          That&rsquo;s the signal: add an index on the field you&rsquo;re
          filtering by. The query doesn&rsquo;t change; the next run picks up
          the index automatically.
        </p>
      </ContentSection>

      <ContentSection title="Five examples that map cleanly">
        <h3>1. &ldquo;Find recent refunds&rdquo;</h3>
        <CodeBlock
          lang="json"
          code={`{
  "store": "orders",
  "filter": {
    "status": "refunded",
    "createdAt": { "$gte": "2026-04-01" }
  },
  "sort":  { "createdAt": -1 },
  "limit": 100
}`}
        />
        <p>
          With an index on <code translate="no">status</code> the planner range-scans the
          refunded slice, then in-memory filters by date. No full table scan.
        </p>

        <h3>2. &ldquo;Show users with no email&rdquo;</h3>
        <CodeBlock
          lang="json"
          code={`{
  "store":  "users",
  "filter": { "email": { "$eq": null } }
}`}
        />

        <h3>3. &ldquo;Find sync queue items pending for over an hour&rdquo;</h3>
        <CodeBlock
          lang="json"
          code={`{
  "store": "syncQueue",
  "filter": {
    "$and": [
      { "state": "pending" },
      { "queuedAt": { "$lt": "$NOW - 1h" } }
    ]
  }
}`}
        />

        <h3>4. &ldquo;Project a subset for export&rdquo;</h3>
        <CodeBlock
          lang="json"
          code={`{
  "store":   "orders",
  "filter":  { "status": "delivered" },
  "project": ["id", "userId", "total", "shippingCity"],
  "limit":   1000
}`}
        />
        <p>
          Combined with a CSV export, this is the fastest way to hand a tester
          or analyst a slice of production-shaped data without writing code.
        </p>

        <h3>5. &ldquo;Negate a list&rdquo;</h3>
        <CodeBlock
          lang="json"
          code={`{
  "store":  "events",
  "filter": { "type": { "$nin": ["heartbeat", "ping"] } }
}`}
        />
      </ContentSection>

      <ContentSection title="What it doesn't do (yet)">
        <ul>
          <li>
            <strong>Joins.</strong> IDB has no native join. Joining two stores
            client-side means running two queries and merging in code, which
            is fine for ~thousands of rows but breaks down for millions.
            Plain SQL with an actual relational engine is on the roadmap for
            larger workloads.
          </li>
          <li>
            <strong>Aggregations.</strong> No <code translate="no">$group</code> /{" "}
            <code translate="no">$sum</code> yet — the project view gives you the rows; you
            do the math in your head or in a spreadsheet.
          </li>
          <li>
            <strong>Mutations.</strong> The filter language is read-only by
            design. Writes happen through inline grid edits with undo/redo,
            not a query DSL.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Why this scales">
        <p>
          A filter language that <em>looks</em> like Mongo and{" "}
          <em>compiles</em> to native IDB cursor code is the right level of
          abstraction for browser storage debugging. You get readable
          queries, an inspectable plan, no extra runtime cost over hand-written
          cursor code, and shareable artifacts (a filter is just JSON). The
          underlying API stays the same — the query layer just stops being a
          chore.
        </p>
        <p>
          See the implementation in{" "}
          <a
            href="https://github.com/adityaongit/idxbeaver"
            target="_blank"
            rel="noopener"
          >
            the IdxBeaver source
          </a>
          {" "}— the planner is in <code translate="no">src/background/index.ts</code>,
          inside the injected <code translate="no">executeStorageRequest</code> function;
          the parser lives in <code translate="no">src/shared/query.ts</code>.
        </p>
      </ContentSection>

      <ContentSection title="Related reading">
        <ul>
          <li>
            <a href="/">IdxBeaver</a> ships this query language as a Chrome
            DevTools panel, with the plan shown next to every result.
          </li>
          <li>
            <a href="/blog/debugging-indexeddb-in-chrome-devtools/">
              Debugging IndexedDB in Chrome DevTools
            </a>{" "}
            — the inspection workflow these queries run inside.
          </li>
          <li>
            <a href="/blog/how-to-edit-indexeddb-values-in-chrome/">
              How to edit IndexedDB values in Chrome
            </a>{" "}
            — once a filter has found the rows, changing them.
          </li>
          <li>
            <a href="/blog/exporting-indexeddb-data/">
              Exporting IndexedDB data
            </a>{" "}
            — exporting a filtered slice rather than a whole store.
          </li>
        </ul>
      </ContentSection>
    </BlogPostShell>
  );
}
