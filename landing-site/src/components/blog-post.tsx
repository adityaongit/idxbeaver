import type { ReactNode } from "react";
import Link from "next/link";

import { ContentShell, MetaChip } from "@/components/content-shell";
import type { BlogPost } from "@/lib/blog";
import { postLastModified } from "@/lib/blog";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { entityRef, ORG_ID, PERSON_ID } from "@/lib/entities";
import { OG_IMAGE_PATH } from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site";

export function BlogPostShell({
  post,
  children,
}: {
  post: BlogPost;
  children: ReactNode;
}) {
  const base = resolveSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    mainEntityOfPage: `${base}/blog/${post.slug}/`,
    url: `${base}/blog/${post.slug}/`,
    // image is required for Article rich-result eligibility.
    image: [`${base}${OG_IMAGE_PATH}`],
    datePublished: post.publishedOn,
    dateModified: postLastModified(post),
    author: entityRef(PERSON_ID),
    publisher: entityRef(ORG_ID),
    isAccessibleForFree: true,
  };

  const crumbs = [
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContentShell
        crumbs={crumbs}
        title={post.title}
        meta={
          <>
            <MetaChip>{formatDate(post.publishedOn)}</MetaChip>
            <MetaChip>{post.readingMinutes} min read</MetaChip>
          </>
        }
        lede={post.description}
      >
        {children}
        <hr className="mt-20 border-t border-[var(--color-hair)]" />
        <p className="mt-8 text-[14px] text-[var(--color-ink-dim)]">
          <Link
            href="/blog/"
            className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
          >
            ← All posts
          </Link>
        </p>
      </ContentShell>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
