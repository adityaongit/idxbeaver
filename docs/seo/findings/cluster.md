# Semantic cluster architecture — idxbeaver.portlabs.in

Seed: "indexeddb viewer". 3 blog posts + 1 /vs/ page exist. Near-greenfield.

## Method note (what's measured vs. judgement)

Full N×(N-1)/2 SERP-overlap pairwise scoring (per `serp-overlap-methodology.md`) was not run to completion — WebSearch calls were cut short by the turn cap. What follows is honestly split:

- **SERP-measured** = I ran WebSearch for both keywords and counted shared URLs in the returned organic results myself. Listed with the actual overlap count and the shared domains.
- **Judgement call** = grouped by shared head-term + intent per the methodology's own "skip rules" (explicitly permitted when a pairwise check wasn't run), or by direct evidence from the codebase (e.g., homepage `KEYWORDS`/description already claim LocalStorage/SessionStorage/Cookies/Cache Storage coverage). Flagged as such — not presented as measured.

No DataForSEO/volume data available (tier 0 environment) — cluster priority is ranked by SERP-evidenced content-gap size and product fit, not search volume.

## SERP overlap measured (actual pairwise checks run)

| Pair | Overlap (shared URLs / 10) | Shared domains | Verdict |
|---|---|---|---|
| "indexeddb viewer" × "indexeddb inspector devtools" | 3 | chromewebstore(IndexedDBEdit), developer.chrome.com/indexeddb, learn.microsoft.com/indexeddb | interlink tier (2-3), same topic in practice |
| "indexeddb viewer" × "how to view indexeddb data chrome" | 3 | developer.chrome.com/indexeddb, chromewebstore(indexeddb viewer), learn.microsoft.com/edge indexeddb | interlink tier |
| "indexeddb inspector devtools" × "indexeddb not showing up in devtools" | 3 | medium (ashabb), developer.chrome.com/indexeddb, learn.microsoft.com/th-th indexeddb | interlink tier — troubleshooting variant of same cluster |
| "export indexeddb to json" × "indexeddb viewer" cluster | 0 | none | separate cluster, confirmed |
| "browser storage quota exceeded error" × "navigator.storage.estimate" | 0 (no shared URL, only domain-level echo on raymondcamden.com, different articles) | — | two informational sub-angles of one existing post, not two posts |
| "localStorage vs indexeddb" × "how to view cookies/localStorage/sessionStorage devtools" | 0 | — | separate: concept-comparison vs. devtools-how-to |
| "cache storage api devtools inspect" × IndexedDB cluster | 0 | — | separate topic, same intent pattern (storage-type how-to) |
| "chrome devtools application panel alternative" × "best indexeddb debugging tool 2026" | 0 | — | both commercial-investigation, feed /vs/ page and homepage, not a new page |
| "clear all site data chrome extension" × everything above | 0, and different competitor set entirely (Clear Site Data, Clear Browsing Data extensions) | — | **out of scope**, excluded from plan |

All of the above overlap scores are in the 0-3 range — nothing hit the 4-6 (same cluster, same post candidate) or 7-10 (merge) band, so no cannibalization risk was found and no two keywords need merging into one post.

## Judgement-call groupings (not pairwise-SERP-verified, methodology skip-rule + codebase evidence)

- "dexie.js inspect database" — no dedicated competing content found in search; grouped with the querying cluster by shared audience (Dexie is a thin wrapper over IndexedDB) and by product fit (idxbeaver already reads raw IndexedDB, which is what backs a Dexie DB). Not SERP-cross-checked against other clusters.
- "storage types" spoke (localStorage/sessionStorage/cookies/Cache Storage/IndexedDB in one post) — grouped by matching Chrome's own doc information architecture (one doc page per storage type under `/docs/devtools/storage/`) and by direct evidence from `layout.tsx`: homepage `DESCRIPTION` already says "Browse, query, edit, and export IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage" and `KEYWORDS` lists `LocalStorage editor`, `Cookies inspector`, `Cache Storage viewer` — the product already claims this scope, content doesn't yet exist for it. This is a codebase-evidence judgement call, not a SERP overlap measurement.

## Cluster map

```
                         [Cluster: Export]
                         export-indexeddb-json-csv (NEW, spoke)
                                    |
[Cluster: Storage Types]      [PILLAR: /]              [Cluster: DevTools Access]
storage-types-explained (NEW)  "indexeddb viewer"        debugging-indexeddb-... (existing)
                    \      transactional, homepage      /vs/chrome-devtools-... (existing)
                     \            |                    /
              [Cluster: Querying]   [Cluster: Dexie]
    querying-indexeddb-mongo (existing)   inspecting-dexie-databases (NEW, stretch)

standalone, already correct: browser-storage-quotas-explained (existing spoke, Cluster: Storage Quotas)
```

### Cluster → intent → hub/spoke mapping

| Cluster | Intent | Hub page (existing) | Spokes (existing) | Spokes (missing) |
|---|---|---|---|---|
| Product / pillar | Transactional | `/` | — | — |
| DevTools access & troubleshooting | Informational, mixed with commercial-investigation | `/` (pillar) | `/blog/debugging-indexeddb-in-chrome-devtools/`, `/vs/chrome-devtools-application-panel/` | none — expand existing post with a "why isn't my data showing" section, do not spin a new page (topic is too thin on its own, would fail the thin-content gate) |
| Querying / filtering IndexedDB | Informational → commercial (product differentiator) | `/` | `/blog/querying-indexeddb-with-mongo-style-filters/` | none required now |
| Storage quotas & limits | Informational (explainer) | `/` | `/blog/browser-storage-quotas-explained/` | none — already covers both sub-angles found in search |
| Exporting / backing up browser data | Informational → commercial-investigation | `/` | none | **`/blog/exporting-indexeddb-data-json-csv/`** — Priority 1 |
| Storage types explained (localStorage/sessionStorage/cookies/Cache Storage/IndexedDB) | Informational (broad, top-of-funnel) | `/` | none | **`/blog/browser-storage-types-explained/`** — Priority 2 |
| Dexie.js / IndexedDB wrapper libraries | Informational (niche, high dev-intent) | `/` | none | `/blog/inspecting-dexie-js-database-in-devtools/` — Priority 3 (stretch, ship only if 1 and 2 land and there's bandwidth) |

## Missing spokes, ranked by payoff (capped at 3 — solo maintainer)

1. **Exporting IndexedDB data (JSON/CSV)** — zero existing coverage, SERP-confirmed as a fully separate cluster (0 overlap with viewer cluster), maps directly to a real product feature (export button) and to a direct competitor already found in search (chrome-stats "IndexedDB Exporter", `indexeddb-export-import` npm lib). Best conversion angle of the three: readers arrive already trying to solve the export problem idxbeaver solves.
2. **Browser storage types explained** (one post covering localStorage/sessionStorage/cookies/Cache Storage/IndexedDB + how to view each) — the product already claims this scope in its own metadata but has zero content for it. One consolidated post, not five thin ones — five separate storage-type posts would each be a stub and would fail the thin/templated-page quality gate.
3. **Inspecting a Dexie.js database** — smallest, most speculative payoff of the three (no volume signal, judgement-call grouping only). Ship last, only if capacity remains.

Explicitly **not recommended**: a second `/vs/` page against `indexeddb-debug-bar` (different product category — in-app panel, not a browser extension — low relevance); a `/docs/` page (currently 404s; nothing in the researched keyword space needs a reference-doc format over a blog post; revisit only if the query-syntax post gets traction and needs a stable reference page); separate posts per storage type; any page targeting "clear all site data" (wrong competitor set, no topical fit).

## Internal link matrix (existing pages + 3 priority new pages)

Evidence for current state, read directly from the repo:
- `debugging-indexeddb-in-chrome-devtools` body links to `/` and to the querying post. Missing: link to `/vs/chrome-devtools-application-panel/` (same topic, commercial variant) and to the storage-quotas post.
- `browser-storage-quotas-explained` body links only to `/` and an external MDN page. No sibling links.
- `querying-indexeddb-with-mongo-style-filters` body has **zero internal links** — only an external GitHub link. This breaks the mandatory "spoke must link to pillar" rule right now.
- `/vs/chrome-devtools-application-panel/` body has **zero internal links** — only an external GitHub link. Also breaks the mandatory spoke→pillar rule, and misses an obvious sibling link to the debugging blog post (same topic).
- Site-wide nav (`site-nav.tsx`) and footer (`site-footer.tsx`) already link `/`, `/blog`, `/vs/chrome-devtools-application-panel`, `/faq`, `/about` — so no page is a structural orphan (all reachable within 1 click sitewide). The gap is **contextual body links**, not reachability.

| From | To | Anchor text | Type |
|---|---|---|---|
| `/` (pillar) | `/blog/debugging-indexeddb-in-chrome-devtools/` | "debugging IndexedDB in Chrome DevTools" | mandatory |
| `/` (pillar) | `/blog/querying-indexeddb-with-mongo-style-filters/` | "query IndexedDB with MongoDB-style filters" | mandatory |
| `/` (pillar) | `/blog/browser-storage-quotas-explained/` | "browser storage quotas" | mandatory |
| `/` (pillar) | `/vs/chrome-devtools-application-panel/` | "IdxBeaver vs the Chrome DevTools Application panel" | mandatory |
| `/` (pillar) | `/blog/exporting-indexeddb-data-json-csv/` (new) | "exporting IndexedDB data to JSON or CSV" | mandatory, once shipped |
| `/` (pillar) | `/blog/browser-storage-types-explained/` (new) | "IndexedDB, LocalStorage, Cookies and Cache Storage explained" | mandatory, once shipped |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | `/` | "IdxBeaver IndexedDB viewer" | mandatory (exists) |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | `/vs/chrome-devtools-application-panel/` | "how IdxBeaver compares to the built-in Application panel" | recommended, **currently missing** |
| `/blog/debugging-indexeddb-in-chrome-devtools/` | `/blog/browser-storage-quotas-explained/` | "browser storage quota limits" | recommended, **currently missing** |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | `/` | "IdxBeaver IndexedDB viewer" | mandatory, **currently missing — fix first** |
| `/blog/querying-indexeddb-with-mongo-style-filters/` | `/blog/debugging-indexeddb-in-chrome-devtools/` | "debugging IndexedDB in DevTools" | recommended, **currently missing** |
| `/vs/chrome-devtools-application-panel/` | `/` | "IdxBeaver" | mandatory, **currently missing — fix first** |
| `/vs/chrome-devtools-application-panel/` | `/blog/debugging-indexeddb-in-chrome-devtools/` | "debugging IndexedDB in Chrome DevTools" | recommended, **currently missing** |
| `/blog/browser-storage-quotas-explained/` | `/blog/browser-storage-types-explained/` (new) | "the different browser storage types" | recommended, once shipped |
| `/blog/exporting-indexeddb-data-json-csv/` (new) | `/` | "IdxBeaver's export feature" | mandatory, once shipped |
| `/blog/exporting-indexeddb-data-json-csv/` (new) | `/blog/debugging-indexeddb-in-chrome-devtools/` | "inspecting IndexedDB before you export" | recommended, once shipped |
| `/blog/browser-storage-types-explained/` (new) | `/` | "IdxBeaver" | mandatory, once shipped |
| `/blog/browser-storage-types-explained/` (new) | `/blog/browser-storage-quotas-explained/` | "how much storage you actually get" | recommended, once shipped |
| `/blog/browser-storage-types-explained/` (new) | `/blog/exporting-indexeddb-data-json-csv/` (new) | "exporting any of these storage types" | recommended, once shipped |
| `/blog/inspecting-dexie-js-database-in-devtools/` (new, stretch) | `/` | "IdxBeaver" | mandatory, once shipped |
| `/blog/inspecting-dexie-js-database-in-devtools/` (new, stretch) | `/blog/querying-indexeddb-with-mongo-style-filters/` | "querying IndexedDB with filters" | recommended, once shipped |
| `/faq/` | `/vs/chrome-devtools-application-panel/` | (exists) | mandatory (exists) |
| `/faq/` | `/` | add if missing | recommended |

## Cannibalization check

No conflicts found. Homepage targets "IndexedDB viewer / editor" (transactional, product page — confirmed via `layout.tsx` TITLE/DESCRIPTION/KEYWORDS). The three existing posts each target a distinct informational sub-intent (DevTools how-to, Mongo-style querying, storage quotas) with 0-3 measured SERP overlap against the viewer/product terms — well under the 4+ merge threshold. No two planned pages share a primary keyword.

## Findings (JSON)

```json
[
  {
    "title": "Query-syntax spoke post has zero internal links to the pillar or any sibling — mandatory hub-spoke link missing",
    "severity": "High",
    "description": "src/app/blog/querying-indexeddb-with-mongo-style-filters/page.tsx contains only one href, an external GitHub link. No link back to / (the pillar) and no link to the sibling debugging-indexeddb post, verified by grepping the file's href attributes.",
    "recommendation": "Add a body-content link from this post to / (anchor: 'IdxBeaver IndexedDB viewer') and to /blog/debugging-indexeddb-in-chrome-devtools/. Falsifiable: re-grep the file for href=\"/\" after the edit; leading indicator: this page's crawl depth from / in the next sitemap/crawl audit should read 1, not 2+."
  },
  {
    "title": "/vs/chrome-devtools-application-panel/ has zero internal links to the pillar or the topically identical blog post",
    "severity": "High",
    "description": "src/app/vs/chrome-devtools-application-panel/page.tsx contains only one href, an external GitHub link. It is reachable from the site nav/footer but has no contextual body link to / or to /blog/debugging-indexeddb-in-chrome-devtools/, which covers the same DevTools Application-panel topic.",
    "recommendation": "Add a body-content mandatory link to / and a recommended sibling link to the debugging blog post. Depends on nothing; unblocks the DevTools-access cluster's link density metric. Falsifiable: re-grep for the added hrefs. Leading indicator: internal links pointing at this page from other content pages should go from 0 to 2+."
  },
  {
    "title": "Storage-quotas spoke has no sibling links within its cluster",
    "severity": "Medium",
    "description": "src/app/blog/browser-storage-quotas-explained/page.tsx links only to / and an external MDN page (verified by grep). SERP check found the storage-quota-exceeded and navigator.storage.estimate angles share 0 shared URLs but are both already covered by this single post, so it does not need a new spoke, just cross-links once new content exists.",
    "recommendation": "Once /blog/browser-storage-types-explained/ ships, add a recommended cross-link from this post to it. No action needed before that. Falsifiable: check for the new href after the storage-types post ships."
  },
  {
    "title": "Content gap: exporting IndexedDB data has zero coverage and is a SERP-confirmed separate cluster",
    "severity": "Medium",
    "description": "WebSearch for 'export indexeddb to json' returned a completely disjoint URL set (indexeddb-export-import on GitHub, Dexie's export/import docs, an npm package, a Chrome extension called 'IndexedDB Exporter') versus the 'indexeddb viewer' cluster's URL set — 0 shared URLs. The site has no page targeting this and the product has a working export feature per the repo's own README/description language.",
    "recommendation": "Ship /blog/exporting-indexeddb-data-json-csv/ as spoke #1 (highest ranked of the 3 recommended new pages) with mandatory link to / and recommended link to the debugging post. Falsifiable: page should rank/receive impressions for 'export indexeddb' queries within a normal indexing window; leading indicator is Search Console impressions for export-related queries once GSC access exists (currently unavailable per audit context)."
  },
  {
    "title": "Content gap: 'storage types explained' — product already claims scope in metadata that has no matching content",
    "severity": "Medium",
    "description": "layout.tsx DESCRIPTION says the product handles 'IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage' and KEYWORDS lists 'LocalStorage editor', 'Cookies inspector', 'Cache Storage viewer' — but no blog content exists for any non-IndexedDB storage type. This is a judgement-call grouping (Chrome's own docs structure + this codebase evidence), not a SERP-measured cluster.",
    "recommendation": "Ship ONE consolidated spoke covering all storage types with how-to-view sections per type, not five separate thin posts (would fail the thin/templated-content quality gate). Rank #2 of 3. Falsifiable: word count should land in the 1200-1800 spoke range covering 5 subtopics, not ballooning into pillar-length or forking into stub pages per type."
  },
  {
    "title": "Speculative/low-confidence spoke: Dexie.js database inspection",
    "severity": "Low",
    "description": "No dedicated competing content was found in search for 'dexie.js inspect database browser extension' and no volume data is available to size this. Grouped with the querying cluster by product-fit judgement only, not by pairwise SERP overlap against other clusters.",
    "recommendation": "Ship last (#3), only if the export and storage-types posts land first and there is remaining capacity. Do not commit engineering time before validating the first two. Leading indicator: watch for any organic traffic/impressions on the querying post that shows 'dexie' in query terms once GSC access exists."
  },
  {
    "title": "Excluded keyword: 'clear all site data chrome extension' has no topical fit",
    "severity": "Info",
    "description": "SERP for this query returned an entirely different competitor set (Clear Site Data, Clear Browsing Data extensions) with 0 overlap with any IndexedDB/storage-inspection query tested. Different product category and different user intent (bulk data deletion, not inspection).",
    "recommendation": "Do not create content or target this keyword. No dependency, no action."
  }
]
```
