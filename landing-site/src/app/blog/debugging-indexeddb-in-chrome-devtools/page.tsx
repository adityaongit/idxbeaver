import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ContentSection } from "@/components/content-shell";
import { getPostBySlug, postLastModified } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

const SLUG = "debugging-indexeddb-in-chrome-devtools";
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
      <ContentSection title="Why IndexedDB debugging gets painful">
        <p>
          IndexedDB started as the &ldquo;serious&rdquo; client-side database
          API after WebSQL was deprecated. It&rsquo;s asynchronous,
          transactional, supports indexes, and survives page reloads — exactly
          the storage backbone a local-first or offline-capable app needs.
          What it isn&rsquo;t is friendly to inspect at scale.
        </p>
        <p>
          The Chrome DevTools Application panel exposes the raw structure:
          databases, object stores, indexes, and a paginated table of records.
          That&rsquo;s enough to confirm a key/value pair landed where you
          expected. It is not enough for the question &ldquo;why does this
          object store have 18,000 rows when we only sync 8,000 events?&rdquo;
        </p>
      </ContentSection>

      <ContentSection title="The core workflow inside the Application panel">
        <p>
          Here&rsquo;s the bare-minimum path that ships with Chrome:
        </p>
        <ol>
          <li>
            Open DevTools → <strong>Application</strong> tab → expand{" "}
            <strong>Storage → IndexedDB</strong>.
          </li>
          <li>
            Pick a database, then an object store. Records load into the right
            pane. Click any cell to expand its value tree.
          </li>
          <li>
            Click <strong>Refresh</strong> (the circular arrow in the top
            left) any time the running page mutates the store — the panel does
            not auto-poll.
          </li>
          <li>
            Use the <strong>Delete selected</strong> button to remove a row,
            or right-click → <strong>Delete database</strong> to nuke the
            whole thing during local dev.
          </li>
        </ol>
        <p>
          That covers the inspect-and-clear workflow. What it doesn&rsquo;t
          cover is filtering, querying, exporting, or understanding what fields
          actually exist on a row.
        </p>
      </ContentSection>

      <ContentSection title="Five things the built-in panel doesn't do">
        <h3>1. Filter records</h3>
        <p>
          There&rsquo;s a <em>Start from key</em> input that scrolls the cursor
          to a primary key, but no &ldquo;show me only the rows where{" "}
          <code translate="no">status === &quot;refunded&quot;</code>.&rdquo; If your store
          is meaningful, you&rsquo;re scrolling.
        </p>

        <h3>2. Project columns</h3>
        <p>
          Each row renders as a JSON tree. Comparing the same field across many
          rows means clicking through them one at a time. There&rsquo;s no
          tabular projection like &ldquo;just show me{" "}
          <code translate="no">{`{id, status, total}`}</code> across these 200 rows.&rdquo;
        </p>

        <h3>3. Round-trip non-JSON types</h3>
        <p>
          IndexedDB stores arbitrary structured-clone values: <code translate="no">Date</code>,{" "}
          <code translate="no">Map</code>, <code translate="no">Set</code>, <code translate="no">BigInt</code>,{" "}
          <code translate="no">ArrayBuffer</code>, <code translate="no">Blob</code>, even circular references.
          Copying out of the panel stringifies most of these — by the time
          they hit your clipboard they&rsquo;re lossy.
        </p>

        <h3>4. Bulk-edit</h3>
        <p>
          You can edit a top-level cell value in some panel modes, but nested
          fields and bulk operations require code in the page&rsquo;s console.
        </p>

        <h3>5. See what a store actually contains</h3>
        <p>
          The panel never tells you &ldquo;these 1,200 rows have these 14
          fields, with these types, and{" "}
          <code translate="no">shippingCity</code> is missing on 38% of them.&rdquo; That&rsquo;s
          a schema-inference problem, and it&rsquo;s where most non-trivial
          IndexedDB debugging actually starts.
        </p>
      </ContentSection>

      <ContentSection title="The console fallback (and why it doesn't scale)">
        <p>
          When the panel runs out of road, most people drop into the console:
        </p>
        <CodeBlock
          lang="js"
          code={`const open = indexedDB.open("local_first_app");
open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction("orders", "readonly");
  const store = tx.objectStore("orders");
  const req = store.openCursor();
  const out = [];
  req.onsuccess = (e) => {
    const cur = e.target.result;
    if (!cur) { console.table(out); return; }
    if (cur.value.status === "refunded") out.push(cur.value);
    cur.continue();
  };
};`}
        />
        <p>
          Three problems with this:
        </p>
        <ul>
          <li>
            You re-type it every time. There&rsquo;s no history, no shareable
            artifact.
          </li>
          <li>
            <code translate="no">console.table</code> truncates nested fields and gives you
            no way to round-trip the result back into the database or out to
            CSV.
          </li>
          <li>
            You&rsquo;re bypassing the IDB index machinery entirely — the
            cursor scans every row even when an index would have answered the
            query in O(log n + k).
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="What to do instead">
        <p>
          The shape of the problem is well-known: IndexedDB needs a real
          query interface, schema inference, projection, sort/limit, and
          bulk-export. That&rsquo;s exactly the gap{" "}
          <a href="/">IdxBeaver</a> fills inside DevTools — it gives you a
          MongoDB-style filter language, an index-aware planner, an inferred
          schema view, multi-tab queries, and exports across JSON, NDJSON,
          CSV, SQL, and ZIP. Same data, same browser, same DevTools panel —
          just with the operators a real database client gives you.
        </p>
        <p>
          If you&rsquo;re curious how the query language compiles down, the
          companion post on{" "}
          <a href="/blog/querying-indexeddb-with-mongo-style-filters/">
            MongoDB-style filters over IndexedDB
          </a>{" "}
          walks through the planner.
        </p>
      </ContentSection>

      <ContentSection title="Related reading">
        <ul>
          <li>
            <a href="/blog/how-to-edit-indexeddb-values-in-chrome/">
              How to edit IndexedDB values in Chrome
            </a>{" "}
            — the three ways around the panel&rsquo;s read-only grid.
          </li>
          <li>
            <a href="/blog/exporting-indexeddb-data/">
              Exporting IndexedDB data
            </a>{" "}
            — getting a store out to JSON, NDJSON, CSV or SQL.
          </li>
          <li>
            <a href="/blog/browser-storage-types-explained/">
              Browser storage types explained
            </a>{" "}
            — when IndexedDB is the wrong place for the data.
          </li>
          <li>
            <a href="/vs/indexeddb-viewer-extensions/">
              IndexedDB viewer extensions compared
            </a>{" "}
            — the third-party tools in this space, side by side.
          </li>
        </ul>
      </ContentSection>
    </BlogPostShell>
  );
}
