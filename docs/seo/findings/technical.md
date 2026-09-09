# Technical SEO Audit — idxbeaver.portlabs.in

Date: 2026-09-09. Lab-only (no CrUX/GSC/PSI credentials). Source cross-referenced against `/Users/adityajindal/personal/idxbeaver/landing-site`.

## Score: 65 / 100

Deductions:
- High: missing security headers (CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options) site-wide — **-8**
- High: `/privacy/` inherits homepage's OG/Twitter metadata wholesale, including a wrong `og:url` — **-6**
- High: Twitter Card title/description/image wrong (homepage's, not page's) on `/blog/`, `/faq/`, `/about/` — **-6**
- Medium: 5+ internal links point at non-trailing-slash URLs, forcing avoidable 308 hops — **-5**
- Medium: render-blocking external Google Fonts stylesheet loaded on every page for one small badge component — **-4**
- Medium: 2 titles / 1 meta description exceed safe SERP length and will truncate — **-3**
- Medium: hardcoded `aggregateRating` in site-wide schema is a manual-sync liability, unverifiable this pass — **-3**
- Info (no deduction): `/changelog/` and `/docs/` 404s are not linked anywhere in the live site (only exist as fake demo-data strings in the extension's own seed script) — no crawl-budget or UX impact
- Info (no deduction): CONTEXT.md claimed `/privacy/` is missing from `sitemap.xml` — verified live, this is **stale**; the page is present in the current sitemap
- Info (no deduction): no hreflang anywhere — correct, site is single-market/single-language, absence is not a defect
- Info (no deduction): `FAQPage` schema present on `/faq/` — flagged per policy only, no removal recommended

100 − 8 − 6 − 6 − 5 − 4 − 3 − 3 = **65**

Not covered this pass (flag explicitly, do not treat as pass or fail): IndexNow submission/ping was not tested (no credentials, time-boxed); Core Web Vitals are inferred from source only (lab, not field — no CrUX); mobile tap-target sizing was assessed from viewport meta + Tailwind responsive classes only, not a rendered device viewport.

---

## 1. Crawlability

**PASS.** `robots.txt` (`https://idxbeaver.portlabs.in/robots.txt`): `Allow: /` for all UAs, declares `Sitemap: https://idxbeaver.portlabs.in/sitemap.xml` and a `Host` directive. `sitemap_discovery.py --json` validated the declared sitemap: `"kind": "urlset", "valid": true"`. No crawl traps found (no query-param-driven pagination, no session IDs in URLs). No `noindex` directive found in any of the 9 fetched pages (`grep -l noindex raw/*.html` → empty).

**Discrepancy vs CONTEXT.md:** context claimed sitemap has 8 URLs and `/privacy/` is missing. Live fetch of `sitemap.xml` on 2026-09-09 shows **9** `<url>` entries and `/privacy/` **is** present:
```xml
<url><loc>https://idxbeaver.portlabs.in/privacy/</loc><lastmod>2026-09-07T06:56:49.083Z</lastmod>...</url>
```
Treat as resolved/stale context, not a live issue.

## 2. Indexability

**PASS.** All 9 pages: no `<meta name="robots">` tag (default indexable), each has a self-referencing `<link rel="canonical">` matching its own trailing-slash URL exactly (verified for all 9 — e.g. `/faq/` → `<link rel="canonical" href="https://idxbeaver.portlabs.in/faq/"/>`). No duplicate titles or descriptions across the 9 pages (checked programmatically, zero collisions). No thin-content pages observed — blog posts and comparison page carry substantial body text (raw HTML 64–94 KB per page, real prose not JS-only shells).

Trailing-slash policy is declared explicitly in source (`next.config.ts` sets `trailingSlash: true`; `sitemap.ts` comment: "non-slashed form of every route 308-redirects... Sitemaps must list the final, non-redirecting URL"). Sitemap complies. Internal links do not (see Redirects, below) — that's the actual defect, not the canonical/redirect policy itself.

## 3. Security

**PARTIAL PASS.**
- HTTPS: enforced. `http://idxbeaver.portlabs.in/` → `308` → `https://idxbeaver.portlabs.in/`.
- HSTS: present and strong on every response checked: `strict-transport-security: max-age=63072000` (2 years). No `includeSubDomains`/`preload` directive, but not required.
- No mixed content: `grep -oE 'http://[^"'"'"' ]+'` across all 9 raw HTML files, excluding `schema.org`/`w3.org` namespace URIs, returned zero matches.
- **Missing entirely** on every response checked (`/`, `/privacy`, `/changelog/`, `/blog/`): `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`. Full header dump for `/`:
```
accept-ranges, access-control-allow-origin: *, age, cache-control, content-disposition,
content-type, date, etag, last-modified, server: Vercel, strict-transport-security,
x-matched-path, x-vercel-cache, x-vercel-id
```
No CSP/XCTO/Referrer-Policy/XFO in that list on any of the 4 sampled routes.

## 4. URL Structure & Redirects

**PARTIAL PASS.** URLs are clean, lowercase, hyphenated, no query-string cruft. `/privacy` → `/privacy/` is a single-hop `308` (not a chain): `location: /privacy/`, final status 200, `REDIRECTS:1`. No multi-hop chains found on any of the 12 URLs tested.

**Defect:** the site's own internal links point at the *redirecting* form instead of the canonical trailing-slash form, forcing avoidable 308 round-trips on real user/crawler navigation:
- `src/components/site-footer.tsx`: `{ label: "Privacy", href: "/privacy" }`
- `src/app/faq/page.tsx:229`: `<a href="/privacy">privacy policy</a>`
- `src/app/faq/page.tsx:182`: `<a href="/vs/chrome-devtools-application-panel">comparison page</a>`
- `src/components/blog-post.tsx:53`: `href="/blog"`
- `src/components/site-nav.tsx:142`: `href="/about"` (mobile drawer)
- `src/app/blog/debugging-indexeddb-in-chrome-devtools/page.tsx:174`: `href="/blog/querying-indexeddb-with-mongo-style-filters"`

## 5. Mobile

**PASS.** `<meta name="viewport" content="width=device-width, initial-scale=1"/>` present and correctly formed (no `user-scalable=no`, no fixed `maximum-scale`) on all 9 pages verified. Layout uses Tailwind responsive breakpoints (`sm:`, `lg:`) throughout nav/footer/content components — not assessed on an actual rendered viewport this pass, source inspection only.

## 6. Core Web Vitals (source-inspection, lab-only — no CrUX)

- **CLS risk: low.** All 8 `<img>` tags on the homepage declare explicit `width`/`height`. Fonts: Next.js self-hosted `Geist`/`Geist_Mono` via `next/font` with `display: "swap"` and `<link rel="preload" as="font">` for both weights — correct pattern, minimal font-swap shift.
- **LCP risk: one verified issue.** An external, render-blocking Google Fonts stylesheet (`https://fonts.googleapis.com/css2?family=Google+Sans...`) is loaded via `<link rel="stylesheet">` in `<head>` on every page, in addition to the already self-hosted `next/font` fonts. Source shows this font is used for exactly one thing: `src/components/cws-install-button.tsx:4`, `const FONT_STACK = '"Google Sans", "Helvetica Neue", Arial, sans-serif';` — a small Chrome Web Store install badge. This adds an extra DNS+TLS+two-hop-CSS round trip (fonts.googleapis.com → fonts.gstatic.com) to every page load for one label's typeface.
- **INP:** cannot be assessed from static source; no interaction traces available this pass.

## 7. Structured Data

Present site-wide (`src/app/layout.tsx`), JSON-LD `SoftwareApplication` on every page (all 9), including `Offer` (price 0), `AggregateRating`, `Person` (author). Page-specific additions: `BreadcrumbList` on all inner pages, `Article`/`BlogPosting` on the comparison page and 3 blog posts, `FAQPage` + `Question`/`Answer` on `/faq/`, `Organization` on articles.

- **Info only, per policy:** `FAQPage` schema is present on `/faq/`. Google retired FAQ rich results for all sites 2026-05-07 — flagged for awareness, no removal recommended, no new-page recommendation made.
- **Medium:** `aggregateRating` (`ratingValue: "5"`, `ratingCount: 7`) is hardcoded in `layout.tsx:109-115` with an inline comment: *"Sourced from the public Chrome Web Store listing. Keep in sync with the live rating — stale values here are a structured-data violation, not just a cosmetic drift."* The code itself flags its own drift risk; this pass could not fetch the live CWS rating to verify freshness (JS-rendered storefront, no API credentials).

## 8. JavaScript Rendering

**PASS — SSR/SSG, not client-only.** Raw `curl` fetch (no JS execution) of all 9 pages returns full content in the initial HTML payload, not an empty SPA shell: byte sizes range 38 KB (`/blog/`) to 94 KB (`/vs/...`), and grepped text content (headings, paragraphs, FAQ answers) is present in the raw response. This is a Next.js app-router site rendering server-side; content parity between raw and rendered HTML is not a risk here.

## 9. IndexNow Protocol

**Not verified this pass.** No IndexNow key file or submission test was run (time-boxed, no credentials for `indexnow_submit.py`). Flag as an open item for a follow-up pass rather than a pass/fail.

## Hreflang / i18n

**PASS (N/A).** No `hreflang` tags found on any page (`grep -c hreflang` → 0 on all 9). Correct for a single-language, single-market site — not a defect. Full hreflang validation deferred to the `seo-hreflang` sub-skill if/when the site adds locales.

---

## Per-URL on-page fundamentals

| URL | Title (len) | Meta desc (len) | Canonical | H1 count | OG | Twitter |
|---|---|---|---|---|---|---|
| `/` | "IndexedDB Viewer & Editor for Chrome DevTools — IdxBeaver" (57) | 186 chars | self, correct | 1 | correct | correct |
| `/vs/chrome-devtools-application-panel/` | "IdxBeaver vs Chrome DevTools Application panel — IdxBeaver" (58) | 180 chars | self, correct | 1 | correct | correct |
| `/blog/` | "Blog — IdxBeaver" (16) | 101 chars | self, correct | 1 | correct | **wrong — shows homepage's title/desc/image** |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | 72 chars — **exceeds ~60 char SERP-safe length** | 165 chars | self, correct | 1 | correct | correct |
| `/blog/browser-storage-quotas-explained/` | 89 chars — **exceeds SERP-safe length** | 218 chars — **exceeds ~155-160 char SERP-safe length** | self, correct | 1 | correct | correct |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | "Querying IndexedDB with MongoDB-style filters — IdxBeaver" (57) | 198 chars — near limit | self, correct | 1 | correct | correct |
| `/faq/` | "IndexedDB viewer FAQ — IdxBeaver" (32) | 172 chars | self, correct | 1 | correct | **wrong — shows homepage's title/desc/image** |
| `/about/` | "About — IdxBeaver" (17) | 105 chars | self, correct | 1 | correct | **wrong — shows homepage's title/desc/image** |
| `/privacy/` | "Privacy Policy — IdxBeaver" (26) | 126 chars | self, correct | 1 | **wrong — og:url points at `/`, all OG fields are homepage's** | **wrong — homepage's** |

Root cause (verified in source): `src/app/layout.tsx:42-59` sets site-wide default `openGraph`/`twitter` objects using the homepage's `TITLE`/`DESCRIPTION`. Next.js Metadata merges these per top-level key — a page that declares its own `openGraph` but omits `twitter` still inherits the *entire* parent `twitter` object unchanged, not a merged/patched version. `src/app/blog/page.tsx`, `src/app/faq/page.tsx`, `src/app/about/page.tsx` each override `openGraph` but never `twitter`. `src/app/privacy/page.tsx` overrides neither — it has no `openGraph`/`twitter` key at all, so it inherits both wholesale from the root layout, including `og:url: "/"`. By contrast, `src/app/vs/chrome-devtools-application-panel/page.tsx` and all 3 blog-post pages under `src/app/blog/*/page.tsx` do declare their own `twitter` key (confirmed via `grep -n twitter`) and render correctly.

No H1 duplication or hierarchy issues found: every page has exactly 1 `<h1>`, and it is the page's actual title/lede, not a repeated brand string.

---

## Findings (severity-tagged)

1. **[High]** Missing security headers site-wide (CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options) — clickjacking/MIME-sniffing/referrer-leak exposure on every response, incl. `/`, `/privacy`, `/blog/`, `/changelog/` (404 page too).
2. **[High]** `/privacy/` inherits the homepage's entire OG object, including a wrong `og:url` (`/` instead of `/privacy/`) and homepage title/description/image in both `og:*` and `twitter:*` tags.
3. **[High]** Twitter Card metadata wrong (shows homepage's title/description/image) on `/blog/`, `/faq/`, `/about/` — these pages override `openGraph` per-page but never override `twitter`, so Next.js Metadata keeps the root layout's `twitter` object unmerged.
4. **[Medium]** 6 internal links across `site-footer.tsx`, `site-nav.tsx`, `faq/page.tsx` (x2), `blog-post.tsx`, and a blog-post cross-link point at the non-trailing-slash form of a URL, forcing an avoidable 308 hop on every click/crawl of that link.
5. **[Medium]** A render-blocking external Google Fonts stylesheet (`fonts.googleapis.com/css2?family=Google+Sans...`) loads on every page solely for one small install-badge component (`cws-install-button.tsx`), adding an extra cross-origin round trip on top of the already self-hosted `next/font` fonts.
6. **[Medium]** 2 page titles (72, 89 chars) and 1 meta description (218 chars) exceed safe SERP display length and will truncate in search results.
7. **[Medium]** Hardcoded `aggregateRating` (5.0, 7 ratings) in site-wide `SoftwareApplication` JSON-LD is a manual-sync liability — the code's own comment calls stale values here "a structured-data violation." Could not verify current CWS listing rating this pass (JS-rendered storefront blocked plain fetch).
8. **[Info]** `/changelog/` and `/docs/` return 404 but are not linked from anywhere in the live site — the only occurrences of those path strings are fake demo-data routes in `src/lib/demo-seed.ts` (used to seed the extension's own IndexedDB demo, not real site navigation). No crawl-budget or UX action needed.
9. **[Info]** CONTEXT.md's claim that `/privacy/` is missing from `sitemap.xml` is stale — verified live on 2026-09-09, `/privacy/` is present with correct `lastmod`/`changefreq`/`priority`.
10. **[Info]** `FAQPage` JSON-LD present on `/faq/`, flagged per standing policy only (Google retired FAQ rich results 2026-05-07 for all sites) — no removal or expansion recommended.
11. **[Not covered]** IndexNow submission untested this pass — no credentials, time-boxed. Recommend as a follow-up.
