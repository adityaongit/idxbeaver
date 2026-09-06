// Canonical production origin. This is the single source of truth for every
// absolute URL the site emits: canonical tags, OG urls, sitemap, robots,
// llms.txt, and JSON-LD.
//
// Deliberately a hardcoded constant rather than sniffed from the platform's
// deploy env vars. Vercel's VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL report
// the *.vercel.app hostname even when the site is served from a custom domain,
// which silently canonicalised the whole site to the wrong origin. Preview
// deploys pointing their canonicals at production is the desired behaviour —
// it keeps previews from being indexed in place of the real site.
export const SITE_ORIGIN = "https://idxbeaver.portlabs.in";

// Resolve the origin to use for absolute URLs.
// Order: explicit override → production constant → localhost in dev.
export function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return SITE_ORIGIN;
}
