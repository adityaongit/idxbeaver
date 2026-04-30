import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

type ContentShellProps = {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
};

/**
 * Shared layout for long-form content pages — blog posts, comparison pages,
 * docs. Mirrors the typography rhythm of the privacy page so the site feels
 * coherent across pages.
 */
export function ContentShell({ eyebrow, title, lede, children }: ContentShellProps) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[760px] px-5 py-24 sm:px-8 sm:py-32">
        <header className="mb-12">
          {eyebrow ? (
            <p className="mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[48px]">
            {title}
          </h1>
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
