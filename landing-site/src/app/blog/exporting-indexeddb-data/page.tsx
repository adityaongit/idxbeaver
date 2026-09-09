import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ContentSection } from "@/components/content-shell";
import { ProductFigure } from "@/components/product-figure";
import { getPostBySlug, postLastModified } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

const SLUG = "exporting-indexeddb-data";
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
      <ContentSection title="Why exporting IndexedDB is harder than it looks">
        <p>
          Getting rows out of an object store is a ten-line cursor loop. The
          hard part is that IndexedDB does not store JSON. It stores
          structured-clone values, and that type set is strictly larger than
          what JSON can express.
        </p>
        <p>
          A record can legitimately contain a <code translate="no">Date</code>, a{" "}
          <code translate="no">BigInt</code>, a <code translate="no">RegExp</code>, a <code translate="no">Map</code>, a{" "}
          <code translate="no">Set</code>, an <code translate="no">ArrayBuffer</code>, a typed array, a{" "}
          <code translate="no">Blob</code>, a <code translate="no">File</code>, or a reference cycle. Push
          that through <code translate="no">JSON.stringify</code> and you get silent damage
          rather than an error:
        </p>
        <CodeBlock
          lang="js"
          code={`const record = {
  id: 1n,                          // BigInt
  createdAt: new Date(),           // Date
  tags: new Set(["a", "b"]),       // Set
  index: new Map([["k", "v"]]),    // Map
  pattern: /^ord_/i,               // RegExp
  bytes: new Uint8Array([1, 2, 3]) // typed array
};

JSON.stringify(record);
// TypeError: Do not know how to serialize a BigInt

delete record.id;
JSON.stringify(record);
// {"createdAt":"2026-09-09T00:00:00.000Z",   <- now a string
//  "tags":{},                                 <- data gone
//  "index":{},                                <- data gone
//  "pattern":{},                              <- data gone
//  "bytes":{"0":1,"1":2,"2":3}}               <- now a plain object`}
        />
        <p>
          Four of those six fields lost their data and the export still
          &ldquo;succeeded&rdquo;. This is why an export you never test by
          re-importing is not a backup.
        </p>
      </ContentSection>

      <ContentSection title="Reading every record out of a store">
        <p>
          The straightforward version. Run this in the Console on the page that
          owns the database:
        </p>
        <CodeBlock
          lang="js"
          code={`function readAll(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const rows = [];

      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        rows.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      };

      tx.oncomplete = () => {
        db.close();
        resolve(rows);
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

const rows = await readAll("myapp", "orders");
console.log(rows.length, rows[0]);`}
        />
        <p>
          <code translate="no">getAll()</code> is shorter, but a cursor is the right default
          for anything large: it streams rather than materialising every record
          into one array, and it gives you the key alongside the value, which
          you need if the store uses out-of-line keys.
        </p>
        <p>
          Also collect the store&rsquo;s shape while you are in there. Without
          it, an import has to guess whether keys are inline:
        </p>
        <CodeBlock
          lang="js"
          code={`function describeStore(db, storeName) {
  const store = db.transaction(storeName, "readonly").objectStore(storeName);
  return {
    name: store.name,
    keyPath: store.keyPath,            // null = out-of-line keys
    autoIncrement: store.autoIncrement,
    indexes: [...store.indexNames].map((n) => {
      const ix = store.index(n);
      return { name: ix.name, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry };
    }),
  };
}`}
        />
      </ContentSection>

      <ContentSection title="Surviving the type problem">
        <p>
          There are two workable strategies, and which one you want depends on
          whether the export needs to be read by a human or by a machine.
        </p>

        <h3>Strategy 1: tag the types on the way out</h3>
        <p>
          Replace each non-JSON value with a tagged envelope, then reverse it on
          import. This keeps the file valid JSON and readable:
        </p>
        <CodeBlock
          lang="js"
          code={`function encode(value) {
  if (typeof value === "bigint") return { $t: "bigint", v: value.toString() };
  if (value instanceof Date) return { $t: "date", v: value.toISOString() };
  if (value instanceof RegExp) return { $t: "regexp", v: value.source, f: value.flags };
  if (value instanceof Map) return { $t: "map", v: [...value].map(([k, x]) => [encode(k), encode(x)]) };
  if (value instanceof Set) return { $t: "set", v: [...value].map(encode) };
  if (ArrayBuffer.isView(value)) {
    return { $t: "typed", k: value.constructor.name, v: Array.from(value) };
  }
  if (value instanceof ArrayBuffer) {
    return { $t: "buffer", v: Array.from(new Uint8Array(value)) };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, encode(x)]));
  }
  return value;
}

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (!value || typeof value !== "object") return value;

  switch (value.$t) {
    case "bigint": return BigInt(value.v);
    case "date":   return new Date(value.v);
    case "regexp": return new RegExp(value.v, value.f);
    case "map":    return new Map(value.v.map(([k, x]) => [decode(k), decode(x)]));
    case "set":    return new Set(value.v.map(decode));
    case "typed":  return new globalThis[value.k](value.v);
    case "buffer": return new Uint8Array(value.v).buffer;
    default:
      return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, decode(x)]));
  }
}`}
        />
        <p>
          Two caveats. This does not handle reference cycles, which need an
          identity map and path references. And a real <code translate="no">Blob</code> or{" "}
          <code translate="no">File</code> holds bytes you have to read asynchronously, so
          either base64 them or write them as separate files in an archive.
        </p>
        <p>
          Version the envelope from day one. Add a{" "}
          <code translate="no">{'{ "wire": 1 }'}</code> field to the file header. The first
          time you change the encoding you will be glad the reader can tell
          which format it is looking at.
        </p>

        <h3>Strategy 2: don&rsquo;t serialise at all</h3>
        <p>
          For a same-browser copy, structured clone handles every one of these
          types natively, cycles included, with no encoding step:
        </p>
        <CodeBlock
          lang="js"
          code={`// Deep clone with full structured-clone type support.
const copy = structuredClone(rows);

// Or hand it straight to another store, which clones on write anyway.
target.put(rows[0].value);`}
        />
        <p>
          The limitation is that it produces a live object, not a file. It is
          the right tool for duplicating a database or moving data between
          stores, and the wrong one for anything you need to email to a
          colleague.
        </p>
      </ContentSection>

      <ContentSection title="Picking a format">
        <p>
          Once the types are handled, the format question is really about who
          reads the file next.
        </p>
        <ul>
          <li>
            <strong>JSON</strong> — one array, easy to eyeball, fine up to a few
            tens of megabytes. Above that, parsers want the whole thing in
            memory at once.
          </li>
          <li>
            <strong>NDJSON</strong> — one record per line. Streams, appends,
            greps, and survives a truncated write with only the last line lost.
            The right default for large exports.
          </li>
          <li>
            <strong>CSV</strong> — for handing data to someone who will open it
            in a spreadsheet. Lossy by nature: nested objects have to be
            flattened or stringified, and every value arrives back as text.
          </li>
          <li>
            <strong>SQL <code translate="no">INSERT</code></strong> — when the destination is a
            seed script or a real database. Verbose, but it replays.
          </li>
          <li>
            <strong>ZIP archive</strong> — when you need multiple stores, a
            manifest describing key paths and indexes, and somewhere to put
            binary blobs as actual files.
          </li>
        </ul>
        <p>
          Saving a file from the Console is a small dance, since you cannot
          write to disk directly:
        </p>
        <CodeBlock
          lang="js"
          code={`function download(filename, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// NDJSON, one record per line
download(
  "orders.ndjson",
  rows.map((r) => JSON.stringify({ key: r.key, value: encode(r.value) })).join("\\n"),
  "application/x-ndjson",
);`}
        />
      </ContentSection>

      <ContentSection title="Importing without corrupting the target">
        <p>
          An import is the export in reverse plus the two decisions people
          usually skip: what happens to records that already exist, and what
          happens if the write fails halfway.
        </p>
        <CodeBlock
          lang="js"
          code={`function importRows(dbName, storeName, rows, { mode = "merge" } = {}) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      // One transaction for the whole batch: if any write throws, the
      // transaction aborts and the store is left exactly as it was.
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      if (mode === "replace") store.clear();

      for (const row of rows) {
        const value = decode(row.value);
        store.keyPath === null ? store.put(value, row.key) : store.put(value);
      }

      tx.oncomplete = () => { db.close(); resolve(rows.length); };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("aborted"));
    };
  });
}`}
        />
        <p>
          Keeping every write in one transaction is the important detail.
          IndexedDB will roll the whole thing back on an abort, which turns a
          partially-applied import from a data-recovery problem into a retry.
        </p>
        <p>
          Use <code translate="no">put()</code> to overwrite by key and <code translate="no">add()</code> if
          you want a collision to throw instead. And test the round trip on a
          throwaway database before you trust it: export, import into a fresh
          store, then compare a few records field by field, paying attention to
          anything that was a <code translate="no">Date</code> or a <code translate="no">Map</code>.
        </p>
      </ContentSection>

      <ContentSection title="Doing it without writing any of this">
        <p>
          All of the above is a solved problem, and if you are exporting
          storage regularly it is not a great use of an afternoon. IdxBeaver
          does it from the panel: pick a store or a filtered slice of one,
          export to JSON, NDJSON, CSV, SQL <code translate="no">INSERT</code>, or a ZIP
          snapshot of the whole database, and import any of them back.
        </p>
        <ProductFigure
          asset="query"
          alt="A filtered query in IdxBeaver whose matching rows can be exported directly to JSON, NDJSON, CSV, SQL or ZIP"
          caption="Filter to the rows you actually want, then export just those."
        />
        <p>
          The type handling described above is the part that matters:{" "}
          <code translate="no">BigInt</code>, <code translate="no">Date</code>, <code translate="no">RegExp</code>,{" "}
          <code translate="no">Map</code>, <code translate="no">Set</code>, <code translate="no">ArrayBuffer</code>,{" "}
          <code translate="no">Blob</code> and circular references go through a versioned wire
          format, so the file you export re-imports as the values you started
          with rather than their JSON shadows. It also infers the store&rsquo;s
          schema and can hand you a TypeScript interface or a Dexie schema for
          it.
        </p>
      </ContentSection>

      <ContentSection title="Related reading">
        <ul>
          <li>
            <a href="/blog/how-to-edit-indexeddb-values-in-chrome/">
              How to edit IndexedDB values in Chrome
            </a>{" "}
            — take an export first, then bulk-edit.
          </li>
          <li>
            <a href="/blog/browser-storage-quotas-explained/">
              Browser storage quotas explained
            </a>{" "}
            — how much you can store before eviction becomes your problem.
          </li>
          <li>
            <a href="/blog/browser-storage-types-explained/">
              Browser storage types explained
            </a>{" "}
            — which API should have held this data in the first place.
          </li>
        </ul>
      </ContentSection>
    </BlogPostShell>
  );
}
