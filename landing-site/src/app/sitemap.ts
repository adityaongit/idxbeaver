import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/blog";
import { resolveSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const lastModified = new Date();
  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.publishedOn),
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/vs/chrome-devtools-application-panel`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${base}/blog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    ...posts,
    { url: `${base}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
