import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell } from "@/components/content-shell";
import { BLOG_POSTS } from "@/lib/blog";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";

const TITLE = "Blog — IdxBeaver";
const DESCRIPTION =
  "Practical writing on IndexedDB, browser storage, query languages, and the workflows behind IdxBeaver.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/blog", type: "website" },
};

export default function BlogIndexPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Blog", path: "/blog" }]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <ContentShell
      eyebrow="Writing"
      title="Notes on browser storage."
      lede="Practical writing on IndexedDB, query languages, and the workflows IdxBeaver was built around."
    >
      <ul className="mt-6 space-y-10 list-none ml-0">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <article>
              <p className="mono mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
                {formatDate(post.publishedOn)} · {post.readingMinutes} min read
              </p>
              <h2 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)] sm:text-[24px]">
                <Link
                  href={`/blog/${post.slug}`}
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
                  href={`/blog/${post.slug}`}
                  className="text-[var(--color-ink)] underline decoration-[var(--color-hair-2)] underline-offset-4 hover:decoration-[var(--color-brand)]"
                >
                  Read post →
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
