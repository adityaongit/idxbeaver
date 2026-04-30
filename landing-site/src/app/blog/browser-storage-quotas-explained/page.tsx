import type { Metadata } from "next";

import { BlogPostShell } from "@/components/blog-post";
import { CodeBlock } from "@/components/code-block";
import { ContentSection } from "@/components/content-shell";
import { getPostBySlug } from "@/lib/blog";

const SLUG = "browser-storage-quotas-explained";
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

export default async function Page() {
  return (
    <BlogPostShell post={post}>
      <ContentSection title="The short answer">
        <p>
          On a modern Chromium browser with default settings, an origin can
          generally store somewhere between <strong>a few hundred megabytes
          and tens of gigabytes</strong> of data, depending on free disk space.
          That budget is shared across IndexedDB, Cache Storage, File System
          Access (OPFS), and a few smaller buckets. LocalStorage and Cookies
          are governed by separate, much smaller per-origin caps. SessionStorage
          is its own thing.
        </p>
        <p>
          The browsers don&rsquo;t publish a single hard number on purpose —
          quotas are a function of available disk and the
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria"
            target="_blank"
            rel="noopener"
          >
            {" "}
            quota algorithm
          </a>
          {" "}— but the bands below are what you can actually plan around.
        </p>
      </ContentSection>

      <ContentSection title="Per-storage quota table (Chromium)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--color-hair)] text-[12px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
                <th className="px-2 py-3 align-top">Storage</th>
                <th className="px-2 py-3 align-top">Per-origin cap</th>
                <th className="px-2 py-3 align-top">Persistence</th>
                <th className="px-2 py-3 align-top">Eviction</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">IndexedDB</td>
                <td className="px-2 py-3">Shared with Cache + OPFS, up to ~60% of free disk</td>
                <td className="px-2 py-3">Best-effort by default; persistent with permission</td>
                <td className="px-2 py-3">LRU when global quota under pressure</td>
              </tr>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">Cache Storage</td>
                <td className="px-2 py-3">Shared bucket with IndexedDB</td>
                <td className="px-2 py-3">Best-effort</td>
                <td className="px-2 py-3">LRU eviction</td>
              </tr>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">LocalStorage</td>
                <td className="px-2 py-3">~5 MB (string keys + values)</td>
                <td className="px-2 py-3">Until origin data is cleared</td>
                <td className="px-2 py-3">Throws <code>QuotaExceededError</code> when full</td>
              </tr>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">SessionStorage</td>
                <td className="px-2 py-3">~5 MB per tab</td>
                <td className="px-2 py-3">Tab lifetime</td>
                <td className="px-2 py-3">Cleared on tab close</td>
              </tr>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">Cookies</td>
                <td className="px-2 py-3">~180 cookies/origin, each up to 4 KB</td>
                <td className="px-2 py-3">By <code>Expires</code> / <code>Max-Age</code></td>
                <td className="px-2 py-3">By expiry or browser cleanup</td>
              </tr>
              <tr className="border-b border-[var(--color-hair)] align-top">
                <td className="px-2 py-3 font-medium text-[var(--color-ink)]">OPFS</td>
                <td className="px-2 py-3">Same shared bucket as IndexedDB</td>
                <td className="px-2 py-3">Best-effort</td>
                <td className="px-2 py-3">LRU</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The exact numbers vary across Chrome major versions and operating
          systems — Firefox and Safari publish different ones again. Treat the
          table as planning data, not contract.
        </p>
      </ContentSection>

      <ContentSection title="How to actually measure it">
        <p>
          Modern browsers expose the runtime numbers through the{" "}
          <code>navigator.storage.estimate()</code> API:
        </p>
        <CodeBlock
          lang="js"
          code={`const { quota, usage, usageDetails } = await navigator.storage.estimate();
console.log({
  quotaMB: Math.round(quota / 1_000_000),
  usageMB: Math.round(usage / 1_000_000),
  details: usageDetails, // { indexedDB, caches, serviceWorkerRegistrations, ... }
});`}
        />
        <p>
          Run that on the inspected page from DevTools. <code>usageDetails</code>
          is the most actionable field — it splits the consumption between
          IndexedDB, Cache Storage, and a few smaller buckets so you can see
          where a leak is actually accumulating.
        </p>
      </ContentSection>

      <ContentSection title="Persistent vs best-effort storage">
        <p>
          Best-effort storage can be evicted without warning if the
          browser&rsquo;s global storage budget gets tight (low disk,
          aggressive history cleanup, etc.). Persistent storage cannot be
          evicted automatically — only the user can clear it. To request it:
        </p>
        <CodeBlock
          lang="js"
          code={`const isPersisted = await navigator.storage.persisted();
if (!isPersisted) {
  const granted = await navigator.storage.persist();
  // \`granted\` is true if the browser decides your origin is "important
  // enough" — heuristics include: installed PWA, frequent visits,
  // bookmarked, granted notifications.
}`}
        />
        <p>
          Local-first apps and offline-capable PWAs should ask for persistence
          early. The browser will say no most of the time on first visit; ask
          again after the user has demonstrated intent (logged in, saved
          something, installed the app).
        </p>
      </ContentSection>

      <ContentSection title="The five gotchas that bite local-first apps">
        <h3>1. LocalStorage is synchronous</h3>
        <p>
          Every <code>localStorage.setItem</code> call blocks the main thread.
          Apps that fan out lots of small writes (config, preferences, recent
          items) feel snappy until the value crosses ~100 KB; then frame
          drops appear. If you find yourself writing JSON-stringified objects
          to LocalStorage, you almost certainly want IndexedDB instead.
        </p>

        <h3>2. The 5 MB LocalStorage cap is on the {`<key, value>`} string total</h3>
        <p>
          That includes UTF-16 encoding overhead, so the real ceiling for ASCII
          payloads is closer to 2.5 MB worth of source content. Hit it once
          and every subsequent write throws.
        </p>

        <h3>3. Cookies count toward request size</h3>
        <p>
          Origins that pile cookies on can blow past server-side header limits.
          Most CDNs cap inbound headers at 8&ndash;32 KB. A handful of bloated
          cookies will produce 431 / 494 errors that look like networking bugs
          but are actually storage bugs.
        </p>

        <h3>4. Cache Storage isn&rsquo;t free</h3>
        <p>
          Service workers that cache aggressively (precache + runtime) can
          chew through the shared IndexedDB quota. If a user reports their
          IndexedDB writes failing intermittently, look at Cache Storage size
          first.
        </p>

        <h3>5. Eviction is silent</h3>
        <p>
          Best-effort eviction doesn&rsquo;t fire an event. Your code finds
          out when a read returns no row. Defensive design: treat any read
          path as &ldquo;maybe the data is gone,&rdquo; not &ldquo;the data
          must be there.&rdquo;
        </p>
      </ContentSection>

      <ContentSection title="Inspecting all of it at once">
        <p>
          The numbers from <code>navigator.storage.estimate()</code> are
          aggregate. To break them down by store and quickly spot
          out-of-control growth, you want a tool that surfaces per-store sizes
          and lets you query each surface in one place.
        </p>
        <p>
          That&rsquo;s the <a href="/">IdxBeaver</a> overview view: total
          storage, per-database row counts, top stores by row count,
          LocalStorage size in bytes, and Cache Storage entry counts —
          alongside the same Mongo-style query interface that lets you find
          the row that&rsquo;s probably leaking.
        </p>
      </ContentSection>
    </BlogPostShell>
  );
}
