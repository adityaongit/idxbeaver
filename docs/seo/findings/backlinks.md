# Backlink Profile — idxbeaver.portlabs.in

Date: 2026-09-09. **Tier 0 only** (Common Crawl + local verification crawler). No Moz, Bing, or DataForSEO — confirmed via `claude-seo run backlinks_auth.py --check --json` (`"tier": 0`, moz/bing both `"available": false`, no key configured). No DA/PA, no referring-domain counts, no spam score, no link-velocity data exist for this report. Any of those numbers would be invented — not reported.

## Score: INSUFFICIENT DATA (not a numeric score)

Per audit policy: at tier 0, fewer than 4 of the 7 scoring factors (referring domains, domain quality distribution, anchor naturalness, toxic ratio, link velocity, follow/nofollow ratio, geographic relevance) have any data source. Only two factors have partial evidence (a handful of verified individual links, and their follow/nofollow status). A 0-100 Backlink Health Score would misrepresent confidence. Reporting insufficient data instead.

## What was actually checked

### 1. Common Crawl domain-level graph — both domains absent

`claude-seo run commoncrawl_graph.py idxbeaver.portlabs.in --json`:
```
"in_crawl": false, "in_rankings": false, "pagerank": null, "harmonic_centrality": null,
"note": "Domain not found in Common Crawl data. It may be too new, too small, or not yet crawled."
```
Source: Common Crawl web graph, `cc-main-2026-jan-feb-mar` release (quarterly, see https://commoncrawl.org/web-graphs). Confidence: 0.50 (methodology), but the actual result here is **no data**, not a low score.

`claude-seo run commoncrawl_graph.py portlabs.in --json` — identical result: `in_crawl: false`, no PageRank, no harmonic centrality. The parent/root domain (`portlabs.in`) is also absent from Common Crawl.

**Subdomain-vs-root-domain implication:** `idxbeaver.portlabs.in` sits on a subdomain of `portlabs.in`, the developer's personal portfolio. Since CC shows zero domain-level signal for *either* the subdomain or the root, there is no evidence the subdomain is inheriting or borrowing authority from the parent — the parent itself has none to lend, by this measurement. This is neither a help nor a dilution by the numbers available; it just means the product currently sits on an unproven apex domain and has to build its own independent link profile rather than benefiting from an established root domain's trust. (Google generally evaluates subdomains largely on their own signals post-2018 "site diversity" changes anyway, so this matches expectation — flagged as informational, not a defect.)

### 2. Known inbound links — verified live with `verify_backlinks.py`

Ran `claude-seo run verify_backlinks.py --target https://idxbeaver.portlabs.in --links <3 candidate URLs> --json` against: the Chrome Web Store listing, the GitHub repo, and the portfolio project page. All 3/3 verified as live and pointing at the correct target (summary: `"verified": 3, "lost": 0, "moved": 0`).

| Source | Status | Anchor text | rel attributes | Note |
|---|---|---|---|---|
| Chrome Web Store listing (`chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag`) | verified, HTTP 200 | `https://idxbeaver.portlabs.in/` (exact-URL, appears twice: top link + Developer field) | `ugc nofollow` | Nofollow by Google policy, standard for all CWS listings. Discovery/referral value only, no link equity. |
| GitHub repo About sidebar (`github.com/adityaongit/idxbeaver`) | verified, HTTP 200 | `idxbeaver.portlabs.in` (the repo's "Website" field, confirmed present in raw HTML via full-output fetch, not the truncated JSON preview) | `noopener noreferrer nofollow` | Nofollow, but high-trust host (github.com) and exact-domain branded anchor — good for AI-citation surfaces and discovery even without link equity. Repo topics set: `chrome-extension`, `database-viewer`, `indexeddb` (aid discovery, not backlinks). README body itself has no link back to the site — only the sidebar "Website" field does. |
| Portfolio project page (`aditya.portlabs.in/projects/idxbeaver`) | verified, HTTP 200 | "View live" (generic CTA, not descriptive) | `noopener noreferrer` — **no nofollow**, i.e. followed | Only followed link found. But this is a same-registrant, same-owner link (author's own portfolio subdomain linking to his own product subdomain) — a structural/navigational link, not an independent third-party endorsement. Should not be counted as external backlink-profile strength.

**Net position: zero independent (non-owned, non-directory) backlinks confirmed.** All three verified links are either owned-property cross-links or a free listing's standard nofollow developer-URL field. This is expected/normal for a brand-new, unlaunched-at-scale project — not itself a defect.

### 3. What was NOT checked (explicit)

- No referring-domain count, no domain authority/spam score (tier 0 has no source for these — Moz/Bing/DataForSEO all unavailable).
- No search for *unknown* third-party backlinks (e.g., a site:-style discovery of who else already links in) — tier 0 has no crawl index large enough to do this beyond the Common Crawl domain graph, and that graph doesn't list this domain at all, so no inbound edges are enumerable.
- No anchor-text distribution analysis beyond the 3 verified links above (sample too small, one source, no aggregate index).
- No historical/velocity data (no source at any tier without DataForSEO).
- Did not check StackOverflow, Reddit, Hacker News, or dev.to for existing organic mentions — that would require live search, out of scope for tier 0 link verification (it targets *known* candidate URLs, not discovery search). Flagging this as an unchecked surface, not an assumed-zero.

---

## Link-acquisition plan (free, MIT-licensed dev tool — no link schemes)

Ranked by effort-to-payoff for a project at this stage (zero independent backlinks, real utility, no budget, no existing audience).

**Tier A — near-zero effort, do first:**
1. **Awesome-lists** (`awesome-chrome-devtools`, `awesome-indexeddb`-adjacent lists if any exist, general `awesome-devtools`/`awesome-chrome-extensions`). PR-based, one-line entry + one-sentence description. High trust (github.com), typically nofollow but strong discovery + citation value. Low effort, moderate payoff, do this batch first since the GitHub repo is already public with a clean README.
2. **Chrome extension roundup/directory submissions** (the free, non-paid kind — e.g. community-run "best DevTools extensions" lists, not paid directories). Same profile as awesome-lists: cheap, nofollow, discovery-driven.

**Tier B — moderate effort, real payoff if genuine:**
3. **StackOverflow answers** where IndexedDB/DevTools debugging questions are already asked and the tool is a genuinely relevant answer (not a drive-by mention). This is the single highest-intent surface for this tool's exact use case — people asking "how do I query/filter IndexedDB in DevTools" are the target user. Requires finding real threads and writing real answers, not just link-dropping. rel=nofollow on SO links but very high click-through/trial value, which is what actually matters at this stage more than link equity.
4. **One well-written dev.to or Hashnode post** genuinely explaining an IndexedDB debugging workflow (the landing site already has 3 blog posts covering this ground — repurpose, don't duplicate). These platforms have their own domain authority and get indexed fast; natural link back to the tool in context.

**Tier C — higher effort / lower certainty, worth trying once tool has some traction:**
5. **Reddit r/webdev / r/chrome_extensions / r/typescript** — a genuine "I built this" or "here's a debugging trick" post, not a link drop. High risk of removal if it reads as promotional; only do this once there's a specific angle (e.g., a release, a specific bug it solves) rather than cold self-promo.
6. **Hacker News Show HN** — one-shot, high variance (can 10x traffic or get zero traction), but zero cost beyond writing a good title/first comment. Worth one attempt at a meaningful milestone (e.g., v1.0, a notable feature).
7. **Dexie.js / IndexedDB ecosystem docs** — genuinely useful only if the tool gets mentioned in a "tools" or "see also" section of an adjacent open-source project's docs/README (e.g., Dexie, idb, other IndexedDB wrapper libs). Requires either a PR to their docs repo (if they accept such PRs) or organic pickup by their maintainers — not something to force.

**Not recommended:** paid directories, reciprocal-link exchanges, guest-post link farms, or any scheme that trades content for a placed link. None of these fit "free MIT dev tool" positioning and all carry toxic-link risk with zero ability to audit for it at tier 0.

**Sequencing:** 1 and 2 are pure backlog items (do anytime, ~30 min each). 3 is the best use of time this week — it's simultaneously a link surface and the actual acquisition channel. 4 reuses existing blog content. 5-6 are one-shot moments, save for a real milestone. 7 is opportunistic, not schedulable.
