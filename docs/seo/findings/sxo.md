# SXO findings — idxbeaver.portlabs.in

## Hard limitation (read first)

No WebSearch/SERP check was run for any of the 8 target queries this session (turn cap hit before
that step). Everything below labeled "SERP-verified" was NOT done. Query-type judgments here come
only from (a) parsing the query strings themselves for intent signals and (b) real on-page evidence
pulled from the 5 IdxBeaver pages via `render_page.py` + `parse_html.py`. Treat every mismatch
severity below as a hypothesis to confirm with an actual `WebSearch`/SERP pull, not a finding.

## Page evidence collected (real, on-page)

| Page | Title | H1 | Word count | Schema types | Screenshots/media |
|---|---|---|---|---|---|
| `/` | "IndexedDB Viewer & Editor for Chrome DevTools — IdxBeaver" | "IndexedDB viewer, built like a database client." | 482 | SoftwareApplication (+AggregateRating 5/5, n=7; Offer $0) | 2 real product screenshots (dark/light, 2940×1728) |
| `/vs/chrome-devtools-application-panel/` | "IdxBeaver vs Chrome DevTools Application panel" | same | 862 | SoftwareApplication, Article, BreadcrumbList | **0 product screenshots** — only brand logo/icon images |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | "...the practical guide" | same | 678 | SoftwareApplication, BlogPosting, BreadcrumbList | 0 product screenshots |
| `/blog/browser-storage-quotas-explained/` | same | same | 746 | SoftwareApplication, BlogPosting, BreadcrumbList | 0 images beyond brand marks |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | same | same | 728 | SoftwareApplication, BlogPosting, BreadcrumbList | 0 images beyond brand marks |

Homepage page-type per taxonomy: **Tool/Landing hybrid** (hero + single CTA + free-offer schema, but
no live interactive tool embedded — it can't be, it's a DevTools panel, so screenshots substitute).
`/vs/` is a genuine **Comparison Page** by structure (h2s: "At a glance", "Where the Application
panel is enough", "Where IdxBeaver pays off", "Performance and footprint", "Privacy comparison",
"When to use which") but is missing the taxonomy's required comparison-table/ItemList schema and
carries zero product screenshots — a reader has to bounce to `/` to see the UI it's arguing for.
All three blog posts are correctly typed **BlogPosting** with datePublished/Modified and author.

## Query intent classification (from query phrasing only — NOT SERP-verified)

| Query | Intent read from phrasing | Best-matching IdxBeaver page | Mismatch risk (unverified) |
|---|---|---|---|
| indexeddb viewer | Tool/product intent | `/` | Low — homepage is exactly this page type |
| indexeddb editor | Tool/product intent | `/` | Low |
| indexeddb viewer chrome extension | Tool/product intent, branded-category | `/` | Low |
| how to view indexeddb in chrome | Tutorial/how-to intent | `/blog/debugging-indexeddb-in-chrome-devtools/` | Medium — post answers this but the actual "how" (Application panel steps) is the 2nd H2, not the 1st; most tutorial-SERP winners front-load numbered steps |
| edit indexeddb chrome devtools | Tutorial/how-to intent | `/blog/debugging-indexeddb-in-chrome-devtools/` | Medium — same page, same front-loading gap; "edit" specifically is only covered as a subsection ("4. Bulk-edit") not the headline framing |
| query indexeddb | Tutorial/reference intent, could want the *native* API | `/blog/querying-indexeddb-with-mongo-style-filters/` | **High** — post's h2 order ("Why we need a query language at all" → "The shape of the language" → "How it compiles down") pitches IdxBeaver's proprietary Mongo-style filter syntax almost immediately; a searcher wanting to learn to query IndexedDB with the *native* cursor/IDBKeyRange API first would not get that here |
| chrome devtools application panel alternative | Comparison/decision intent | `/vs/chrome-devtools-application-panel/` | Low — page type matches, but see the screenshot gap above |
| browser storage quota | Definitional/reference intent | `/blog/browser-storage-quotas-explained/` | Low — page structure ("The short answer" first, then a quota table) matches expected reference-page format |

**Action before trusting the above:** run `WebSearch` for each of the 8 queries and reclassify the
actual top-10 page types per `page-type-taxonomy.md`. This was not done.

## User stories (derived from on-page evidence + query phrasing only — PAA/ads/related-searches/featured-snippet signals unavailable, no SERP pulled)

1. As a **frontend dev mid-debug**, I want to see what's actually in a specific IndexedDB record
   right now, because something's broken and I'm blocked, but I'm blocked by having to read prose
   before I get to actionable steps. *(Source: blog-debug h2 order puts "core workflow" 2nd, not 1st)*
2. As a **dev evaluating tools before adopting one**, I want visual proof of the UI before I install
   anything, because installing an unknown Chrome extension has a trust cost, but the comparison
   page that's supposed to convince me carries zero product screenshots. *(Source: `/vs/` images =
   only brand/logo assets, 0 UI screenshots)*
3. As a **dev who just searched "query indexeddb" and has never heard of IdxBeaver**, I want to learn
   how IndexedDB querying works in general, because I don't yet know if I need a third-party tool,
   but I'm blocked by content that assumes I already want Mongo-style filter syntax. *(Source:
   blog-query's first two h2s are about IdxBeaver's own filter language, not native IndexedDB
   querying)*
4. As a **cold visitor from a tutorial query**, I want a low-commitment way to keep learning before
   I install anything, because I don't trust an unfamiliar extension yet, but every CTA on the blog
   posts is binary: "Add to Chrome" or leave. *(Source: link inventory on all 3 blog posts — CTAs
   are Install/Add to Chrome/GitHub only, no lighter engagement path)*
5. As a **skeptical evaluator**, I want independent proof this tool is trustworthy, because a stranger's
   Chrome extension is a real risk, but the only trust signal is a 5.0 rating from 7 reviews.
   *(Source: AggregateRating schema, ratingCount: 7, present on all 5 pages)*

## Persona scoring (3 requested personas × 5 pages)

Rubric: Relevance/Clarity/Trust/Action, 25 pts each, 100 total. Per `persona-scoring.md`.

### (a) Frontend dev mid-debug — needs to inspect a value RIGHT NOW

| Page | Relevance | Clarity | Trust | Action | Total | Time-to-answer | Friction | Missing next step |
|---|---|---|---|---|---|---|---|---|
| `/` | 14 | 13 | 15 | 12 | 54 | Slow — hero → screenshots → external Chrome Web Store install before any inspection is possible | Multi-step install flow for someone who needs an answer in seconds | No "already installed? Open DevTools → IdxBeaver tab" quick-start block |
| `/vs/` | 6 | 10 | 14 | 10 | 40 | N/A — page never answers "how do I see this value" | Wrong content type for the urgency | Redirect/link to the how-to post is not obviously present in body copy |
| blog-debug | 20 | 15 | 12 | 14 | 61 | Medium — native-panel steps are the 2nd h2, not the 1st | Must read past intro framing to get the workflow | No jump-link/TOC to skip straight to "the core workflow" |
| blog-quota | 8 | 12 | 12 | 8 | 40 | Not this persona's need | — | — |
| blog-query | 12 | 12 | 12 | 10 | 46 | Only relevant if the debug task needs filtering a large store | Assumes interest in the query language up front | — |

**Weakest for this persona: `/vs/` (40/100).** Not a page-type problem — it correctly serves a
different persona — but if this persona lands here from a query like "chrome devtools application
panel alternative" mid-crisis, there is no fast redirect to the actual how-to content.

### (b) Dev evaluating tools to adopt

| Page | Relevance | Clarity | Trust | Action | Total | Time-to-answer | Friction | Missing next step |
|---|---|---|---|---|---|---|---|---|
| `/vs/` | 23 | 18 | 14 | 18 | 73 | Fast — "At a glance" is the first h2 | Comparison depth is good (6 h2s covering perf, privacy, when-to-use) | **Zero product screenshots on this page** — evaluator must navigate back to `/` to see the UI being argued for |
| `/` | 18 | 17 | 16 | 16 | 67 | Fast — screenshots visible early | Good visual proof (2 real screenshots) | Homepage doesn't link forward into the comparison depth beyond one nav item |
| blog-debug | 14 | 14 | 12 | 12 | 52 | Medium | Useful as supporting evidence, not primary decision content | — |
| blog-quota | 10 | 14 | 12 | 10 | 46 | Medium | Peripheral | — |
| blog-query | 15 | 13 | 12 | 12 | 52 | Medium | Demonstrates a real differentiator (query language) but reads as a feature pitch, not a neutral comparison | — |

**Weakest dimension across this persona: Trust (12–16/25 everywhere).** Same root cause repeats:
AggregateRating of 5.0 from only 7 ratings is the only social-proof signal on every page; no
case studies, no named users, no GitHub star count surfaced on-page (only a link out to GitHub).

### (c) Dev who landed from a Google tutorial query, never heard of the product

| Page | Relevance | Clarity | Trust | Action | Total | Time-to-answer | Friction | Missing next step |
|---|---|---|---|---|---|---|---|---|
| blog-debug | 21 | 16 | 10 | 12 | 59 | Medium — native-panel how-to is 2nd h2, good practice (answers the free-tool question first) but not top-of-page | Reasonable — teaches the native workflow before pitching | Binary CTA only (Add to Chrome); no lower-commitment step for someone not ready to install |
| blog-quota | 19 | 17 | 10 | 11 | 57 | Fast — "The short answer" is the first h2 | Good — reference-page structure matches expected format for this intent | Same binary-CTA gap |
| blog-query | 13 | 13 | 10 | 11 | 47 | Slow for a generic "query indexeddb" searcher — first two h2s are about IdxBeaver's own filter syntax, not general IndexedDB querying | Assumes the reader already wants a Mongo-style query language | No native-API primer up front for the reader who hasn't decided they need a third-party syntax |
| `/` | 12 | 13 | 12 | 10 | 47 | Homepage doesn't answer a "how to" question at all | Wrong content type if landed here directly | — |
| `/vs/` | 8 | 12 | 12 | 10 | 42 | Never answers a how-to question | Wrong content type for this persona's journey stage (awareness, not decision) | — |

**Weakest for this persona: `/vs/` (42/100) and blog-query (47/100).** `/vs/` is correctly a
decision-stage page, not a fit for an awareness-stage cold visitor — not a defect on its own.
blog-query's low score IS a defect: it's the page most likely to rank for a broad, awareness-stage
query ("query indexeddb") but is written for a reader already sold on the product's specific
approach.

### Systemic issue across all personas

**Trust dimension caps out around 10-16/25 everywhere.** Every page relies on the same single
proof point (AggregateRating 5.0, ratingCount 7) with no case studies, named adopters, or visible
GitHub star count. This is the one fix that would move every persona/page cell up, not just one.

## Findings (compact JSON)

```json
[
  {
    "title": "No SERP data collected for any of the 8 target queries this session",
    "severity": "High",
    "description": "The mismatch analysis below is inferred from query phrasing and on-page evidence only. No WebSearch/SERP pull was executed for 'indexeddb viewer', 'indexeddb editor', 'indexeddb viewer chrome extension', 'how to view indexeddb in chrome', 'edit indexeddb chrome devtools', 'query indexeddb', 'chrome devtools application panel alternative', or 'browser storage quota'. Actual ranking page types, PAA, featured snippets, and related searches are unknown.",
    "recommendation": "Run WebSearch for each of the 8 queries, classify the top-10 results against page-type-taxonomy.md, and recompute mismatch severities before acting on this report."
  },
  {
    "title": "'query indexeddb' blog post pitches proprietary syntax before teaching the native API",
    "severity": "Medium",
    "description": "The post at /blog/querying-indexeddb-with-mongo-style-filters/ opens with 'Why we need a query language at all' -> 'The shape of the language' -> 'How it compiles down', all about IdxBeaver's own Mongo-style filter syntax. A cold searcher for the broad query 'query indexeddb' may want to learn the native cursor/IDBKeyRange API first, not adopt a third-party syntax immediately.",
    "recommendation": "Add a short native-API primer as the first h2 (how querying works with IDBKeyRange/cursors) before introducing the Mongo-style layer, so the page serves both the awareness-stage reader and the existing pitch."
  },
  {
    "title": "Comparison page (/vs/) has zero product screenshots",
    "severity": "Medium",
    "description": "parse_html.py on /vs/chrome-devtools-application-panel/ returns 5 images, all brand logo/icon assets (logo-mark-128.png, chrome-web-store-icon.svg). No UI screenshots, despite the homepage having 2 real product screenshots (dark.png, light.png, 2940x1728). A tool-evaluating persona reading the comparison has to leave the page to see what they're comparing.",
    "recommendation": "Embed the same dark/light screenshots (or comparison-specific crops) directly in the 'Where IdxBeaver pays off' section of /vs/."
  },
  {
    "title": "Binary CTA (Add to Chrome or leave) on all three blog posts",
    "severity": "Medium",
    "description": "Link inventory for blog-debug, blog-quota, and blog-query shows only Install/Add to Chrome/GitHub links as calls to action. No lower-commitment path exists for a cold, awareness-stage visitor from a tutorial query who isn't ready to install an unfamiliar Chrome extension.",
    "recommendation": "Add a low-friction secondary CTA on blog posts (e.g., link to the FAQ, or a 30-second screen recording) for readers not yet ready to install."
  },
  {
    "title": "Trust signal is a single thin data point across every page",
    "severity": "Medium",
    "description": "Every page's SoftwareApplication schema carries the same AggregateRating (ratingValue 5, ratingCount 7). No case studies, named adopters, or GitHub star count appear as on-page content anywhere in the 5 pages analyzed.",
    "recommendation": "Surface a live GitHub star count or a small number of named/attributed user quotes on the homepage and /vs/ page; 7 ratings alone will read as thin to a skeptical evaluator persona."
  },
  {
    "title": "'How to' tutorial content front-loads context before the actionable steps",
    "severity": "Low",
    "description": "blog-debug's h2 order is 'Why IndexedDB debugging gets painful' (context) before 'The core workflow inside the Application panel' (the actual how-to). A mid-debug persona under time pressure has to read past framing to reach the steps.",
    "recommendation": "Add a jump-link/TOC at the top of blog-debug so a reader can skip straight to 'The core workflow inside the Application panel'."
  }
]
```
