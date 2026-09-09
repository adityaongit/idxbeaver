import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { resolveSiteUrl } from "@/lib/site";

// Stable @id values so the Organization, WebSite and Person emitted on one page
// are understood as the same entities referenced from every other page. Without
// these every page's JSON-LD is a disconnected island.
export const ORG_ID = "#organization";
export const WEBSITE_ID = "#website";
export const PERSON_ID = "#aditya-jindal";

const GITHUB_PROFILE = "https://github.com/adityaongit";
const GITHUB_REPO = "https://github.com/adityaongit/idxbeaver";
const PORTFOLIO_URL = "https://aditya.portlabs.in";

export function entityId(fragment: string): string {
  return `${resolveSiteUrl()}/${fragment}`;
}

export function entityRef(fragment: string): { "@id": string } {
  return { "@id": entityId(fragment) };
}

export function organizationEntity(): Record<string, unknown> {
  const base = resolveSiteUrl();
  return {
    "@type": "Organization",
    "@id": entityId(ORG_ID),
    name: "IdxBeaver",
    url: `${base}/`,
    logo: {
      "@type": "ImageObject",
      url: `${base}/brand/logo-mark-512.png`,
      width: 512,
      height: 512,
    },
    founder: entityRef(PERSON_ID),
    sameAs: [GITHUB_REPO, CHROME_WEB_STORE_URL],
  };
}

export function websiteEntity(): Record<string, unknown> {
  const base = resolveSiteUrl();
  // No potentialAction/SearchAction: the site has no search UI, and claiming one
  // that does not exist is a validation failure rather than a missing feature.
  return {
    "@type": "WebSite",
    "@id": entityId(WEBSITE_ID),
    name: "IdxBeaver",
    url: `${base}/`,
    inLanguage: "en",
    publisher: entityRef(ORG_ID),
  };
}

export function personEntity(): Record<string, unknown> {
  return {
    "@type": "Person",
    "@id": entityId(PERSON_ID),
    name: "Aditya Jindal",
    url: PORTFOLIO_URL,
    sameAs: [PORTFOLIO_URL, GITHUB_PROFILE, GITHUB_REPO],
    knowsAbout: [
      "IndexedDB",
      "Chrome DevTools extensions",
      "Browser storage",
      "Local-first software",
      "Frontend tooling",
    ],
  };
}

/** Wrap entities in a single @graph document so cross-references resolve. */
export function graph(...nodes: Record<string, unknown>[]): Record<string, unknown> {
  return { "@context": "https://schema.org", "@graph": nodes };
}
