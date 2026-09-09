# Sitemap audit: idxbeaver.portlabs.in

Fetched live 2026-09-09: https://idxbeaver.portlabs.in/sitemap.xml (9 `<url>` entries, 1706 bytes) and https://idxbeaver.portlabs.in/robots.txt.
Generator: `/Users/adityajindal/personal/idxbeaver/landing-site/src/app/sitemap.ts` (Next.js `MetadataRoute.Sitemap`, `dynamic = "force-static"`).

## Validation summary

| Check | Result |
|---|---|
| XML well-formed | Pass — `xmllint --noout` clean |
| URL/size limits | Pass — 9 URLs, 1706 bytes (limit 50,000 URLs / 50MB) |
| robots.txt sitemap declaration | Pass — `Sitemap: https://idxbeaver.portlabs.in/sitemap.xml` matches actual location |
| Coverage (crawl vs sitemap) | Pass — all 9 live pages present, no orphans, no dead entries |
| `/privacy/` omission | **Not reproducible today** — see finding 1 |
| lastmod accuracy | Fail on non-blog pages — see finding 2 |
| changefreq / priority | Present but ignored by Google — see finding 3 |
| canonical / trailing-slash | Consistent in rendered output; fragile in source — see finding 4 |

## Findings

### 1. `/privacy/` sitemap omission — already fixed, not present in current build
- Severity: Info
- Evidence: `CONTEXT.md` records `/privacy/ <-- live but MISSING from sitemap.xml` as a known issue. Live fetch today (`curl https://idxbeaver.portlabs.in/sitemap.xml`) returns 9 `<url>` entries including `<loc>https://idxbeaver.portlabs.in/privacy/</loc>`. Source confirms: `src/app/sitemap.ts:35` — `{ url: url(base, "/privacy"), lastModified, changeFrequency: "yearly", priority: 0.3 }`.
- Recommendation: No action. Treat the CONTEXT.md note as stale (already resolved in a prior commit). Falsifiability: re-fetch `/sitemap.xml` and grep for `/privacy/`; if it disappears again, the regression is in `sitemap.ts:35` (entry removed) or `src/app/privacy/page.tsx` (page removed/noindexed). Leading indicator: GSC Coverage report should show `/privacy/` as "Indexed" once GSC access exists (no GSC in this audit tier).

### 2. lastmod on 6 of 9 URLs is build noise, not a real content-change signal
- Severity: Low
- Evidence: `/`, `/vs/chrome-devtools-application-panel/`, `/blog/`, `/faq/`, `/about/`, `/privacy/` all share the exact same `lastmod`: `2026-09-07T06:56:49.083Z` (byte-identical timestamp across 6 unrelated pages, pulled from the live XML). Root cause is `src/app/sitemap.ts:16` — `const lastModified = new Date()` — evaluated once per build and reused for every static page regardless of whether that page's content changed.
  Git history contradicts the sitemap's implied "everything changed 2026-09-07" signal:
  - `src/app/page.tsx` last touched 2026-04-29T23:18:11+05:30
  - `src/app/vs/chrome-devtools-application-panel/page.tsx` last touched 2026-04-30T10:59:07+05:30
  - `src/app/blog/page.tsx` last touched 2026-04-29T23:19:37+05:30
  - `src/app/faq/page.tsx` last touched 2026-09-06T20:47:38+05:30
  - `src/app/about/page.tsx` last touched 2026-09-07T12:26:17+05:30
  - `src/app/privacy/page.tsx` last touched 2026-04-30T10:58:56+05:30
  By contrast the 3 blog posts already do this correctly: `src/app/sitemap.ts:19` uses `new Date(post.publishedOn)`, a real per-post date from `BLOG_POSTS` (`src/lib/blog.ts`), not the build clock.
- Recommendation: Replace the shared `lastModified` in `sitemap.ts:16,24-35` with a per-route constant (a `MODIFIED_ON` date literal set when the page's actual content last changed, same pattern as blog posts) or derive it from `git log -1 --format=%cI -- <file>` at build time. Dependency: none, this is a standalone one-line-per-route change. Falsifiability: re-fetch `/sitemap.xml` after a build where only one page changed — if all `lastmod` values move together, the fix didn't take. Leading indicator: variance (stddev) across `lastmod` values in the sitemap should be nonzero after the fix.

### 3. changefreq / priority present — both ignored by Google
- Severity: Info
- Evidence: every `<url>` in the live sitemap carries `<changefreq>` and `<priority>` (e.g. `<changefreq>weekly</changefreq><priority>1</priority>` on `/`). Source: `src/app/sitemap.ts:24-35`. Google has stated for years it ignores both fields entirely for crawl prioritization.
- Recommendation: Optional cleanup — drop `changeFrequency`/`priority` from the 9 object literals in `sitemap.ts:24-35`. Zero SEO effect either way; only benefit is a smaller generator and no false impression that these fields tune crawl behavior. Not blocking. Falsifiability: n/a, this is a no-op change for rankings. Leading indicator: none needed.

### 4. Canonical tags correct in output; source relies on implicit trailing-slash normalization
- Severity: Low
- Evidence: sitemap URLs all carry a trailing slash (`url()` helper, `sitemap.ts:10-12`: `path === "/" ? \`${base}/\` : \`${base}${path}/\``). Rendered `<link rel="canonical">` on live pages matches exactly:
  - `/` → `<link rel="canonical" href="https://idxbeaver.portlabs.in/"/>`
  - `/about/` → `<link rel="canonical" href="https://idxbeaver.portlabs.in/about/"/>`
  - `/privacy/` → `<link rel="canonical" href="https://idxbeaver.portlabs.in/privacy/"/>`
  But every page's own metadata source omits the trailing slash: `src/app/about/page.tsx:17`, `src/app/privacy/page.tsx:9`, `src/app/faq/page.tsx:14`, `src/app/blog/page.tsx:15`, `src/app/vs/chrome-devtools-application-panel/page.tsx:17` all write `alternates: { canonical: "/about" }` etc. (no slash). This only resolves correctly today because `next.config.ts:7` sets `trailingSlash: true`, which Next.js applies when resolving `alternates.canonical` against `metadataBase` (`src/app/layout.tsx:42`). If `trailingSlash` is ever flipped or Next.js changes that normalization behavior, every canonical tag silently diverges from the sitemap.
- Recommendation: Either (a) make each page's `alternates.canonical` include the trailing slash explicitly to match `sitemap.ts`'s own `url()` helper, removing the implicit dependency on `next.config.ts:7`, or (b) leave as-is and accept the coupling, since it works today and `trailingSlash` is a deliberate site-wide setting unlikely to change. Recommend (a) only if `trailingSlash` config is ever touched; not urgent otherwise. Falsifiability: toggle `trailingSlash` off locally and diff rendered canonical vs sitemap `<loc>` — divergence proves the coupling is live. Leading indicator: none needed while `next.config.ts:7` is unchanged.

### 5. Non-issues confirmed by evidence (no action)
- `/changelog/` and `/docs/` return 404 but are never linked from the real site (`src/components/site-nav.tsx:64-70`, `src/components/site-footer.tsx:33-71`) or the sitemap — they only appear as fixture strings in `src/lib/demo-seed.ts:47-48`, which seeds the extension's own IndexedDB demo data, unrelated to site navigation. Not an orphan/dead-link problem.
- `/privacy` (no slash) 308-redirects to `/privacy/` — correctly, the sitemap only lists the slashed, non-redirecting form.
- No page in the live crawl is missing from the sitemap; no sitemap entry points to a 404 or redirect.

## Corrected sitemap URL set

Current live set is already the correct 9-URL set (no additions/removals needed). Only the `lastmod` values need to become real per-page dates instead of one shared build timestamp:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://idxbeaver.portlabs.in/</loc>
<lastmod>2026-04-29</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/vs/chrome-devtools-application-panel/</loc>
<lastmod>2026-04-30</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/blog/</loc>
<lastmod>2026-04-29</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/blog/debugging-indexeddb-in-chrome-devtools/</loc>
<lastmod>2026-04-29</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/blog/browser-storage-quotas-explained/</loc>
<lastmod>2026-04-29</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/blog/querying-indexeddb-with-mongo-style-filters/</loc>
<lastmod>2026-04-29</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/faq/</loc>
<lastmod>2026-09-06</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/about/</loc>
<lastmod>2026-09-07</lastmod>
</url>
<url>
<loc>https://idxbeaver.portlabs.in/privacy/</loc>
<lastmod>2026-04-30</lastmod>
</url>
</urlset>
```

(`changefreq`/`priority` dropped per finding 3 — optional, zero-risk cleanup. Dates above are illustrative, taken from each route file's last git commit; swap in whatever mechanism `sitemap.ts` ends up using — hardcoded `MODIFIED_ON` constants or a build-time `git log` lookup.)

## Location page quality gates
Not applicable — site has 0 programmatic/location pages (9 total URLs: home, 1 comparison page, blog index + 3 posts, faq, about, privacy). No gate triggered.
