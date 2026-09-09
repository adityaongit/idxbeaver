import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ContentSection } from "@/components/content-shell";
import { ProductFigure } from "@/components/product-figure";
import { getPostBySlug, postLastModified } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

const SLUG = "how-to-edit-indexeddb-values-in-chrome";
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
      <ContentSection title="The short answer">
        <p>
          Chrome&rsquo;s DevTools Application panel will show you IndexedDB
          records but it will not let you change them. Keys and values are
          read-only there. Chrome&rsquo;s own documentation says so, and points
          you at the Console instead.
        </p>
        <p>
          So there are three real options, in increasing order of how often you
          need to do this:
        </p>
        <ol>
          <li>
            Run a one-off <code translate="no">put()</code> in the Console.
          </li>
          <li>
            Save a reusable DevTools Snippet, so you stop rewriting the same
            twenty lines.
          </li>
          <li>
            Use a panel that makes the grid itself editable.
          </li>
        </ol>
        <p>
          All three are below, including the parts that bite: the transaction
          that closes before your callback runs, and the difference between an
          inline key and an out-of-line one.
        </p>
      </ContentSection>

      <ContentSection title="Why the Application panel is read-only">
        <p>
          The Application panel is a viewer. It opens a read transaction,
          advances a cursor, and renders what it finds. It deliberately does not
          expose a write path, so there is no cell you can type into and no
          context-menu edit. You can delete a selected record, and you can clear
          an entire object store, but you cannot change a field.
        </p>
        <p>
          This is not a bug you can configure around, and it is the reason
          nearly every search for editing IndexedDB lands on a Console
          workaround. DevTools does give you one useful lever though: code you
          run in the Console executes in the inspected page&rsquo;s context, so
          it can reach the same databases the page can.
        </p>
      </ContentSection>

      <ContentSection title="Option 1: edit one value from the Console">
        <p>
          IndexedDB&rsquo;s API is event-based and predates promises, which is
          why the shortest correct snippet is still this long. Open the Console
          on the page that owns the data and run:
        </p>
        <CodeBlock
          lang="js"
          code={`// Edit a single record by key.
// Replace: DB_NAME, STORE_NAME, RECORD_KEY, and the mutation.
const req = indexedDB.open("DB_NAME");

req.onsuccess = () => {
  const db = req.result;
  const tx = db.transaction("STORE_NAME", "readwrite");
  const store = tx.objectStore("STORE_NAME");

  const getReq = store.get("RECORD_KEY");

  getReq.onsuccess = () => {
    const record = getReq.result;
    if (!record) {
      console.warn("No record for that key");
      return;
    }

    // --- your change goes here ---
    record.status = "delivered";
    // -----------------------------

    // Inline key (store was created with a keyPath): put(value)
    // Out-of-line key: put(value, key)
    store.put(record);
  };

  tx.oncomplete = () => {
    console.log("done");
    db.close();
  };
  tx.onerror = () => console.error(tx.error);
};`}
        />
        <p>
          Two things go wrong here more than anything else.
        </p>
        <p>
          <strong>Do not open the database without a version argument if you
          are unsure it exists.</strong>{" "}
          <code translate="no">indexedDB.open(&quot;name&quot;)</code> on a name that does not
          exist will happily create an empty database rather than fail, and then
          your <code translate="no">get()</code> returns <code translate="no">undefined</code> and you spend
          ten minutes wondering where the data went. Check the exact name in the
          Application panel first.
        </p>
        <p>
          <strong>Do not <code translate="no">await</code> anything between opening the
          transaction and using it.</strong> An IndexedDB transaction
          auto-commits when the microtask queue drains without a pending
          request. Wrap the raw API in promises and you will eventually hit{" "}
          <code translate="no">TransactionInactiveError</code> on a transaction that looked
          fine a line earlier. Keep the work inside the event callbacks, as
          above.
        </p>

        <h3>Inline keys versus out-of-line keys</h3>
        <p>
          If the store was created with a <code translate="no">keyPath</code>, the key lives
          inside the record and you call <code translate="no">put(value)</code>. If it was
          created without one, the key is stored separately and you must call{" "}
          <code translate="no">put(value, key)</code>. Getting this backwards throws{" "}
          <code translate="no">DataError</code>. You can check which you are dealing with:
        </p>
        <CodeBlock
          lang="js"
          code={`const tx = db.transaction("STORE_NAME", "readonly");
const store = tx.objectStore("STORE_NAME");

console.log({
  keyPath: store.keyPath,        // null means out-of-line
  autoIncrement: store.autoIncrement,
  indexes: [...store.indexNames],
});`}
        />
      </ContentSection>

      <ContentSection title="Option 2: save it as a DevTools Snippet">
        <p>
          If you are editing storage more than once, retyping that block is
          waste. DevTools Snippets are saved scripts that run in the inspected
          page&rsquo;s context, and they persist across sessions.
        </p>
        <p>
          Open DevTools, go to <strong>Sources</strong>, then the{" "}
          <strong>Snippets</strong> pane, and create a new snippet. Paste
          something parameterised:
        </p>
        <CodeBlock
          lang="js"
          code={`// Snippet: patch an IndexedDB record.
// Set these four, then Ctrl/Cmd+Enter to run.
const DB = "myapp";
const STORE = "orders";
const KEY = "ord_1042";
const PATCH = { status: "delivered", updatedAt: new Date() };

const open = indexedDB.open(DB);
open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const get = store.get(KEY);

  get.onsuccess = () => {
    if (!get.result) return console.warn("missing:", KEY);
    const next = { ...get.result, ...PATCH };
    store.keyPath === null ? store.put(next, KEY) : store.put(next);
    console.log("patched", KEY, next);
  };

  tx.onerror = () => console.error(tx.error);
  tx.oncomplete = () => db.close();
};`}
        />
        <p>
          Run it with <code translate="no">Cmd+Enter</code> on macOS or{" "}
          <code translate="no">Ctrl+Enter</code> elsewhere. Note that the Application panel
          does not live-update, so refresh the object store view afterwards or
          you will be looking at a stale render of data you just changed.
        </p>
        <p>
          This is the best you can do with built-in tooling, and for many people
          it is genuinely enough. Where it runs out is bulk work: applying the
          same change to every record matching a condition means writing a
          cursor loop, and doing it safely means writing the dry-run version
          first.
        </p>
      </ContentSection>

      <ContentSection title="Option 3: make the grid editable">
        <p>
          The reason a database client feels different from a viewer is that
          editing is a normal interaction rather than a scripting task. This is
          the gap IdxBeaver was built to close: it adds a DevTools panel where
          the object store renders as a grid you can type into.
        </p>
        <ProductFigure
          asset="dark"
          alt="IdxBeaver's editable IndexedDB grid in Chrome DevTools with a row inspector open beside the data"
          caption="Click a cell, type, press enter. Each commit gets its own undo entry."
        />
        <p>
          Concretely, for the editing case:
        </p>
        <ul>
          <li>
            Click a cell, type, press enter. The write is committed through the
            same <code translate="no">put()</code> path, with the inline versus out-of-line key
            distinction handled for you.
          </li>
          <li>
            Every commit lands on an undo stack, so a mistyped value is{" "}
            <code translate="no">Cmd+Z</code> rather than a restore-from-backup problem.
          </li>
          <li>
            Filter first, then edit or delete the matching set, instead of
            hand-writing a cursor loop for a bulk change.
          </li>
          <li>
            Values that are not plain JSON survive the trip.{" "}
            <code translate="no">Date</code>, <code translate="no">BigInt</code>, <code translate="no">Map</code>,{" "}
            <code translate="no">Set</code>, <code translate="no">ArrayBuffer</code>, <code translate="no">Blob</code> and
            circular references round-trip through a versioned wire format
            rather than being flattened by <code translate="no">JSON.stringify</code>.
          </li>
        </ul>
        <p>
          It is free, MIT-licensed, and makes no network requests. If you want
          the detailed feature-by-feature version, there is a{" "}
          <a href="/vs/chrome-devtools-application-panel/">
            comparison against the built-in Application panel
          </a>{" "}
          and one covering the{" "}
          <a href="/vs/indexeddb-viewer-extensions/">
            other IndexedDB extensions
          </a>
          , including where each of them is the better pick.
        </p>
      </ContentSection>

      <ContentSection title="Editing many records at once">
        <p>
          For completeness, here is the Console version of a conditional bulk
          update, since this is the point where people usually go looking for a
          tool. Run the dry pass first and read the output before you let it
          write anything.
        </p>
        <CodeBlock
          lang="js"
          code={`// Bulk patch every record matching a predicate.
// DRY_RUN = true logs what would change and writes nothing.
const DB = "myapp";
const STORE = "orders";
const DRY_RUN = true;

const matches = (r) => r.status === "pending" && r.total > 20000;
const patch = (r) => ({ ...r, status: "review" });

const open = indexedDB.open(DB);
open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction(STORE, DRY_RUN ? "readonly" : "readwrite");
  const store = tx.objectStore(STORE);
  const seen = [];

  store.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (!cursor) return;

    if (matches(cursor.value)) {
      const next = patch(cursor.value);
      seen.push({ key: cursor.key, before: cursor.value, after: next });
      if (!DRY_RUN) cursor.update(next);
    }
    cursor.continue();
  };

  tx.oncomplete = () => {
    console.log(DRY_RUN ? "would change" : "changed", seen.length);
    console.table(seen.map((s) => ({ key: s.key, status: s.after.status })));
    db.close();
  };
  tx.onerror = () => console.error(tx.error);
};`}
        />
        <p>
          <code translate="no">cursor.update()</code> is the right call inside a cursor walk,
          not <code translate="no">store.put()</code>. It reuses the cursor&rsquo;s current
          key, which keeps the inline versus out-of-line question from coming up
          at all.
        </p>
      </ContentSection>

      <ContentSection title="A word on doing this to other people's sites">
        <p>
          Everything here works on any origin you can open DevTools against,
          which includes sites you did not build. Editing your own
          application&rsquo;s data while debugging is ordinary work. Editing a
          third party&rsquo;s stored state to change what their app does is a
          different thing, and client-side storage is not a security boundary
          you should be relying on either, if you are on the other side of this
          question. Server-side validation is the boundary.
        </p>
      </ContentSection>

      <ContentSection title="Related reading">
        <ul>
          <li>
            <a href="/blog/debugging-indexeddb-in-chrome-devtools/">
              Debugging IndexedDB in Chrome DevTools
            </a>{" "}
            covers the inspection workflow around this.
          </li>
          <li>
            <a href="/blog/querying-indexeddb-with-mongo-style-filters/">
              Querying IndexedDB with MongoDB-style filters
            </a>{" "}
            goes into finding the rows you want to change.
          </li>
          <li>
            <a href="/blog/exporting-indexeddb-data/">
              Exporting IndexedDB data
            </a>{" "}
            is the safety net: take a snapshot before a bulk edit.
          </li>
        </ul>
      </ContentSection>
    </BlogPostShell>
  );
}
