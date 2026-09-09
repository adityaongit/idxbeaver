# Structured data audit — idxbeaver.portlabs.in

Checked (JSON-LD extracted via `render_page.py --json-ld-output`, all raw/SSR, `is_spa: false`):
`/`, `/vs/chrome-devtools-application-panel/`, `/blog/`, `/blog/debugging-indexeddb-in-chrome-devtools/`, `/blog/browser-storage-quotas-explained/`, `/blog/querying-indexeddb-with-mongo-style-filters/`, `/faq/`, `/about/`, `/privacy/`.

Not checked: `/changelog/`, `/docs/` (404 per CONTEXT, no markup to audit).

No microdata or RDFa found on any page — JSON-LD only, all blocks `valid: true` per extractor.

## Detection summary

| URL | Blocks | Types |
|---|---|---|
| `/` | 1 | SoftwareApplication (+ nested Offer, AggregateRating, Person) |
| `/vs/chrome-devtools-application-panel/` | 3 | SoftwareApplication, Article, BreadcrumbList |
| `/blog/` | 2 | SoftwareApplication, BreadcrumbList |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | 3 | SoftwareApplication, BlogPosting, BreadcrumbList |
| `/blog/browser-storage-quotas-explained/` | 3 | SoftwareApplication, BlogPosting, BreadcrumbList |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | 3 | SoftwareApplication, BlogPosting, BreadcrumbList |
| `/faq/` | 3 | SoftwareApplication, BreadcrumbList, FAQPage (14 Q&As) |
| `/about/` | 2 | Person, BreadcrumbList |
| `/privacy/` | 2 | SoftwareApplication, BreadcrumbList |

The `SoftwareApplication` block is byte-identical (1411 bytes) on every page — injected once in `src/app/layout.tsx` and repeated site-wide rather than being a single referenced node.

## Validation results

### 1. SoftwareApplication (site-wide, `layout.tsx:88-125`) — CRITICAL

Source (unchanged across all 9 pages):
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5",
  "bestRating": "5",
  "worstRating": "1",
  "ratingCount": 7
}
```
Code comment at `layout.tsx:106-108` says "Sourced from the public Chrome Web Store listing."

**Fail.** Google's structured-data guidelines require review/rating markup to reflect content actually visible to the user on the page carrying the markup — not data pulled from a third-party listing (CWS) and injected invisibly. Confirmed via `extracted_text` of `/`: no testimonial, review, star widget, or rating text anywhere in the rendered body copy (checked full extracted text, only product description + demo JSON + feature copy). Same absence holds on every other page (blog, faq, about, privacy — none render reviews).

This is a self-served/fabricated rating relative to the page it's marked up on, independent of whether "5.0 / 7 reviews" is factually true on the CWS listing itself. Google can and does apply manual actions for exactly this pattern (rating not shown on page).

Everything else in the block validates: `applicationCategory: DeveloperApplication` is a supported Google value, `operatingSystem`, `offers.price: "0"` (correct for free), `isAccessibleForFree`, `downloadUrl`/`installUrl` absolute, `license` absolute URL, `sameAs` present. No `@id`.

**Dependency**: fixing this blocks/unblocks the graph-consistency recommendation below (both touch the same block).
**Falsifiable**: re-run `claude-seo run render_page.py <url> --json-ld-output` after the fix and grep for `aggregateRating`/`review` — should be absent, or present only if a real, visible reviews section exists.
**Leading indicator**: Search Console → Rich Results report → "Software App" — watch for a manual/rich-result-ineligible flag; today it should already show 0 valid rich results if Google has crawled and rejected it, or a warning next crawl.

### 2. Article / BlogPosting (4 blocks: `/vs/...`, 3 blog posts) — HIGH

None of the 4 blocks include `image`. Example (`debugging-indexeddb-in-chrome-devtools`):
```json
{
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "mainEntityOfPage": "https://idxbeaver.portlabs.in/blog/debugging-indexeddb-in-chrome-devtools",
  "datePublished": "2026-04-29",
  "dateModified": "2026-04-29",
  "author": {"@type": "Person", "name": "Aditya Jindal", "url": "https://github.com/adityaongit"},
  "publisher": {"@type": "Organization", "name": "IdxBeaver"}
}
```
**Fail on required property.** Google's Article/BlogPosting rich-result eligibility requires `image`. Confirmed no per-post `opengraph-image` route exists in the repo (`find src/app -path "*blog*"` shows only `page.tsx` files, no `opengraph-image.tsx`); only the site root (`src/app/opengraph-image.tsx`) generates one. So there's currently no dedicated per-article image to point at even in code, let alone in the markup.

Also fails/weak on:
- `publisher` is a bare stub — `{"@type": "Organization", "name": "IdxBeaver"}` with no `url`, `logo`, or `@id`. Google recommends `publisher.logo` for the Article publisher icon.
- `dateModified` == `datePublished` (`2026-04-29`) on all 4, and identical across all 4 posts (same publish day) — not a hard violation, but there's no visible mechanism in the repo enforcing that `dateModified` actually changes on edit (both fields are hardcoded per-post, not derived from git/CMS metadata). Flag as a monitoring gap, not a failure today.
- Author `url` is inconsistent: the 3 `BlogPosting` blocks include `author.url`, but the `Article` block on `/vs/chrome-devtools-application-panel/` does not (`{"@type": "Person", "name": "Aditya Jindal"}` only).
- No `@id` on any of the 4, so nothing links back to a canonical `Person`/`Organization`/`WebPage` node.

**Dependency**: needs the Organization fix (finding 4) and an image asset (new work) before the corrected JSON-LD below is fully accurate — the `image` URL in the fix uses the existing root OG image as a stopgap.
**Falsifiable**: Rich Results Test on any of the 4 URLs — should report 0 required-property errors after fix.
**Leading indicator**: GSC Rich Results report count for "Article" going from 0 valid to >0.

### 3. Missing WebSite entity + no `@id` graph linking — HIGH

No `WebSite` type exists anywhere on the site (`grep -rln '"WebSite"'` in the repo returns nothing). No site search exists either (`grep` for search input/`SearchAction`/`role="search"` in `src/` returns nothing) — so `SearchAction` genuinely does not apply here; this is not a gap, just confirms `WebSite` should ship without a `potentialAction`.

Separately: every entity across the site (`SoftwareApplication`, `Article`/`BlogPosting`, `Person`, `Organization` stub, `BreadcrumbList`) is a disconnected literal object — none carry `@id`, and `publisher`/`author` are inlined by value rather than referenced. Google doesn't require `@id` graphs, but without them there's no way to tell Google "the Person on `/about/` is the same Person who wrote 3 blog posts and authored the extension" — each mention is a fresh, unlinked entity.

**Falsifiable**: after fix, all `Person`/`Organization`/`WebSite` mentions should resolve to the same 2-3 `@id` values sitewide (verifiable by diffing the `author`/`publisher` fields across all JSON-LD files).
**Leading indicator**: none directly measurable via Google tooling (this is a hygiene fix, not a rich-result trigger) — track via the drift baseline once established, confirming the `@id` set stays stable across deploys.

### 4. Organization publisher stub — MEDIUM

`{"@type": "Organization", "name": "IdxBeaver"}` appears identically in all 4 Article/BlogPosting blocks. No `url`, `logo`, `sameAs`, `@id`. `logo` is Google's stated recommendation for the Article publisher (used as the small icon in rich results). Repo has `src/app/icon.png` and `src/app/opengraph-image.tsx` available to source a logo URL from — currently unused for this purpose.

**Dependency**: blocks part of finding 2's fix (Article publisher should reference this Organization by `@id`).
**Falsifiable**: Rich Results Test warning for "publisher logo" should disappear.
**Leading indicator**: none Google-side; track by grep for `"logo"` under the Organization block in the persisted findings baseline.

### 5. BreadcrumbList item URLs vs actual canonical URLs — MEDIUM

Breadcrumb `item` URLs have no trailing slash (e.g. `"https://idxbeaver.portlabs.in/blog"`), but per CONTEXT.md the site's live URLs use trailing slashes (`/blog/` is 200; `/privacy` 308-redirects to `/privacy/`), and the sitemap presumably lists trailing-slash URLs. Root cause: `alternates: { canonical: "/blog" }` etc. in each page's metadata (checked `blog/page.tsx:15`, `vs/.../page.tsx:17`, `about/page.tsx:17`, `privacy/page.tsx:9`, and all 3 blog post pages) is also missing the trailing slash, and `src/lib/breadcrumbs.ts` presumably builds breadcrumb items from the same non-trailing-slash paths.

This means both the `<link rel="canonical">` tag and the `BreadcrumbList` JSON-LD point at a URL that 308-redirects rather than the final URL — inconsistent with the site's own routing behavior.

**Falsifiable**: `curl -I https://idxbeaver.portlabs.in/blog` should return 200 not 308 once fixed, and breadcrumb `item` values should match sitemap.xml URLs exactly (byte-for-byte).
**Leading indicator**: GSC Page Indexing report — watch for "Duplicate without user-selected canonical" or crawl-budget waste from redirect hops on these URLs.

### 6. FAQPage on `/faq/` — INFO (per audit rule, no removal recommended)

14 Q&As, all product FAQ (e.g. "What is IdxBeaver?", "Which browsers does it support?") — genuine product FAQ, not user-submitted Q&A, so `QAPage` does not apply here; `FAQPage` is the structurally correct type regardless of rich-result status. Google retired FAQ rich results for all sites 2026-05-07, so this markup currently has no Google SERP benefit; any AI/LLM-citation benefit is unconfirmed. No action required — leave as is.

### 7. `/about/` Person block — PASS (minor)

`Person` has `name`, `url`, `sameAs` (self-referential inclusion of own `url` inside `sameAs` is redundant but harmless), `knowsAbout`, `mainEntityOfPage`. No `@id` (see finding 3) — otherwise clean.

### 8. `/privacy/` — PASS, no opportunity

Only sitewide `SoftwareApplication` + `BreadcrumbList`. No high-value schema opportunity for a privacy policy page; not flagged.

## Missing high-value opportunities for this dev-tool SaaS (beyond fixes above)

- **Organization** as a standalone linked entity (finding 4) — currently only exists as an inline stub.
- **WebSite** entity (finding 3) — no `SearchAction`, since no site search exists; confirmed no search UI in `src/`.
- Real, on-page reviews (finding 1) — if genuine reviews are ever surfaced on the page (e.g., an embedded/quoted CWS review section), `aggregateRating`/`Review` becomes legitimate to reinstate. Until then it should not be marked up.

## Deprecated/banned schema check

- No `HowTo` found anywhere — clean, matches the ban.
- No `SpecialAnnouncement`, `CourseInfo`, `EstimatedSalary`, `LearningVideo` found — clean.

---

## Score: 30 / 100

Start 100, deduct:

| Deduction | Points | Why |
|---|---|---|
| Fabricated/self-served `aggregateRating` on every page (finding 1) | −25 | Critical: not visible on-page anywhere, sitewide, risk of manual action |
| Missing `image` on all 4 Article/BlogPosting blocks (finding 2) | −15 | High: blocks rich-result eligibility entirely (required property) |
| No `WebSite` entity + zero `@id` graph linking sitewide (finding 3) | −10 | High: no entity consolidation across the whole site |
| Organization publisher stub, no logo/url/sameAs (finding 4) | −8 | Medium: recommended property missing, blocks publisher icon |
| BreadcrumbList/canonical trailing-slash mismatch vs live routing (finding 5) | −7 | Medium: markup points at a redirecting URL, not the final one |
| Author `url` inconsistency across Article vs BlogPosting blocks (finding 2) | −3 | Low: cosmetic graph inconsistency |
| `dateModified` never diverges from `datePublished`, no enforcement mechanism (finding 2) | −2 | Low: monitoring gap, not a current failure |
| FAQPage present (finding 6) | 0 | Info only per audit rule, not a deduction |

100 − 25 − 15 − 10 − 8 − 7 − 3 − 2 = **30**

## Corrected JSON-LD (ready to paste)

### A. SoftwareApplication (replace `layout.tsx:88-125`, drop `aggregateRating` until real on-page reviews exist)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://idxbeaver.portlabs.in/#software",
  "name": "IdxBeaver",
  "alternateName": "IdxBeaver — IndexedDB Viewer & Editor",
  "applicationCategory": "DeveloperApplication",
  "applicationSubCategory": "Browser Extension",
  "operatingSystem": "Chromium 120+",
  "browserRequirements": "Requires a Chromium-based browser, version 120 or newer",
  "description": "Free IndexedDB viewer and editor for Chrome DevTools. Browse, query, edit, and export IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage from a database-style data grid.",
  "url": "https://idxbeaver.portlabs.in",
  "downloadUrl": "https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb",
  "installUrl": "https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb",
  "softwareVersion": "1.3.1",
  "softwareHelp": "https://idxbeaver.portlabs.in/faq/",
  "license": "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@id": "https://idxbeaver.portlabs.in/about/#person" },
  "publisher": { "@id": "https://idxbeaver.portlabs.in/#organization" },
  "sameAs": [
    "https://github.com/adityaongit/idxbeaver",
    "https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb"
  ]
}
```
*Only reinstate `aggregateRating`/`review` once a real reviews section is visible on the page it's marked up on.*

### B. Organization (new, add once to `layout.tsx` or a shared `_document`-equivalent)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://idxbeaver.portlabs.in/#organization",
  "name": "IdxBeaver",
  "url": "https://idxbeaver.portlabs.in",
  "logo": "https://idxbeaver.portlabs.in/icon.png",
  "sameAs": [
    "https://github.com/adityaongit/idxbeaver",
    "https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb"
  ]
}
```

### C. WebSite (new, add once, no SearchAction — no site search exists)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://idxbeaver.portlabs.in/#website",
  "url": "https://idxbeaver.portlabs.in",
  "name": "IdxBeaver",
  "publisher": { "@id": "https://idxbeaver.portlabs.in/#organization" }
}
```

### D. Person (`/about/page.tsx`, add `@id`)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://idxbeaver.portlabs.in/about/#person",
  "name": "Aditya Jindal",
  "url": "https://aditya.portlabs.in",
  "sameAs": [
    "https://aditya.portlabs.in",
    "https://github.com/adityaongit",
    "https://github.com/adityaongit/idxbeaver"
  ],
  "knowsAbout": [
    "IndexedDB",
    "Chrome DevTools extensions",
    "Browser storage",
    "Local-first software",
    "Frontend tooling"
  ],
  "mainEntityOfPage": "https://idxbeaver.portlabs.in/about"
}
```

### E. BlogPosting template (apply to all 3 blog posts, example shown for `debugging-indexeddb-in-chrome-devtools`)
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://idxbeaver.portlabs.in/blog/debugging-indexeddb-in-chrome-devtools#article",
  "headline": "Debugging IndexedDB in Chrome DevTools — the practical guide",
  "description": "How to inspect, query, and edit IndexedDB from Chrome DevTools — the workflow built into the Application panel, the bits that miss the mark, and what to do about it.",
  "image": "https://idxbeaver.portlabs.in/opengraph-image",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://idxbeaver.portlabs.in/blog/debugging-indexeddb-in-chrome-devtools"
  },
  "datePublished": "2026-04-29",
  "dateModified": "2026-04-29",
  "author": { "@id": "https://idxbeaver.portlabs.in/about/#person" },
  "publisher": { "@id": "https://idxbeaver.portlabs.in/#organization" }
}
```
*`image` uses the existing site-wide OG image as a stopgap — add per-post `opengraph-image.tsx` routes (Next.js convention, same pattern as `src/app/opengraph-image.tsx`) for a real per-article image, then point `image` at that.*

### F. Article template (`/vs/chrome-devtools-application-panel/`, same fixes)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://idxbeaver.portlabs.in/vs/chrome-devtools-application-panel#article",
  "headline": "IdxBeaver vs Chrome DevTools Application panel",
  "description": "An honest comparison of IdxBeaver and Chrome's built-in Application panel for IndexedDB, LocalStorage, Cookies, and Cache Storage — features, queries, schema, exports, performance.",
  "image": "https://idxbeaver.portlabs.in/opengraph-image",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://idxbeaver.portlabs.in/vs/chrome-devtools-application-panel"
  },
  "author": { "@id": "https://idxbeaver.portlabs.in/about/#person" },
  "publisher": { "@id": "https://idxbeaver.portlabs.in/#organization" },
  "datePublished": "2026-04-29",
  "dateModified": "2026-04-29"
}
```

### G. BreadcrumbList item URLs — fix trailing slash to match live routing (example, `/blog/`)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://idxbeaver.portlabs.in/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://idxbeaver.portlabs.in/blog/" }
  ]
}
```
Apply the same trailing-slash correction to every `BreadcrumbList` and to each page's `alternates.canonical` in metadata (source of the mismatch, e.g. `blog/page.tsx:15`).
