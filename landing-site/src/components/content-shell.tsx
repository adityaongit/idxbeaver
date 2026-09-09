import type { ReactNode } from "react";
import Link from "next/link";

import type { Crumb } from "@/lib/breadcrumbs";
import { withSlash } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

type ContentShellProps = {
  crumbs: Crumb[];
  title: ReactNode;
  meta?: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
};

/**
 * Shared layout for long-form content pages — blog posts, comparison pages,
 * docs. Mirrors the typography rhythm of the privacy page so the site feels
 * coherent across pages.
 */
export function ContentShell({ crumbs, title, meta, lede, children }: ContentShellProps) {
  const trail: Crumb[] = [{ name: "Home", path: "/" }, ...crumbs];
  return (
    <>
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-[1320px] px-5 py-24 sm:w-[85%] sm:px-8 sm:py-32">
        <header className="mb-12">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="mono flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--color-ink-mute)]">
              {trail.map((c, i) => (
                <li key={c.path} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden="true">/</span> : null}
                  {i === trail.length - 1 ? (
                    <span aria-current="page" className="text-[var(--color-ink-dim)]">
                      {c.name}
                    </span>
                  ) : (
                    <Link href={withSlash(c.path)} className="hover:text-[var(--color-ink)]">
                      {c.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[48px]">
            {title}
          </h1>
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
          {lede ? (
            <p className="mt-5 text-[16px] leading-[1.65] text-[var(--color-ink-dim)] sm:text-[18px]">
              {lede}
            </p>
          ) : null}
        </header>
        <article className="prose-content">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}

export function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="mono rounded-[4px] border border-[var(--color-hair)] bg-white/[.03] px-[8px] py-[3px] text-[11px] text-[var(--color-ink-dim)]">
      {children}
    </span>
  );
}

export function ContentSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-12">
      <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)] sm:text-[24px]">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-[1.72] text-[var(--color-ink-dim)] [&_a]:underline [&_a]:decoration-[var(--color-hair-2)] [&_a]:underline-offset-4 [&_a:hover]:text-[var(--color-ink)] [&_code]:mono [&_code]:rounded [&_code]:bg-[var(--color-hair)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!rounded-none [&_strong]:text-[var(--color-ink)] [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--color-hair)] [&_pre]:bg-[var(--color-bg-2)] [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-[1.6] [&_h3]:mt-8 [&_h3]:text-[18px] [&_h3]:font-medium [&_h3]:text-[var(--color-ink)]">
        {children}
      </div>
    </section>
  );
}
