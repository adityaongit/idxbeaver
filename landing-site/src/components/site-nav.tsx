"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark-128.png"
      alt=""
      width={28}
      height={28}
      className="h-[28px] w-[28px] shrink-0 select-none"
    />
  );
}

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.92.57.1.78-.25.78-.55 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.66.79.55 4.57-1.53 7.85-5.84 7.85-10.92C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

function ChromeStoreIcon({ size = 20 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/chrome-web-store-icon.svg"
      alt=""
      width={size}
      height={size}
      className="shrink-0 select-none"
      style={{ height: size, width: size }}
      draggable={false}
    />
  );
}

function Brand() {
  return (
    <a
      href="/"
      className="flex shrink-0 items-center gap-[10px] text-[15px] font-semibold tracking-[-.02em] text-[var(--color-ink)]"
    >
      <Logo />
      <span>
        <span className="text-[var(--color-brand)]">idx</span>beaver
      </span>
      <span className="mx-1 hidden h-4 w-px bg-[var(--color-hair-3)] sm:block" />
      <span className="mono hidden text-[11.5px] font-normal text-[var(--color-ink-mute)] sm:block">
        v{APP_VERSION}
      </span>
    </a>
  );
}

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#query", label: "Query" },
  { href: "/vs/chrome-devtools-application-panel", label: "Compare" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while drawer open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const drawer = (
    <div
      className={cn(
        "fixed inset-0 z-[60] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-[min(86vw,360px)] flex-col border-l border-[var(--color-hair-2)] bg-[var(--color-bg-2)] shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-[var(--color-hair)] px-5">
          <Brand />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[var(--color-ink)] hover:bg-white/[.06]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-3 text-[15px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
            >
              {l.label}
            </a>
          ))}
          <div className="my-3 h-px bg-[var(--color-hair)]" />
          <a
            href="/about"
            onClick={() => setOpen(false)}
            className="rounded-[8px] px-3 py-3 text-[14px] text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
          >
            About
          </a>
          <a
            href="https://github.com/adityaongit/idxbeaver"
            target="_blank"
            rel="noopener"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-[8px] px-3 py-3 text-[14px] text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
          >
            <GithubIcon />
            <span>GitHub</span>
          </a>
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-[8px] px-3 py-3 text-[14px] text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
          >
            <ChromeStoreIcon size={20} />
            <span>Install</span>
          </a>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[var(--color-hair)] bg-[rgba(8,9,10,.85)] nav-glass">
        <div className="mx-auto flex h-[56px] max-w-[1360px] items-center justify-between px-5 sm:px-6">
          <Brand />

          {/* Desktop links */}
          <div className="mx-auto hidden gap-7 text-[13.5px] font-[450] text-[var(--color-ink-dim)] lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="py-1 transition-colors hover:text-[var(--color-ink)]"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-1 lg:flex">
            <a
              href="https://github.com/adityaongit/idxbeaver"
              target="_blank"
              rel="noopener"
              aria-label="IdxBeaver on GitHub"
              title="Source on GitHub"
              className="flex h-9 items-center gap-2 rounded-[8px] px-2.5 text-[13.5px] font-medium text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.05] hover:text-[var(--color-ink)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.92.57.1.78-.25.78-.55 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.66.79.55 4.57-1.53 7.85-5.84 7.85-10.92C23.5 5.74 18.27.5 12 .5Z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href={CHROME_WEB_STORE_URL}
              target="_blank"
              rel="noopener"
              aria-label="Install IdxBeaver from the Chrome Web Store"
              title="Install from the Chrome Web Store"
              className="flex h-9 items-center gap-2 rounded-[8px] px-2.5 text-[13.5px] font-medium text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.05] hover:text-[var(--color-ink)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/chrome-web-store-icon.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 select-none"
                draggable={false}
              />
              <span>Install</span>
            </a>
          </div>

          {/* Mobile CTA + hamburger */}
          <div className="flex items-center gap-1 lg:hidden">
            <a
              href={CHROME_WEB_STORE_URL}
              target="_blank"
              rel="noopener"
              aria-label="Install IdxBeaver from the Chrome Web Store"
              className="hidden h-9 items-center gap-2 rounded-[8px] px-2.5 text-[13.5px] font-medium text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.05] hover:text-[var(--color-ink)] sm:inline-flex"
            >
              <ChromeStoreIcon size={20} />
              <span>Install</span>
            </a>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[var(--color-hair-2)] bg-white/[.02] text-[var(--color-ink)] transition-colors hover:bg-white/[.06]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
