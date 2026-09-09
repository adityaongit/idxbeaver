# Action plan: idxbeaver.portlabs.in

Ordered by payoff per unit of work, with dependencies noted. Each item carries a
falsifiable check (how you would know the fix failed) and a leading indicator you
can watch without re-running the audit.

## Phase 1: Critical, week 1

### 1. Remove or substantiate `aggregateRating`
`src/app/layout.tsx:109-115`

Delete the `aggregateRating` block. Alternatively, render the Chrome Web Store
rating on-page with a visible link to the store reviews, then keep the markup.

- Why: Google requires rating markup to reflect rating content visible on the page
  carrying it. No page renders any rating. This is the only finding in the audit
  that can trigger a manual action, and it is a two-line deletion.
- Blocks: nothing. Do it first because it is pure downside removal.
- Falsifiable: fetch any page, grep the JSON-LD for `aggregateRating`. If present,
  a visible rating with a source link must also be in the rendered body.
- Watch: Search Console manual actions report, once the property is verified.

### 2. Self-host Google Sans
`src/app/layout.tsx:77-81`, consumed by `src/components/cws-install-button.tsx:4`

Replace the preconnect, preload and blocking stylesheet with `next/font/google`,
matching the existing Geist pattern. Or drop the brand font for that button.

- Why: measured 907-1050ms render-blocking cost on every page, to style two labels
  in one component. It is the dominant contributor to homepage LCP of 4.38s,
  against a 2.5s "good" threshold. Body font is already self-hosted correctly.
- Blocks: nothing. Unblocks any meaningful LCP work, since everything else is
  noise next to a full second.
- Falsifiable: raw HTML must contain no `fonts.googleapis.com` stylesheet link;
  re-run Lighthouse and homepage LCP must drop below ~3.4s.
- Watch: lab LCP on the homepage after each deploy, then CrUX once GSC is verified.

## Phase 2: High impact, weeks 2-3

### 3. Fix the metadata merge bug in one pass
`src/app/privacy/page.tsx`, `blog/page.tsx`, `faq/page.tsx`, `about/page.tsx`, plus
`/vs/` and blog-post metadata

Add a `twitter` block mirroring each page's `openGraph` block, and add
`openGraph.images` (pointing at the root `opengraph-image` as a stopgap) to every
page that overrides `openGraph`. Give `/privacy/` its own `openGraph` and `twitter`
blocks with `url: "/privacy/"`.

- Why: Next.js merges Metadata per top-level key, not deeply. This one mistake
  produces three separately reported symptoms: no `og:image` on any inner page,
  `twitter:title` showing the homepage title on 3 pages, and `og:url` pointing at
  the homepage from `/privacy/`. `/vs/`, the high-intent comparison page, currently
  shares with no preview image at all.
- Blocks: item 5 below shares this root cause, do them together.
- Falsifiable: for each of the 9 URLs, rendered `og:url` must equal the canonical,
  `og:image` must be non-empty, and `twitter:title` must match that page's title.
- Watch: paste each URL into a link-preview debugger after deploy.

### 4. Add security headers
`next.config.ts` `headers()`

Add `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `X-Frame-Options` (or CSP `frame-ancestors`). Only HSTS exists
today, on every route including the 404.

- Why: absent hardening on a site that asks developers to trust it with a
  storage-reading extension. The trust story is the product's main asset.
- Blocks: nothing.
- Falsifiable: `curl -D-` against `/` and `/privacy/` must show all four headers.
- Watch: add the curl assertion as a CI gate so it cannot regress.

### 5. Add `image` to all Article and BlogPosting schema
`/vs/` page metadata and `blog-post.tsx`

Point at the root `opengraph-image` initially, then build per-post
`opengraph-image.tsx` routes.

- Why: `image` is required for Article rich-result eligibility, and all 4 blocks
  omit it. Same missing-per-post-image root cause as item 3.
- Depends on: nothing, but ship alongside item 3 since both touch image routes.
- Falsifiable: re-extract JSON-LD from the 4 content pages, every
  Article/BlogPosting must carry a resolvable `image`.
- Watch: Search Console rich-result report for Article eligibility, once verified.

### 6. Add contextual internal links to the two orphaned-by-content pages
`src/app/vs/chrome-devtools-application-panel/page.tsx`,
`src/app/blog/querying-indexeddb-with-mongo-style-filters/page.tsx`

Each page currently contains exactly one href, an external GitHub link. Add a body
link to the homepage and one to a topical sibling.

- Why: both are reachable through nav but carry no contextual internal links, so
  the cluster structure concentrates no authority. Two hrefs of work.
- Blocks: makes every later content investment compound rather than sit isolated.
- Falsifiable: grep each page for an internal href to `/`; both must match.
- Watch: internal-link count per page in any crawl.

### 7. Fix the trailing-slash hrefs and BreadcrumbList URLs
6 hrefs: `site-footer.tsx`, `site-nav.tsx:142`, `faq/page.tsx:182` and `:229`,
`blog-post.tsx:53`, `blog/debugging-indexeddb-in-chrome-devtools/page.tsx:174`.
Plus BreadcrumbList item URLs and each page's `alternates.canonical`.

- Why: every one forces a 308 that a crawler and a user both pay for, and the
  breadcrumb URLs point at redirecting targets. Canonical correctness currently
  depends implicitly on `next.config.ts` `trailingSlash: true`.
- Falsifiable: `grep -rn 'href="/[a-z-]*"' src` (excluding bare `/`) returns zero.
- Watch: redirect count for these paths trending to zero.

## Phase 3: Content and authority, month 2

### 8. Write the page for "edit indexeddb chrome devtools"

The highest-value content item in this audit, and it was invisible until the SERP
was actually checked. Every ranking result for that query says the same thing:
IndexedDB keys and values are not editable from the Application panel, use Snippets
or the Console. The SERP is entirely workarounds for the exact limitation this
product removes, and only one weak tool competes.

Write it as a direct answer to "how do I edit an IndexedDB value", showing the
native Console workaround honestly first, then the one-click alternative. Not as a
product comparison, `/vs/` already exists and is framed differently.

- Depends on: nothing, but link it from `/vs/` and the debugging post per item 6.
- Falsifiable: if it does not enter the top 20 for the query within ~8 weeks of
  indexation, the page type or the depth is wrong, not the query choice.
- Watch: impressions for that query in Search Console.

### 9. Re-angle the query post to lead with the native API
`/blog/querying-indexeddb-with-mongo-style-filters/`

Add a native cursor and `IDBKeyRange` primer as the first section; introduce the
Mongo-style layer after. The SERP for "query indexeddb" is MDN, W3C, web.dev and
javascript.info, all native-API reference. Leading with proprietary syntax is the
wrong entry angle for that intent.

- Falsifiable: if the post still fails to gain impressions for native-API queries
  after re-angling, the cluster assumption was wrong.
- Watch: query mix in Search Console for that URL.

### 10. Deepen the three blog posts

All are 641-777 words against a 1,500-word floor for the type, while being framed
as practical guides. Add worked examples, edge cases and troubleshooting. Close
coverage gaps, do not pad to hit a number. Add at least one screenshot or diagram
per post: all three currently contain zero images.

### 11. Ship the export post, then the storage-types post
`/blog/exporting-indexeddb-data-json-csv/`, then a single consolidated
storage-types post

SERP-confirmed as a separate cluster with zero site coverage, and it maps onto a
feature the product already has. The storage-types post is a judgement call, not
SERP-verified: ship it as one consolidated page, not five thin stubs. The Dexie
post is a stretch item, only if capacity remains.

### 12. Fix the `lastmod` and `dateModified` story together
`src/app/sitemap.ts:16`, lines 24-35

Replace the single `const lastModified = new Date()` with a per-route date, using
the same pattern the blog posts already use correctly. Derive `dateModified` in
schema from the same constant.

- Why: 6 of 9 URLs share one build timestamp, so `lastmod` carries no information.
  It also produces a visible contradiction: `/privacy/` tells readers "Last updated
  2026-04-27" while the sitemap claims the current build time.
- Falsifiable: change one page's content, rebuild, and only that page's `lastmod`
  should move.

### 13. Add an install CTA and a product screenshot to `/vs/`

At 390px the page shows the H1, intro and comparison table with no install button
and no product screenshot anywhere. It is the page most likely to catch high-intent
comparison traffic and the evaluator has to leave it to see what the tool looks
like. Embed the existing `dark`/`light` screenshots and a compact sticky CTA.

### 14. Add an Organization entity and a `WebSite` node with `@id` linking

Define `Organization` once with `url`, `logo` (`src/app/icon.png` is already there
and unused for this), and `sameAs` to GitHub and the Chrome Web Store. Reference it
by `@id` from every `publisher`. Add a `WebSite` entity with no `potentialAction`,
since there is no site search. This is both the schema fix and the brand-entity fix
the AI-readiness pass asked for.

### 15. Earn the first independent backlinks

Net independent inbound links today: zero. The Chrome Web Store and GitHub links
are nofollow, and the portfolio link is a same-owner self-link.

Sequence: awesome-list PRs and extension roundups first (~30 min each), then
genuine StackOverflow answers on IndexedDB and DevTools editing threads. That
second one is the best use of time, because it is simultaneously a link surface, an
acquisition channel, and the same audience as item 8. Save Reddit and Show HN for a
real version milestone. Skip paid directories and link exchanges.

## Phase 4: Monitoring, ongoing

### 16. Verify Search Console, then add a CrUX and PageSpeed key

The largest measurement gap in this audit. Without it there is no indexation
confirmation, no query data, and no field CWV, so every performance number here is
lab-only and cannot be checked against real users. Verifying the property converts
items 2, 5 and 8 from guesses into measurable outcomes.

### 17. Diff each deploy against the drift baselines

Baselines for `/`, `/vs/...panel/` and `/faq/` were captured on 2026-09-09. Run
`claude-seo run drift_compare.py <url>` after deploys to catch title, meta, canonical
and schema regressions, particularly on the metadata blocks touched in item 3.

### 18. Smaller items worth batching into any future pass

- Shorten 2 titles over 60 chars and 1 meta description at 218 chars.
- Add responsive `sizes`/`srcset` to the hero screenshot (2940x1728 into a 370x217
  box) and convert `logo-mark-128.png` (21.5KB at 28x28) to SVG.
- Add `loading="lazy"` to the product screenshots and drop `fetchPriority="high"`;
  neither is the LCP element.
- Resolve the hero logo `alt` that `aria-hidden="true"` makes unreachable.
- Delete or wire up the orphaned `public/screenshots/query.*` assets.
- Move the one-line product definition to the top of `/about/` and the homepage.
  Right now it exists only on `/faq/`, and it is the sentence an AI engine would
  lift.
- Add a low-commitment secondary CTA to blog posts; all three are install-or-leave.
- Drop the inert `keywords` meta array and the `changefreq`/`priority` fields.
- Check the browserslist target that ships 14KB of unnecessary core-js polyfills.
