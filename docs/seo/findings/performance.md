# Performance / Core Web Vitals audit — idxbeaver.portlabs.in

All numbers below are **lab data** (Lighthouse 13.4.1 CLI, mobile emulation, default
"simulate" throttling: 4x CPU slowdown, slow-4G network — the same profile PSI mobile
uses). **No CrUX field data available** (no Google API credentials per audit context) —
these are single-run lab measurements, not 75th-percentile field distributions. INP has
no lab equivalent; **Total Blocking Time (TBT) is used as an INP proxy** per Lighthouse's
own guidance. FID is not referenced anywhere in this report (deprecated, removed from
Chrome tooling Sept 2024).

Pages measured: `/` (home), `/vs/chrome-devtools-application-panel/`, and
`/blog/debugging-indexeddb-in-chrome-devtools/`. Raw Lighthouse JSON saved at
`lighthouse/home.json`, `lighthouse/vs.json`, `lighthouse/blog.json` in this audit
directory.

## Measured results

| Metric | Home `/` | `/vs/chrome-devtools-application-panel/` | `/blog/debugging-indexeddb-in-chrome-devtools/` | Threshold |
|---|---|---|---|---|
| Lighthouse Performance score | **80/100** | 86/100 | 93/100 | — |
| LCP | **4.38 s — POOR** | 3.42 s — Needs Improvement | 2.94 s — Needs Improvement | good ≤2.5s, poor >4.0s |
| LCP element | `<h1>` "IndexedDB viewer, built like a database client." (text) | `<p>` intro copy (text) | `<h1>` post title (text) | — |
| CLS | 0 — **Good** | 0 — **Good** | 0 — **Good** | good ≤0.1 |
| TBT (INP proxy) | 19.5 ms — **Good** | 10.5 ms — **Good** | 0 ms — **Good** | good ≤200ms (INP) |
| FCP | 2.80 s | 2.76 s | 1.97 s | good ≤1.8s |
| TTFB (server-response-time audit) | 56 ms | 83 ms | 186 ms | good ≤800ms |
| Total transfer weight | 530 KB / 23 requests | 309 KB / 19 requests | 275 KB / 19 requests | — |

### LCP subparts (Lighthouse `lcp-breakdown-insight`, trace-based/observed — note: this
runs on the **unthrottled** raw trace, so its ms values are on a different basis than the
Lantern-**simulated** LCP total above; use it for proportions/root-cause, not for summing
to the simulated total). All three LCP elements are **text**, so there is no
"resource load delay" / "resource load duration" subpart (those only exist for
image/video LCP elements needing a discrete fetch) — only TTFB and element render delay
apply here:

| Page | TTFB | Element render delay |
|---|---|---|
| Home | 141 ms | 1,195 ms |
| /vs/ | 178 ms | 1,495 ms |
| Blog | 367 ms | 539 ms |

Element render delay is dominated by render-blocking resources (below), not by slow
paint work — TBT is near-zero on all three pages.

## Root cause (measured, high confidence)

`landing-site/src/app/layout.tsx` (root layout, applies to **every page**):

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap"
/>
```

Lighthouse `render-blocking-insight` flags this exact URL as render-blocking on all
three pages, with estimated savings of **965 ms (home), 907 ms (/vs/), 1,050 ms
(blog)** — this is the single largest contributor to the "element render delay"
subpart above.

Grep of the whole `landing-site/src` tree shows "Google Sans" is used in exactly one
place: `src/components/cws-install-button.tsx`, `FONT_STACK = '"Google Sans", ...'`,
applied to two small text labels ("Available in the" / "Chrome Web Store") inside the
install CTA badge. It is not the site's body font — that's Geist, already correctly
self-hosted via `next/font/google` with `display: "swap"` and preloaded
(`<link rel="preload" ... /_next/static/media/...woff2 ... as="font">` present in the
served HTML). So the whole site pays a synchronous 3-hop network round trip
(preconnect → CSS → woff2, ~39.5 KB total) to render two small labels in one button,
and that link sits ahead of first paint on every page including ones where the LCP
element (H1/P) doesn't use that font at all.

## Other measured issues

**Homepage hero image oversized** (`image-delivery-insight`, home only): `dark.avif`
screenshot served at 2940×1728 for a 370×217 CSS display box — 71.1 KB of its 72.3 KB
transfer size is waste. Already AVIF (right format), not the LCP element, so this is a
page-weight/bandwidth finding, not an LCP finding.

**Nav logo oversized + wrong format, on every page** (`/vs/` and blog measured, same
markup ships site-wide): `<img src="/brand/logo-mark-128.png" width="28" height="28">`
serves a 128×128 PNG (21.5 KB) into a 28×28 box. Lighthouse: 18.8 KB of the waste is
format (PNG vs WebP/AVIF/SVG), the rest is oversampling. Has explicit `width`/`height`
so it isn't a CLS risk, purely a bytes-on-every-page-load issue.

**Legacy JavaScript polyfills**, all three pages, same 14 KB: core-js shims for
`Array.prototype.at`, `Array.prototype.flat`, `Array.prototype.flatMap`,
`Object.fromEntries` in `_next/static/chunks/0qdhffl67z8q6.js` — all natively supported
in every browser Next.js's own `browserslist` default targets since 2020. Suggests the
build's JS target/browserslist config is more conservative than needed.

## Confirmed passes (no finding)

- CLS: 0 on all three pages measured — no layout-shift problem detected.
- TBT/INP proxy: 0–19.5 ms on all three pages, an order of magnitude under the 200 ms
  "good" INP threshold — no interactivity problem detected.
- TTFB: 56–186 ms on all three pages, well under the 800 ms "good" guidance — Vercel
  edge serving is not a bottleneck.
- Cache headers: Lighthouse `cache-insight` returned zero flagged requests on all three
  pages — static assets already carry adequate cache lifetimes.
- Body font (Geist): correctly implemented via `next/font/google`, self-hosted,
  preloaded, `display: swap` — this is the pattern the Google Sans font should copy.

## Not measured / out of scope this run

- `/blog/`, `/blog/browser-storage-quotas-explained/`,
  `/blog/querying-indexeddb-with-mongo-style-filters/`, `/faq/`, `/about/`, `/privacy/`
  — not run through Lighthouse this session (turn-limited). Same template/layout as the
  pages measured, so the render-blocking-font finding almost certainly applies to them
  too, but that is inference, not a direct measurement, and is flagged as such.
- Desktop strategy not measured (mobile only, matching PSI's default/primary surface).
- No PSI API / CrUX field data (rate-limited / no credentials) — all numbers here are
  single lab runs, not 75th-percentile distributions.

## Findings (JSON)

```json
[
  {
    "title": "Site-wide render-blocking Google Fonts stylesheet for a two-label CTA button",
    "severity": "Critical",
    "description": "layout.tsx loads https://fonts.googleapis.com/css2?family=Google+Sans... as a render-blocking <link rel=stylesheet> on every page. Lighthouse render-blocking-insight measures 965ms (home), 907ms (/vs/), 1050ms (blog) of estimated savings from this single request. Grep confirms 'Google Sans' is used only in cws-install-button.tsx for two small labels inside the install CTA badge, not the body font (Geist, already self-hosted via next/font).",
    "recommendation": "Load Google Sans via next/font/google (self-hosted, no external round trip) like Geist already is, or defer the current <link> to non-blocking (preload+onload swap / media=print trick) since it's below-the-fold/non-LCP content on all three measured pages. Unblocks: LCP finding below (this is its dominant cause). Falsifiable via: re-run Lighthouse render-blocking-insight after the change and confirm the fonts.googleapis.com entry disappears from render-blocking requests. Leading indicator to monitor: LCP element-render-delay subpart in lcp-breakdown-insight should drop by roughly the same ~900-1050ms measured here."
  },
  {
    "title": "LCP fails 'good' on homepage, misses on inner pages (lab, mobile, simulated throttling)",
    "severity": "Critical (home), High (inner pages)",
    "description": "Measured LCP: home 4.38s (poor, >4.0s threshold), /vs/ 3.42s and blog 2.94s (both needs-improvement, 2.5-4.0s band). All three LCP elements are text (H1/P), not images. CLS=0 and TBT<20ms on all three, so the bottleneck is isolated to time-to-paint, not layout or interactivity.",
    "recommendation": "Fix the render-blocking Google Fonts request first (root cause above) since element-render-delay (1195/1495/539ms) is the dominant chunk of each page's non-TTFB LCP time and that request is squarely in the critical rendering path. This is a lab measurement from a single Lighthouse run under Lantern-simulated slow-4G/4x-CPU, not a 75th-percentile field number - re-verify with PageSpeed Insights field data (CrUX) once traffic/API access allows. Falsifiable via: re-run Lighthouse after the font fix; expect LCP to drop toward 2.5-3.5s range as element-render-delay shrinks by ~900-1000ms. Leading indicator: LCP score band in Lighthouse (numeric-value under lcp audit) and, once available, CrUX 75th-percentile LCP for these URLs."
  },
  {
    "title": "Homepage hero screenshot oversampled 8x its display size",
    "severity": "Medium",
    "description": "dark.avif served at 2940x1728 into a 370x217 CSS box on the homepage. Lighthouse image-delivery-insight: 71.1KB of 72.3KB transfer is waste. Already AVIF (correct format) and not the LCP element, so this is a page-weight issue, not an LCP issue.",
    "recommendation": "Serve responsive sizes (srcset/sizes or next/image with explicit sizes prop) so the browser fetches a variant close to 370x217 on mobile. Independent of the font fix, no dependency either way. Falsifiable via: image-delivery-insight wastedBytes for this URL should drop to near zero after adding responsive sizing. Leading indicator: total-byte-weight audit for '/' should drop by roughly 70KB (~13% of current 530KB)."
  },
  {
    "title": "Nav logo shipped oversized PNG on every page",
    "severity": "Medium",
    "description": "/brand/logo-mark-128.png (21.5KB) displayed at 28x28 via <img width=28 height=28> but served at 128x128 PNG. Measured on /vs/ and the blog post (shared nav, so it loads on every page site-wide). Lighthouse: 18.8KB of the waste is format (PNG vs WebP/AVIF/SVG), the remainder is oversampling. width/height are set, so no CLS risk.",
    "recommendation": "Since the codebase already ships an SVG for the Chrome Web Store icon (chrome-web-store-icon.svg), convert this logo mark to SVG too if it's vector-friendly, or export a 28x28 (56x56 for 2x DPR) WebP/AVIF. Small in absolute bytes per page but multiplies by every pageview across the whole site, so ROI is in aggregate bandwidth/CDN cost, not single-page LCP/INP/CLS. Falsifiable via: image-delivery-insight should stop flagging this URL post-fix. Leading indicator: transfer size of this single request should drop from ~21.5KB to low single-digit KB."
  },
  {
    "title": "Legacy JS polyfills shipped unnecessarily (core-js shims)",
    "severity": "Low",
    "description": "14KB of core-js polyfills (Array.prototype.at/flat/flatMap, Object.fromEntries) present in _next/static/chunks/0qdhffl67z8q6.js on all three pages measured, per Lighthouse legacy-javascript-insight. All four are natively supported in every browser under Next.js's default modern browserslist target.",
    "recommendation": "Check for a custom browserslist/tsconfig target or babel config overriding Next's default modern output; align it with Next's default (evergreen browsers) to drop the polyfills. Theoretical impact is small (14KB, TBT already near-zero) - low priority, do after the font and image fixes above. Falsifiable via: legacy-javascript-insight wastedBytes for this chunk should go to 0. Leading indicator: chunk 0qdhffl67z8q6.js transfer size drop of ~14KB."
  }
]
```
