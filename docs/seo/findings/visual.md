# Visual + Image SEO audit — idxbeaver.portlabs.in

Partial report per coordinator instruction: research was cut short twice by turn limits. Screenshots for home, /vs/chrome-devtools-application-panel/, and one blog post WERE captured successfully (custom Playwright script at 1440px/390px, since the bundled `capture_screenshot.py` only offers fixed 1920/375 viewports) and partially reviewed. Everything not explicitly reviewed is marked NOT VERIFIED below. No CWV/Lighthouse/GSC data (environment has no Google API credentials).

## Screenshots captured (exist on disk, reviewed subset noted)

Path: `.../idxbeaver.portlabs.in-audit/screenshots/`
- `home-desktop-fold.png`, `home-desktop-full.png`, `home-mobile-fold.png`, `home-mobile-full.png` — reviewed (fold + full for home).
- `vs-desktop-fold.png`, `vs-desktop-full.png`, `vs-mobile-fold.png`, `vs-mobile-full.png` — only `vs-mobile-fold.png` reviewed. Desktop and full-scroll NOT reviewed.
- `blog-desktop-fold.png`, `blog-desktop-full.png`, `blog-mobile-fold.png`, `blog-mobile-full.png` — only `blog-mobile-fold.png` reviewed. Desktop and full-scroll NOT reviewed.
- `desktop.png` / `mobile.png` — copies of the homepage full-page shots (generic naming contract).

Horizontal-overflow check (`document.documentElement.scrollWidth` vs `clientWidth` at 390px) ran programmatically for all three pages: **no overflow on any of the three** (390 == 390 in each case).

NOT VERIFIED: tap-target pixel measurements, contrast ratios (only eyeballed against dark theme), tablet/laptop viewports, vs/blog page beyond the fold, animation/scroll-reveal states, rendered `<meta property="og:image">` output (source-only inference below).

## Above-the-fold findings

- **Home, 390px**: H1 ("IndexedDB viewer, built like a database client."), subhead, and both CTAs (Chrome Web Store badge + "See the product") visible without scrolling. Pass.
- **Home, 1440px**: same content pass; hero graphic is a decorative mascot illustration, not a product screenshot — first-time desktop visitors see no UI preview until scrolling ~900px to the compare-slider section.
- **/vs/ page, 390px**: H1, intro paragraph, and top of a comparison table visible; **no install CTA visible above the fold** — only an unopened hamburger icon. Contrast with home page where CTA is immediately visible.
- **Blog post, 390px**: date/read-time, H1, dek, first H2+paragraph visible. No image, no CTA above fold — expected for a text-first article, not a defect.

## Image SEO findings (source: `landing-site/src`, cross-checked against screenshots)

1. **OG image is a single shared asset for all 8 live URLs.** Only one `src/app/opengraph-image.tsx` exists (root-level, `force-static`, `size = 1200x630`, `contentType: image/png`). No page under `src/app/vs/`, `src/app/blog/*`, `src/app/faq/`, `src/app/about/` defines its own `opengraph-image.tsx` or an `images` field inside its `openGraph` metadata block (checked all `openGraph:` blocks in those page.tsx files). Next.js's file-convention inheritance means every route without its own generator uses the root one — home, `/vs/chrome-devtools-application-panel/`, all 3 blog posts, `/faq/`, `/about/` likely render an identical social card. **Not confirmed against live rendered HTML** — inferred from source/convention only.
2. **`twitter.card: "summary_large_image"`** is declared in root layout and per-page metadata (vs page, blog posts) but no explicit `twitter.images` anywhere in source — relies on the OG image as fallback per platform spec. Unverified in rendered output.
3. **Product screenshots (compare-slider.tsx) never lazy-load.** `dark.png`/`light.png` `<img>` tags have `decoding="async"` and `fetchPriority="high"` (on the dark one) but no `loading` attribute → both default to eager, despite the section rendering ~900px down the homepage (below the visible fold in `home-desktop-fold.png`).
4. **Product screenshots ~3x oversized for rendered width.** Intrinsic `width={2940} height={1728}`; the compare-slider section renders at roughly 900–940px CSS width in the 1440px desktop screenshot. No `srcset`/`sizes`. AVIF fallback is small (72KB) so real-world cost is muted, but WebP fallback (220KB) and PNG fallback (708KB) ship the same oversized pixel grid to any browser skipping AVIF.
5. **Modern formats: present and correct** for the only real content images on the site — `<picture>` with AVIF → WebP → PNG fallback chain, explicit width/height on all three variants, descriptive alt text (`"IdxBeaver · dark theme — IndexedDB grid view in Chrome DevTools"` / light-theme equivalent). No gaps found here.
6. **Blog posts contain zero images.** Grep for `<img` and markdown image syntax across all 3 posts under `src/app/blog/` returned no matches, corroborated by `blog-mobile-fold.png` showing text-only content. No inline alt-text problems exist (no images to have them), but also no visual content and nothing for Google Images to index from the pages most dependent on organic search.
7. **Hero logo `alt` text is unreachable to assistive tech.** `hero.tsx`: `<img src="/brand/logo-mark-256.png" alt="IdxBeaver" width={256} height={256}>` sits inside a parent `<div aria-hidden="true">`. Every other logo instance (`site-nav.tsx`, `site-footer.tsx`) correctly uses `alt=""` since a visible text wordmark sits beside them — this one is inconsistent: it authored a real alt value but hid it from the accessibility tree.
8. **All other decorative icons correctly use `alt=""`**: Chrome Web Store SVG icon in `cws-install-button.tsx` and both `site-nav.tsx` instances — each sits beside visible text ("Install"/"Chrome Web Store"), so empty alt is correct, not a miss.
9. **Official CWS badge (`cws-badge.tsx`) has correct informative alt** (`"Available in the Chrome Web Store"`), explicit width/height derived from aspect ratio, `decoding="async"`. No `loading` attribute set; component is reused across the site so eager-by-default is likely fine for above-fold placements but unverified for any below-fold reuse.
10. **Orphaned image assets**: `public/screenshots/query.{png,webp,avif}` exist on disk (48–436KB) but grep for `query.png|query.webp|query.avif|screenshots/query` across `src/` found zero references — unused, dead weight. No direct SEO harm, flagged as hygiene only. There's a "Query" nav link, suggesting this was meant to be wired into a section that either shipped without it or was cut.
11. **Explicit width/height present on every `<img>` found in source** (hero, nav, footer, CWS button/badge, compare-slider) — good CLS hygiene across the board, no findings here.
12. **`/vs/` page has zero images of its own** — only shared nav/footer/CWS assets. The entire comparison page is a text/table layout; corroborated by `vs-mobile-fold.png`. Not a defect (comparison tables don't need images) but means no product screenshot reinforces the claims made in the copy on this specific page.

## Images score: 60 / 100

Deduction arithmetic (start 100):
- −10 — single OG image reused across all 8 live URLs including 3 blog posts and the /vs/ page (finding 1)
- −8 — only real content images (product screenshots) never lazy-loaded despite rendering ~900px below the fold (finding 3)
- −8 — product screenshots ~3x oversized vs. rendered width, no srcset/sizes (finding 4)
- −6 — all 3 blog posts contain zero images (finding 6)
- −4 — hero logo alt text authored but unreachable due to `aria-hidden` wrapper (finding 7)
- −3 — orphaned unused image assets in `public/screenshots/` (finding 10)
- −1 — no explicit `twitter.images` anywhere, relies on unverified OG fallback (finding 2)

**Total deductions: 40 → Score: 60/100.**

Offsetting strengths not penalized: full AVIF/WebP/PNG fallback chain on every content image, descriptive/correct alt text everywhere it matters, explicit width/height on every image (no CLS risk), no missing-alt images found anywhere in source.

## Visual verdict

Homepage nails above-the-fold clarity on both viewports and has no layout overflow at 390px. The /vs/ comparison page is the weak link: no install CTA visible without scrolling on mobile, which matters most for a page built to catch high-intent "X vs Y" search traffic. Product screenshots are good quality and well-optimized (AVIF/WebP) but oversized for their display size and never lazy-loaded, and they don't appear on the /vs/ or blog pages at all — visitors landing anywhere except the homepage never see the actual product. Full desktop scroll also shows large gaps between sections that were not investigated (could be un-triggered scroll animations or genuine excess whitespace — flagged, not confirmed).
