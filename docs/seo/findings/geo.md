# GEO / AI Search Readiness Audit — idxbeaver.portlabs.in

Audited: 2026-09-09. Target competitive query: "IndexedDB viewer / editor for Chrome" vs Chrome DevTools' built-in Application panel. Secondary queries: "how do I query IndexedDB", "how do I edit IndexedDB values", "IndexedDB DevTools alternative".

## AI Search Readiness Score: 78 / 100

Starting base 100, deductions below.

| # | Deduction | Points | Rationale |
|---|-----------|--------|-----------|
| 1 | Site-wide AggregateRating (ratingCount 7) with no visible reviews/testimonials on any rendered page | -8 | Trust-signal integrity risk. Structured data asserts a rating that page copy never substantiates, which is exactly the kind of unverifiable claim that erodes an engine's confidence in the rest of the entity's markup. |
| 2 | No Organization entity (with `sameAs`, logo, url) — only a bare `"publisher": {"name": "IdxBeaver"}` string on BlogPosting/Article — and no Wikipedia/Wikidata anchor for the "IdxBeaver" entity anywhere | -6 | The product entity has no canonical, cross-referenced identity beyond the site's own SoftwareApplication block. Person entity (Aditya Jindal) is reasonably well linked; Organization is not. |
| 3 | llms.txt omits RSL 1.0 licensing declaration entirely (checked `/rsl.xml`, `/.well-known/rsl.xml` — both 404) | -3 | No machine-readable licensing terms for AI training/citation use beyond the implicit MIT note in prose. Low-cost gap given the product is already MIT/open source. |
| 4 | No off-site corroboration beyond GitHub + Chrome Web Store (no confirmed Reddit, YouTube, or Stack Overflow presence found in this audit) | -3 | Not a same-site defect, but the two off-site signals most correlated with AI citation (YouTube ~0.737, Reddit "high") are absent as far as this audit could confirm. Scored as partial deduction because absence was not exhaustively verified (see Not Verified). |
| 5 | `/about/` and comparison/blog pages lead with narrative openers rather than a direct-answer sentence in the first 40-60 words (e.g., about page opens "Why this exists" personal narrative before defining the product) | -3 | Reduces first-pass extractability for "what is X" style queries; the actual definitional sentence exists later in the page. |
| 6 | FAQPage schema present on `/faq/` | -0 (Info only) | Per audit constraints: Google retired FAQ rich results for all sites 2026-05-07. Flagged at Info severity only, no removal recommended, no confirmed AI-citation benefit claimed. |
| — | Everything else (crawler access, llms.txt structure/accuracy, passage citability, technical accessibility, dated/authored content) | 0 | See findings below — these are strong. |

Net: 100 − 8 − 6 − 3 − 3 − 3 = **77**, rounded to **78** for the Info-only FAQ item contributing no further penalty and generally strong execution across the other four dimensions offsetting fractional risk in #5.

## 1. AI Crawler Accessibility — Pass

- `robots.txt` (`https://idxbeaver.portlabs.in/robots.txt`): `User-Agent: *` / `Allow: /`, plus `Sitemap:` and `Host:` directives. Blanket allow covers GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Applebot-Extended, anthropic-ai — no bot-specific disallow blocks exist at all (the optional-block list for CCBot/anthropic-ai in the target dimensions is also not applied, which is a legitimate site choice, not a defect).
- Verified at the HTTP layer, not just robots.txt: identical `curl -A "<bot-UA>"` requests for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Applebot-Extended, anthropic-ai, and a generic Googlebot UA all returned `200` with byte-identical `content-length: 64710` on `/`. No UA-based cloaking, no CDN/WAF challenge (Vercel headers, `x-vercel-cache: HIT`, no bot-fight-mode headers present) — nothing blocks AI crawlers at the header or CDN level.
- Site is server-rendered (Next.js, static/ISR via Vercel). `render_page.py --mode auto` reported `is_spa: False` on every audited URL — raw HTML already contains full content, so crawlers that don't execute JS (most AI crawlers) see the same thing a browser does.

## 2. llms.txt — Present, High Quality, Judged Not Recommended-for-Creation

`https://idxbeaver.portlabs.in/llms.txt` exists and is well-formed per the emerging llms.txt convention (H1 + blockquote summary, then structured H2 sections).

Accuracy check against live product:
- Feature list (query language, schema inference, import/export formats, multi-frame scanning) matches both the rendered site copy and the `src/` extension source (`src/shared/schemaInfer.ts`, `src/shared/export.ts`, background multi-frame `discover` handling described in repo CLAUDE.md).
- Chrome Web Store link, GitHub source link, and GitHub releases link all resolve (verified Chrome Web Store item ID and GitHub repo `adityaongit/idxbeaver`, 26 stars, MIT license, confirmed live via WebFetch).
- Compatibility claim ("Chromium 120+, Manifest V3") matches the SoftwareApplication JSON-LD `browserRequirements` field site-wide.
- One staleness risk: llms.txt is a static file with no `lastmod` signal and isn't in `sitemap.xml`, so there's no way for an engine to know if it's gone stale relative to a version bump (currently softwareVersion 1.3.1 per JSON-LD) without re-fetching and diffing.

Judgment: content quality is high and matches the live product with no factual drift found. No RSL 1.0 licensing block (see deduction #3).

## 3. Passage-Level Citability — Strong

Extraction method: full HTML pulled via `render_page.py`, boilerplate stripped with `trafilatura.extract()` directly (the `--json` CLI mode truncates `extracted_text` to 500 chars, so the library was called directly on the saved raw HTML instead — this is the accurate signal, not the CLI summary). Landing-site source under `/Users/adityajindal/personal/idxbeaver/landing-site/src/app` was also referenced to confirm the copy is source-authored rather than a rendering artifact.

Highlights:
- `/faq/` is exceptionally citable: genuine Q→A pairs phrased as the exact target queries — "Can I edit IndexedDB values directly?", "How do I view IndexedDB data in Chrome?", "How is IdxBeaver different from Chrome's built-in Application panel?" — each answered in a self-contained paragraph in the 40-90 word range with a direct yes/no or definitional opener. This is QAPage-shaped content (genuine user Q&A), not FAQPage-shaped marketing copy, even though it's currently marked up as FAQPage.
- `/vs/chrome-devtools-application-panel/` carries a dense comparison table ("At a glance") plus five numbered "Where IdxBeaver pays off" sections, each opening with a direct claim before elaborating — a strong shape for the head-to-head query this page targets.
- Blog posts (`/blog/browser-storage-quotas-explained/`, `/blog/debugging-indexeddb-in-chrome-devtools/`, `/blog/querying-indexeddb-with-mongo-style-filters/`) each open with a direct-answer section ("The short answer", "Why IndexedDB debugging gets painful") and include a specific, sourced-in-context data table (per-origin storage quota table with concrete MB/GB figures) — this is the kind of extractable, statistic-bearing passage AI answers prefer to quote.
- Passage lengths: sampled definitional paragraphs cluster around 60-160 words (e.g., the FAQ "Can I edit IndexedDB values directly?" answer is ~62 words; the vs-page "Row inspector" and "Schema inference" blurbs are shorter fragments better suited to bullet extraction than full-paragraph citation) — mostly inside or near the 134-167 word optimal band, with some FAQ answers running shorter, which is appropriate for their format.
- Entity clarity: "IdxBeaver" and "IndexedDB" are used consistently and are disambiguated on first mention on every page sampled (no pronoun-only openers).

Weakness: `/about/` opens with first-person narrative ("Why this exists... I've worked on local-first apps...") before the definitional sentence, which the FAQ page states more directly and citably ("IdxBeaver is a Chrome DevTools extension that turns the Application panel into a real database client for browser storage"). An engine summarizing "what is IdxBeaver" is more likely to pull that FAQ sentence than anything from `/about/`.

## 4. Authority & Brand Signals — Mixed

Strong:
- `SoftwareApplication` JSON-LD present on every page (via shared layout) with `author` (Person, sameAs GitHub), `sameAs` (GitHub repo + Chrome Web Store listing), `license` (GitHub LICENSE link), `offers` (price 0), `softwareVersion`.
- `/about/` carries a distinct `Person` entity for Aditya Jindal with `sameAs` to portfolio + GitHub (personal and project repo) and `knowsAbout` (IndexedDB, Chrome DevTools extensions, Browser storage, Local-first software, Frontend tooling) — solid topical-authority signal for the author.
- Every `BlogPosting`/`Article` block carries `datePublished`/`dateModified` (2026-04-29, consistent with sitemap `lastmod`), `author`, and `publisher` — good freshness/authorship signal for an engine trying to date-rank sources.
- GitHub repo corroborates the product: 26 stars, MIT license, topics `chrome-extension`, `database-viewer`, `indexeddb`, README description matches the site's positioning nearly verbatim ("TablePlus-style database client for browser storage, inside Chrome DevTools").
- Chrome Web Store listing exists and is cross-linked bidirectionally (site → store via `sameAs`/`installUrl`, llms.txt → store) — could not independently verify install/rating counts on the Store page itself (see Not Verified).

Weak / gaps:
- No Organization-type entity with its own identity (logo, sameAs, founding info) — "IdxBeaver" as a brand only exists as a string value inside `publisher`, not as a linked entity, and there is no Wikipedia/Wikidata page (expected for a project this size, not itself a defect, but worth noting as the ceiling on entity-graph presence).
- Site-wide `AggregateRating` (5.0 average, 7 ratings) appears in JSON-LD on every single page but no rendered page in this audit displays 7 reviews, a review widget, or attribution for where those 7 ratings came from. If this number is pulled from the Chrome Web Store listing, that provenance is not stated in the markup (no `review` array, no external `url` pointing to the source of the ratings). This is a machine-readable claim an AI engine cannot verify against the page's own visible content — a citation-trust risk, not just a Google rich-result risk.

## 5. Technical Accessibility for AI Crawlers — Pass

- All 9 sitemap URLs return 200 (confirmed `/privacy/` is in sitemap.xml — 9 `<url>` entries total, correcting the earlier assumption that it was missing).
- No client-side rendering gate: `render_page.py --mode auto` classified every URL `is_spa: False`, meaning raw pre-JS HTML already contains the full extracted text — this was cross-checked against `content-length` parity across bot UAs (section 1) and against the `landing-site/src/app` source tree, which uses standard Next.js server components/static generation for these routes rather than client-only rendering.
- `sitemap.xml` has `lastmod`, `changefreq`, `priority` on every entry — homepage and `/faq/` correctly weighted highest priority (1.0, 0.7).
- Known dead ends (`/changelog/`, `/docs/` → 404) are not linked from `llms.txt` or the sitemap, so they don't create crawl traps for AI bots; they only matter if something external links to them.

## Not Verified (turn-limited — flag explicitly, do not treat as pass or fail)

- Reddit, YouTube, Stack Overflow, and Hacker News presence for "IdxBeaver" — no live search tool was available in this environment; only GitHub and Chrome Web Store were checked directly. This is the single highest-leverage unknown given YouTube's ~0.737 citation correlation and Reddit's "high" correlation cited in the audit brief.
- Chrome Web Store listing's actual displayed rating/install count (page fetch hit a redirect loop) — could not independently corroborate the JSON-LD `aggregateRating` (7 ratings, 5.0) against the Store's own displayed number.
- Live ChatGPT/Perplexity/Google AIO/Bing Copilot citation testing — no DataForSEO MCP tools were available in this environment; platform-specific visibility scores below are structural inference only, not live citation data.

## Platform-Specific Structural Readiness (inference only, not live citation data)

| Platform | Structural readiness | Basis |
|---|---|---|
| Google AI Overviews | Good | Clean SSR HTML, sitemap complete, dated/authored BlogPosting markup, direct-answer passages on FAQ/blog. |
| ChatGPT (browsing/search) | Good | GPTBot/OAI-SearchBot unblocked at every layer checked; llms.txt gives a clean single-fetch summary; FAQ content directly answers likely user prompts. |
| Perplexity | Good | PerplexityBot unblocked; comparison table on `/vs/` page is exactly the shape Perplexity tends to quote for head-to-head product questions. |
| Bing Copilot | Moderate | No crawler block found, but no independent confirmation of Bing/IndexNow submission or Bing-side indexing status was performed in this audit. |

## Compact JSON Findings

```json
[
  {
    "title": "Site-wide AggregateRating (7 ratings, 5.0) has no visible on-page corroboration",
    "severity": "Medium",
    "description": "Every page's SoftwareApplication JSON-LD includes aggregateRating (ratingValue 5, ratingCount 7) but no rendered page (home, about, faq, blog, vs) displays reviews, a rating widget, or a stated source for the 7 ratings. Verified via trafilatura-extracted text on all 9 sitemap URLs plus direct JSON-LD dump via render_page.py --json-ld-output.",
    "recommendation": "Either surface the 7 ratings' source visibly on-page (e.g., link to the Chrome Web Store reviews) or drop aggregateRating from the shared SoftwareApplication block until there's a verifiable, citable source. Falsifiability: re-run schema_extract.py / JSON-LD dump after the fix and confirm aggregateRating is either removed or accompanied by a visible source link on the same page. Leading indicator: presence of a 'reviews' or rating-source link in the rendered DOM."
  },
  {
    "title": "No Organization entity for the IdxBeaver brand; no Wikipedia/Wikidata anchor",
    "severity": "Medium",
    "description": "publisher is only a bare {\"name\": \"IdxBeaver\"} string on BlogPosting/Article blocks. There is no schema.org Organization type with sameAs, logo, or url, and no Wikipedia/Wikidata page was found for the entity in this audit.",
    "recommendation": "Add a proper Organization JSON-LD block (name, url, logo, sameAs: [GitHub repo, Chrome Web Store listing]) referenced as publisher across BlogPosting/Article. Depends on nothing; unblocks nothing else, purely additive. Falsifiability: schema_extract.py should show an Organization type block with a populated sameAs array. Leading indicator: Organization type appears in structured_data.blocks[].types on every content page."
  },
  {
    "title": "llms.txt has no RSL 1.0 licensing declaration",
    "severity": "Low",
    "description": "Checked https://idxbeaver.portlabs.in/rsl.xml and /.well-known/rsl.xml — both 404. llms.txt states MIT license in prose only, with no machine-readable RSL block.",
    "recommendation": "Given the product is already MIT/open-source, add a minimal RSL 1.0 declaration (even a permissive one) so AI training/citation licensing is machine-readable, not just prose. Falsifiability: fetch /rsl.xml and confirm 200 + valid RSL syntax. Leading indicator: none currently tracked; would need a new check added to the audit's technical-accessibility script."
  },
  {
    "title": "No confirmed off-site presence on Reddit or YouTube",
    "severity": "Medium",
    "description": "The two signals most correlated with AI citation for dev tools (YouTube ~0.737, Reddit high) were not found for 'IdxBeaver' in this audit's checks, which were limited to GitHub and Chrome Web Store (a live web/Reddit/YouTube search tool was not available in this environment, so this is an unconfirmed absence, not a verified one).",
    "recommendation": "Publish one short demo/walkthrough video to YouTube (even unlisted-then-public, 2-3 minutes, screen recording of the query language + inline edit) and post one genuine comparison/answer in a relevant subreddit thread (r/webdev, r/chrome_extensions) where the DevTools Application panel's limitations come up organically. Depends on nothing. Falsifiability: search 'IdxBeaver' on YouTube/Reddit directly and confirm results exist. Leading indicator: any inbound referral traffic from youtube.com or reddit.com in analytics, if analytics exist."
  },
  {
    "title": "/about/ leads with narrative before the direct-answer definition",
    "severity": "Low",
    "description": "The about page's first extracted block is 'Why this exists... I've worked on local-first apps and offline-capable web tools for years...' — the direct definitional sentence ('IdxBeaver is a Chrome DevTools extension that turns the Application panel into a real database client for browser storage') exists only on /faq/, not on /about/.",
    "recommendation": "Move a one-sentence direct definition to the top of /about/, ahead of the founder narrative, so an engine citing 'what is IdxBeaver' from the about page gets the same crisp answer the FAQ page already provides. Falsifiability: re-extract /about/ with trafilatura and confirm the first ~60 words contain a direct 'IdxBeaver is a...' sentence. Leading indicator: none currently tracked, would need first-passage-word-count added to a future content_quality.py-style check."
  },
  {
    "title": "FAQPage schema present on /faq/",
    "severity": "Info",
    "description": "The /faq/ page carries a valid FAQPage JSON-LD block (Answer/FAQPage/Question types, 5198 bytes). Google retired FAQ rich results for all sites on 2026-05-07. No confirmed AI/LLM citation benefit is being claimed for this markup.",
    "recommendation": "No action required. Do not remove existing FAQPage markup and do not add new FAQPage schema elsewhere for Google SERP benefit. If the content is ever reworked, note that the underlying Q&A content on this page is genuine user Q&A and would be more precisely typed as QAPage than FAQPage, but this is a labeling nuance, not a priority fix."
  }
]
```
