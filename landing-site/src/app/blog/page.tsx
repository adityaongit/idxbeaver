import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell, MetaChip } from "@/components/content-shell";
import { BLOG_POSTS } from "@/lib/blog";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { pageMetadata } from "@/lib/seo";

const TITLE = "Blog — IdxBeaver";
const DESCRIPTION =
  "Practical writing on IndexedDB, browser storage, query languages, and the workflows behind IdxBeaver.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/blog",
});

export default function BlogIndexPage() {
  const crumbs = [{ name: "Blog", path: "/blog" }];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <ContentShell
      crumbs={crumbs}
      title="Notes on browser storage."
      lede="Practical writing on IndexedDB, query languages, and the workflows IdxBeaver was built around."
    >
      <ul className="mt-6 space-y-10 list-none ml-0">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <article>
              <div className="mb-3 flex gap-2">
                <MetaChip>{formatDate(post.publishedOn)}</MetaChip>
                <MetaChip>{post.readingMinutes} min read</MetaChip>
              </div>
              <h2 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)] sm:text-[24px]">
                <Link
                  href={`/blog/${post.slug}/`}
                  className="hover:text-[var(--color-brand)]"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[var(--color-ink-dim)]">
                {post.description}
              </p>
              <p className="mt-3 text-[14px]">
                <Link
                  href={`/blog/${post.slug}/`}
                  className="text-[var(--color-ink)] underline decoration-[var(--color-hair-2)] underline-offset-4 hover:decoration-[var(--color-brand)]"
                >
                  Read post
                </Link>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </ContentShell>
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
