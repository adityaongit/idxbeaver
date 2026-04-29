import { resolveSiteUrl } from "@/lib/site";

export type Crumb = { name: string; path: string };

/**
 * Build BreadcrumbList JSON-LD for a content page. Pass crumbs in order from
 * the root to the current page, e.g.:
 *   buildBreadcrumbJsonLd([{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }])
 *
 * The resolver prepends "Home" automatically.
 */
export function buildBreadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  const base = resolveSiteUrl();
  const items = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}
