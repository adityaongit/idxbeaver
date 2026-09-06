import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/blog";
import { resolveSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

// next.config.ts sets `trailingSlash: true`, so the non-slashed form of every
// route 308-redirects. Sitemaps must list the final, non-redirecting URL.
function url(base: string, path: string): string {
  return path === "/" ? `${base}/` : `${base}${path}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const lastModified = new Date();
  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: url(base, `/blog/${post.slug}`),
    lastModified: new Date(post.publishedOn),
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  return [
    { url: url(base, "/"), lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: url(base, "/vs/chrome-devtools-application-panel"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: url(base, "/blog"), lastModified, changeFrequency: "weekly", priority: 0.7 },
    ...posts,
    { url: url(base, "/faq"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: url(base, "/about"), lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: url(base, "/privacy"), lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
