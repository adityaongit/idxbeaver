// Single source of truth for brand colors.
// Used by:
//   - app/layout.tsx — injected as the --color-brand CSS variable on <html>
//   - app/opengraph-image.tsx — Satori cannot read CSS variables
//   - any component that needs the raw value at runtime
export const BRAND_PURPLE = "#a78bfa";

// Chrome Web Store listing — the primary install path for end users.
export const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag?utm_source=item-share-cb";
