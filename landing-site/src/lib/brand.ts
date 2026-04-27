// Single source of truth for brand colors.
// Used by:
//   - app/layout.tsx — injected as the --color-brand CSS variable on <html>
//   - app/opengraph-image.tsx — Satori cannot read CSS variables
//   - any component that needs the raw value at runtime
export const BRAND_PURPLE = "#a78bfa";
