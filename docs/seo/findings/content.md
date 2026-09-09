# Content Quality + E-E-A-T Audit — idxbeaver.portlabs.in

Scope note: this run was cut short by a turn cap. Sections marked **NOT ASSESSED**
are stated plainly rather than estimated. Everything else below is backed by
either a live page fetch (`render_page.py`, saved under `pages/*.html` in this
audit dir) or direct source reads in `/Users/adityajindal/personal/idxbeaver`.

## Word counts (measured this session)

Two extraction methods were run against the saved HTML for all 9 live URLs —
trafilatura (boilerplate-stripped) and full-DOM text (BeautifulSoup, includes
nav/footer chrome, so it's an upper bound):

| Page | trafilatura words | full-DOM words | Floor (skill table) |
|---|---|---|---|
| `/` | 251 | 552 | 500 (homepage) |
| `/vs/chrome-devtools-application-panel/` | 889 | 946 | ~800 (service-page equivalent) |
| `/blog/` (index) | 157 | 225 | n/a (index) |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | 641 | 783 | 1,500 (blog post) |
| `/blog/browser-storage-quotas-explained/` | 752 | 853 | 1,500 (blog post) |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | 777 | 957 | 1,500 (blog post) |
| `/faq/` | 682 | 803 | n/a (Q&A format) |
| `/about/` | 269 | 348 | n/a (bio/trust page) |
| `/privacy/` | 307 | 375 | n/a (policy page) |

The two methods disagree by ~2x on `/`, so the homepage's true unique-copy
count is ambiguous — flagged as borderline rather than a confirmed fail.
All three blog posts are unambiguously 40–65% of the 1,500-word floor by
either method. Per the skill's own caveat, this is a topical-coverage floor,
not a ranking factor — flagged as a coverage-depth gap given each post is
framed as "the practical guide" / "a clear-eyed breakdown."

## E-E-A-T signals (verified against source)

**Trustworthiness — strong, and checkable claims hold up:**
- `/privacy/` lists permissions one-by-one (`activeTab`, `scripting`, `storage`,
  `webNavigation`, `cookies`, `host_permissions: <all_urls>`) with a plain-English
  reason for each. Cross-checked against `dist/manifest.json` — **exact match**,
  no undisclosed or unused permissions.
  named contact (`work.adityajindal@gmail.com`), and a real displayed
  "Last updated · 2026-04-27" date.
- The "zero network, zero telemetry" claim (repeated on `/about/`, `/faq/`,
  `/privacy/`) was checked against `src/**/*.ts(x)` in the extension: no
  `fetch`, `XMLHttpRequest`, `sendBeacon`, or analytics-SDK calls anywhere in
  the codebase. **Claim verified true.**
- MIT license claim verified against `/Users/adityajindal/personal/idxbeaver/LICENSE`
  ("MIT License, Copyright (c) 2026 Aditya Jindal") — matches every
  "MIT-licensed" mention on `/about/` and `/faq/`.
- SQL-export/import and ZIP-export claims (`/faq/`, `/vs/`) verified present in
  `src/shared/export.ts` and `src/shared/import.ts` (file-level presence
  confirmed; did not re-read full implementation this session).

**Experience — genuine first-hand signals:**
- `/about/` opens in first person: "I've worked on local-first apps and
  offline-capable web tools for years, and IndexedDB has always been the part
  where tooling falls off a cliff."
- `/vs/chrome-devtools-application-panel/` includes an honest "Where the
  Application panel is enough" section that talks the reader out of the
  product for small use cases — a real experience/candor signal, not pure
  marketing copy.

**Expertise — named author, technical accuracy holds up:**
- Person schema on `/about/` (`sameAs`: portfolio + 2 GitHub URLs, `knowsAbout`:
  IndexedDB, Chrome DevTools extensions, browser storage, local-first
  software, frontend tooling).
- Every checkable technical claim (permissions, license, export formats,
  network behavior) matched the actual source in this audit.

**Authoritativeness — the weak leg:**
- Solo-author project, no third-party citations, backlinks, or press
  mentions assessed this session (out of scope — no backlink API access per
  CONTEXT.md, and not reached before the turn cap).
- Homepage JSON-LD (`home.json` → `structured_data.blocks[0].types`)
  contains `AggregateRating`, `Offer`, `Person`, `SoftwareApplication` in one
  1,411-byte block. **The AggregateRating's actual value/count/source was
  not opened or verified against the Chrome Web Store listing this
  session** — flagged as an unverified trust claim, not a confirmed problem.

## Freshness signals — two real integrity issues found in source

1. `src/app/sitemap.ts`: `const lastModified = new Date()` is computed once
   per build and reused for `/`, `/vs/...`, `/blog` (index), `/faq`,
   `/about`, `/privacy` — i.e., **6 of 9 sitemap entries always report "today"
   regardless of whether the page actually changed.** Only the 3 blog posts
   use a real `post.publishedOn` date. This means `/privacy/`'s sitemap
   `lastmod` will read "today" on every deploy even though the page itself
   displays a fixed "Last updated · 2026-04-27" to users — the freshness
   signal shown to users and the one declared to crawlers can diverge.
2. `dateModified` in JSON-LD on `/vs/chrome-devtools-application-panel/`
   (`src/app/vs/.../page.tsx`) and on every blog post (`src/components/blog-post.tsx`)
   is hardcoded equal to `datePublished` (e.g. both `"2026-04-29"`). If the
   page copy is edited later, `dateModified` will silently stay wrong — it's
   frozen, not derived from any actual edit tracking.
3. Batch-publish pattern: home `publication_date` (per `render_page.py`) is
   `2026-04-24`; `/vs/...` `datePublished` and all 3 blog posts'
   `publishedOn` are all `2026-04-29` — a single day, 5 days after apparent
   launch. Not proof of AI-generated content by itself, but combined with
   #2 (dates that never move again) it's the kind of "bulk-published,
   no update cadence" pattern Sept 2025 QRG treats as a low-quality signal.

**Not fetched live this session** — the above is source-code analysis, not a
live `sitemap.xml` diff. CONTEXT.md's own live-crawl note says `/privacy/` is
a live 200 page **missing from the live sitemap.xml**. The local repo's
`sitemap.ts` source, read this session, *does* include a `/privacy` entry in
its returned array. That's a real discrepancy worth flagging on its own:
**either production is running an older build than this checkout, or there's
a caching/deploy-sync issue** — the fix isn't a code change, it's confirming
the live deployment matches the current commit.

## AI-citation readiness

- `/faq/` is purpose-built for extraction: every Q&A item carries both a
  rendered `a` (JSX) and a flat `plain` string kept in sync explicitly for
  the FAQPage JSON-LD (`type Faq = { q, a, plain }`, with a code comment
  stating the two must be kept in sync). 15 self-contained Q&A pairs.
- `/vs/chrome-devtools-application-panel/` has a 16-row structured comparison
  table (`ComparisonTable`) with terse, factual, one-line-per-feature claims
  — high-value extractable content.
- FAQPage schema is present on `/faq/` (`"@type": "FAQPage"`, 15 `mainEntity`
  Q&As). Per the audit's hard rule: Google retired FAQ rich results for all
  sites on 2026-05-07 — **flagged at Info severity only, no removal or
  Google-SERP-benefit claim.** The Q&A content itself remains legitimate and
  useful independent of the schema's SERP status.

## Explicitly NOT assessed this session (turn cap)

- **Homepage / `/vs/` / `/faq/` systematic duplicate-content check.** Manual
  reading found the same phrases repeated verbatim in places (e.g.
  "MongoDB-style queries" + "index-aware planner/planning" appears in the FAQ
  answer and the `/vs/` comparison table) — this reads as consistent brand
  messaging, not templated duplication, but no systematic pairwise/shingling
  comparison was run. Treat as unconfirmed either way.
- **Internal linking depth and anchor quality.** A static grep for
  `href="/..."` across `src/app` + `src/components` found only 6 hardcoded
  internal links sitewide, and zero matches inside `site-nav.tsx` /
  `site-footer.tsx` specifically — which almost certainly means the primary
  nav/footer links are built from a data array or constant, not literal
  `href="..."` strings the grep pattern would catch. **This is a lower bound
  only, not a confirmed thin-linking finding.**
- **Readability metrics** (Flesch-Kincaid or similar) — not computed.
- **Blog-to-blog interlinking** — only one post's source was read in full;
  cross-links between the 3 posts were not confirmed or ruled out.
- **Chrome Web Store listing content** (live rating/install-count values
  backing the homepage `AggregateRating`) — not fetched.
- **`llms.txt` content** — not read this session (CONTEXT.md notes it exists
  and is "detailed"; contents not verified).
- **`src/lib/version.ts` / displayed `APP_VERSION`** vs. `dist/manifest.json`
  version (`1.3.1`) — the file path errored on grep and was not resolved.
