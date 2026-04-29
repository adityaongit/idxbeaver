import type { ReactNode } from "react";
import Link from "next/link";

import { ContentShell } from "@/components/content-shell";
import type { BlogPost } from "@/lib/blog";
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
    mainEntityOfPage: `${base}/blog/${post.slug}`,
    datePublished: post.publishedOn,
    dateModified: post.publishedOn,
    author: { "@type": "Person", name: "Aditya Jindal", url: "https://github.com/adityaongit" },
    publisher: { "@type": "Organization", name: "IdxBeaver" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContentShell
        eyebrow={`${formatDate(post.publishedOn)} · ${post.readingMinutes} min read`}
        title={post.title}
        lede={post.description}
      >
        {children}
        <hr className="mt-20 border-t border-[var(--color-hair)]" />
        <p className="mt-8 text-[14px] text-[var(--color-ink-dim)]">
          <Link
            href="/blog"
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
