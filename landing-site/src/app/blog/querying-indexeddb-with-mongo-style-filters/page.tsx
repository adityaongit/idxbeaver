import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { ContentSection } from "@/components/content-shell";
import { getPostBySlug } from "@/lib/blog";

const SLUG = "querying-indexeddb-with-mongo-style-filters";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: `${post.title} — IdxBeaver`,
  description: post.description,
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: post.title,
    description: post.description,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: post.publishedOn,
  },
  twitter: { card: "summary_large_image", title: post.title, description: post.description },
};

export default function Page() {
  return (
    <BlogPostShell post={post}>
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
        <pre>
          <code>{`{
  "store":  "orders",                      // required
  "filter": { ...mongo-style filter... },  // required (can be {})
  "project": ["id", "total", "status"],    // optional column projection
  "sort":   { "createdAt": -1 },           // optional, in-memory sort
  "limit":  50                             // optional
}`}</code>
        </pre>
        <p>
          The filter is the interesting part. It supports the standard equality
          shorthand, plus operator-prefixed fields:
        </p>
        <pre>
          <code>{`// equality
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
{ "shipping.city": "Lisbon" }`}</code>
        </pre>
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
            <code>IDBIndex</code> exists with a matching{" "}
            <code>keyPath</code>. If it finds one, the cursor opens against
            that index with an <code>IDBKeyRange</code> derived from the
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
        <pre>
          <code>{`used index "status" · scanned 18 · matched 12 · returned 12`}</code>
        </pre>
        <p>
          And a typical bad plan — full scan because no useful index exists —
          reads:
        </p>
        <pre>
          <code>{`full object-store scan · scanned 12,408 · matched 87 · returned 50`}</code>
        </pre>
        <p>
          That&rsquo;s the signal: add an index on the field you&rsquo;re
          filtering by. The query doesn&rsquo;t change; the next run picks up
          the index automatically.
        </p>
      </ContentSection>

      <ContentSection title="Five examples that map cleanly">
        <h3>1. &ldquo;Find recent refunds&rdquo;</h3>
        <pre>
          <code>{`{
  "store": "orders",
  "filter": {
    "status": "refunded",
    "createdAt": { "$gte": "2026-04-01" }
  },
  "sort":  { "createdAt": -1 },
  "limit": 100
}`}</code>
        </pre>
        <p>
          With an index on <code>status</code> the planner range-scans the
          refunded slice, then in-memory filters by date. No full table scan.
        </p>

        <h3>2. &ldquo;Show users with no email&rdquo;</h3>
        <pre>
          <code>{`{
  "store":  "users",
  "filter": { "email": { "$eq": null } }
}`}</code>
        </pre>

        <h3>3. &ldquo;Find sync queue items pending for over an hour&rdquo;</h3>
        <pre>
          <code>{`{
  "store": "syncQueue",
  "filter": {
    "$and": [
      { "state": "pending" },
      { "queuedAt": { "$lt": "$NOW - 1h" } }
    ]
  }
}`}</code>
        </pre>

        <h3>4. &ldquo;Project a subset for export&rdquo;</h3>
        <pre>
          <code>{`{
  "store":   "orders",
  "filter":  { "status": "delivered" },
  "project": ["id", "userId", "total", "shippingCity"],
  "limit":   1000
}`}</code>
        </pre>
        <p>
          Combined with a CSV export, this is the fastest way to hand a tester
          or analyst a slice of production-shaped data without writing code.
        </p>

        <h3>5. &ldquo;Negate a list&rdquo;</h3>
        <pre>
          <code>{`{
  "store":  "events",
  "filter": { "type": { "$nin": ["heartbeat", "ping"] } }
}`}</code>
        </pre>
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
            <strong>Aggregations.</strong> No <code>$group</code> /{" "}
            <code>$sum</code> yet — the project view gives you the rows; you
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
          {" "}— the planner is in <code>src/background/index.ts</code>,
          inside the injected <code>executeStorageRequest</code> function;
          the parser lives in <code>src/shared/query.ts</code>.
        </p>
      </ContentSection>
    </BlogPostShell>
  );
}
