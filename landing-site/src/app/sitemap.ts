import type { MetadataRoute } from "next";

import { BLOG_POSTS, postLastModified } from "@/lib/blog";
import { withSlash } from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

// Hand-maintained per route rather than derived from the build, so `lastmod`
// tracks visible content instead of claiming every page changed on every
// deploy. Bump the entry when a route's rendered content changes.
const PAGE_LAST_MODIFIED: Record<string, string> = {
  "/": "2026-09-09",
  "/vs/chrome-devtools-application-panel": "2026-09-09",
  "/vs/indexeddb-viewer-extensions": "2026-09-09",
  "/blog": "2026-09-09",
  "/faq": "2026-09-06",
  "/about": "2026-09-09",
  "/privacy": "2026-04-30",
};

function entry(base: string, path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${base}${withSlash(path)}`,
    lastModified: new Date(PAGE_LAST_MODIFIED[path]),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}${withSlash(`/blog/${post.slug}`)}`,
    lastModified: new Date(postLastModified(post)),
  }));

  return [
    entry(base, "/"),
    entry(base, "/vs/chrome-devtools-application-panel"),
    entry(base, "/vs/indexeddb-viewer-extensions"),
    entry(base, "/blog"),
    ...posts,
    entry(base, "/faq"),
    entry(base, "/about"),
    entry(base, "/privacy"),
  ];
}
