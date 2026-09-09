import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ComparisonTable } from "@/components/comparison-table";
import { ContentSection } from "@/components/content-shell";
import { ProductFigure } from "@/components/product-figure";
import { getPostBySlug, postLastModified } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

const SLUG = "browser-storage-types-explained";
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
      <ContentSection title="Five APIs, five different jobs">
        <p>
          The browser gives you five places to put data, and they are not
          interchangeable. Picking the wrong one is how you end up with a 4KB
          cookie sent on every request, a synchronous write blocking your
          render, or user data silently evicted the next time the disk gets
          tight.
        </p>
        <p>Very briefly:</p>
        <ul>
          <li>
            <strong>IndexedDB</strong> — the real database. Async, indexed,
            large, holds structured values.
          </li>
          <li>
            <strong>LocalStorage</strong> — a small synchronous string map that
            survives restarts.
          </li>
          <li>
            <strong>SessionStorage</strong> — the same thing, scoped to one tab
            and gone when it closes.
          </li>
          <li>
            <strong>Cookies</strong> — tiny values the browser attaches to HTTP
            requests. The only one the server sees automatically.
          </li>
          <li>
            <strong>Cache Storage</strong> — whole HTTP responses, keyed by
            request. The offline story.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Side by side">
        <ComparisonTable
          capabilityLabel="Property"
          products={["IndexedDB", "LocalStorage", "SessionStorage", "Cookies", "Cache Storage"]}
          rows={[
            [
              "What it holds",
              "Structured-clone values: objects, Date, Map, Set, Blob, ArrayBuffer",
              "Strings only",
              "Strings only",
              "Strings only",
              "Request and Response pairs",
            ],
            [
              "API shape",
              "Asynchronous, transactional",
              "Synchronous, blocking",
              "Synchronous, blocking",
              "Synchronous string parsing",
              "Asynchronous, promise-based",
            ],
            [
              "Practical size",
              "Large; a share of available disk",
              "About 5MB per origin",
              "About 5MB per origin",
              "About 4KB per cookie",
              "Large; shares the same origin budget",
            ],
            [
              "Lifetime",
              "Until deleted or evicted",
              "Until deleted or evicted",
              "Until the tab closes",
              "Until its expiry",
              "Until deleted or evicted",
            ],
            [
              "Sent to the server",
              "no",
              "no",
              "no",
              "Yes, on every matching request",
              "no",
            ],
            [
              "Available in workers",
              "Yes",
              "no",
              "no",
              "Not directly",
              "Yes",
            ],
            [
              "Indexed lookup",
              "Yes, on any key path",
              "no",
              "no",
              "no",
              "By request URL",
            ],
          ]}
        />
      </ContentSection>

      <ContentSection title="IndexedDB: the one that scales">
        <p>
          IndexedDB is the only browser storage that behaves like a database.
          It is asynchronous, transactional, stores structured values without
          serialising to a string, and lets you define indexes so lookups do
          not degrade to a full scan.
        </p>
        <p>
          It is also the most awkward API of the five, because it predates
          promises and is built on request objects with event handlers:
        </p>
        <CodeBlock
          lang="js"
          code={`const open = indexedDB.open("myapp", 1);

open.onupgradeneeded = () => {
  const db = open.result;
  const store = db.createObjectStore("orders", { keyPath: "id" });
  store.createIndex("by_status", "status");
  store.createIndex("by_created", "createdAt");
};

open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction("orders", "readwrite");
  tx.objectStore("orders").put({
    id: "ord_1",
    status: "pending",
    total: 24999,
    createdAt: new Date(),   // stays a Date, no stringifying
  });
  tx.oncomplete = () => db.close();
};`}
        />
        <p>
          Reach for it when you have more than a few hundred records, when the
          data has shape worth querying, when you need it in a Service Worker,
          or when it must hold binary data. Most people use a wrapper such as
          Dexie or <code translate="no">idb</code> rather than the raw API, and that is a
          sensible default.
        </p>
        <p>
          The catch: everything is async, so it cannot answer a question during
          a synchronous render. And it is subject to eviction, which is covered
          in{" "}
          <a href="/blog/browser-storage-quotas-explained/">
            the quotas post
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection title="LocalStorage: small, synchronous, tempting">
        <p>
          LocalStorage is a string-to-string map that persists across restarts.
          Its appeal is that it is three lines and needs no setup:
        </p>
        <CodeBlock
          lang="js"
          code={`localStorage.setItem("theme", "dark");
localStorage.getItem("theme");        // "dark"

// Objects have to be stringified, with the usual losses
localStorage.setItem("user", JSON.stringify({ id: 1, seenAt: new Date() }));
JSON.parse(localStorage.getItem("user")).seenAt; // a string now, not a Date`}
        />
        <p>
          Its problem is the word synchronous. Every read and write happens on
          the main thread and blocks it. A few small keys is nothing. Parsing a
          megabyte of JSON out of LocalStorage on startup is a measurable stall
          in your load time, and it is a common cause of slow first renders.
        </p>
        <p>
          Use it for genuinely small, genuinely synchronous needs: a theme
          preference, a sidebar collapsed state, a feature flag you must read
          before first paint. Once you are stringifying arrays of objects into
          it, you wanted IndexedDB.
        </p>
        <p>
          Also note it is unavailable in Web Workers and Service Workers, so
          anything shared with a worker cannot live here.
        </p>
      </ContentSection>

      <ContentSection title="SessionStorage: same API, shorter memory">
        <p>
          SessionStorage has LocalStorage&rsquo;s exact API and one difference
          that matters: its scope is a single tab. Open your site in two tabs
          and they get two independent stores. Close the tab and the data is
          gone. A page reload keeps it; a new tab does not inherit it.
        </p>
        <p>
          That makes it the right home for state that should not leak between
          tabs or outlive the visit: a multi-step form&rsquo;s progress, a
          scroll position to restore, a redirect target you are round-tripping
          through an auth flow. Using LocalStorage for those is how two tabs end
          up fighting over one checkout.
        </p>
      </ContentSection>

      <ContentSection title="Cookies: the only ones the server sees">
        <p>
          Cookies are the oldest mechanism and the only one that leaves the
          browser on its own. Every matching request carries them, which is
          exactly why they are the right tool for session identity and the wrong
          tool for everything else.
        </p>
        <CodeBlock
          lang="js"
          code={`// Readable from JS only when HttpOnly is not set
document.cookie = "locale=en-GB; path=/; max-age=31536000; SameSite=Lax";

// Anything security-relevant should be set by the server instead:
// Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict`}
        />
        <p>
          The size limit is roughly 4KB per cookie, and that budget is spent on
          every single request to the origin, including images and API calls.
          Storing a JSON blob in a cookie means paying for it on all of them.
        </p>
        <p>
          A session token belongs in an <code translate="no">HttpOnly</code> cookie, set by the
          server, so JavaScript cannot read it. If your JS is reading an auth
          token out of <code translate="no">document.cookie</code> or LocalStorage, any script
          that gets injected into the page can read it too.
        </p>
      </ContentSection>

      <ContentSection title="Cache Storage: responses, not values">
        <p>
          Cache Storage is different in kind from the other four. It does not
          hold values, it holds HTTP <code translate="no">Request</code> and{" "}
          <code translate="no">Response</code> pairs. It exists so a Service Worker can answer
          a network request from disk:
        </p>
        <CodeBlock
          lang="js"
          code={`const cache = await caches.open("assets-v3");
await cache.addAll(["/", "/app.css", "/app.js"]);

// In a Service Worker fetch handler: serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((hit) => hit ?? fetch(event.request)),
  );
});`}
        />
        <p>
          Use it for the app shell, static assets and offline fallbacks. Do not
          use it as a general key-value store by inventing fake request URLs;
          that is IndexedDB&rsquo;s job, and you lose indexing and querying by
          doing it.
        </p>
        <p>
          The version-in-the-name convention above is load-bearing. Stale caches
          are a classic source of &ldquo;it works after a hard refresh&rdquo;
          bugs, and the fix is deleting old cache names during the Service
          Worker&rsquo;s activate step.
        </p>
      </ContentSection>

      <ContentSection title="A decision shortcut">
        <ul>
          <li>
            Does the server need it on every request? <strong>Cookie</strong>,
            set <code translate="no">HttpOnly</code> if it is sensitive.
          </li>
          <li>
            Is it one small value you must read synchronously before paint?{" "}
            <strong>LocalStorage</strong>.
          </li>
          <li>
            Same, but it must not outlive the tab?{" "}
            <strong>SessionStorage</strong>.
          </li>
          <li>
            Is it an HTTP response you want to serve offline?{" "}
            <strong>Cache Storage</strong>.
          </li>
          <li>
            Anything else, and certainly anything you will query or that has
            more than trivial size: <strong>IndexedDB</strong>.
          </li>
        </ul>
        <p>
          None of the five is a security boundary. All of it is readable and
          writable by the user and by any script running on the page, so
          validate on the server and store nothing there you would not want the
          user to see or change. That is also true of{" "}
          <a href="/blog/how-to-edit-indexeddb-values-in-chrome/">
            how easily IndexedDB values can be edited
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection title="Inspecting all five">
        <p>
          Chrome&rsquo;s Application panel lists all five surfaces, which makes
          it the natural first stop. Its limitation is that each one is a
          separate read-only tree, so a bug that spans a cookie, a flag in
          LocalStorage and a record in IndexedDB means three views and no way to
          change anything in place.
        </p>
        <ProductFigure
          asset="dark"
          alt="IdxBeaver showing browser storage surfaces in one Chrome DevTools panel with an editable data grid"
          caption="IndexedDB, LocalStorage, SessionStorage, Cookies and Cache Storage in one editable panel."
        />
        <p>
          IdxBeaver puts all five in one panel and makes each editable, with
          queries and exports over IndexedDB specifically. There is a{" "}
          <a href="/vs/chrome-devtools-application-panel/">
            comparison with the built-in panel
          </a>{" "}
          if you want the specifics, and one against{" "}
          <a href="/vs/indexeddb-viewer-extensions/">
            the other IndexedDB extensions
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection title="Related reading">
        <ul>
          <li>
            <a href="/blog/browser-storage-quotas-explained/">
              Browser storage quotas explained
            </a>{" "}
            — the limits and eviction rules behind the size column above.
          </li>
          <li>
            <a href="/blog/debugging-indexeddb-in-chrome-devtools/">
              Debugging IndexedDB in Chrome DevTools
            </a>{" "}
            — the inspection workflow in detail.
          </li>
          <li>
            <a href="/blog/exporting-indexeddb-data/">
              Exporting IndexedDB data
            </a>{" "}
            — getting data out without losing types.
          </li>
        </ul>
      </ContentSection>
    </BlogPostShell>
  );
}
