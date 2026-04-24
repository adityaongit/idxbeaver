"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <span
      className="relative h-[22px] w-[22px] shrink-0 rounded-[6px]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 25% 20%, rgba(255,255,255,.35), transparent 55%), linear-gradient(135deg, #F472B6 0%, #8A5CF6 100%)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,.12), 0 2px 10px -2px rgba(244,114,182,.5)",
      }}
    >
      <span
        className="absolute inset-[5px] rounded-[2px]"
        style={{
          background:
            "linear-gradient(rgba(255,255,255,.95),rgba(255,255,255,.95)) 0 20%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.85),rgba(255,255,255,.85)) 0 55%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,.75)) 0 90%/100% 1px no-repeat",
        }}
      />
    </span>
  );
}

function Brand() {
  return (
    <a
      href="#"
      className="flex shrink-0 items-center gap-[10px] text-[15px] font-semibold tracking-[-.02em] text-[var(--color-ink)]"
    >
      <Logo />
      <span>IdxBeaver</span>
      <span className="mx-1 hidden h-4 w-px bg-[var(--color-hair-3)] sm:block" />
      <span className="mono hidden text-[11.5px] font-normal text-[var(--color-ink-mute)] sm:block">
        v1.0
      </span>
    </a>
  );
}

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#query", label: "Query" },
  { href: "#features", label: "More" },
  { href: "#install", label: "Install" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

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

  return (
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
          <Button as="a" href="#" variant="ghost">
            Docs
          </Button>
          <Button as="a" href="#" variant="ghost">
            GitHub
          </Button>
          <Button as="a" href="#install" variant="primary">
            Add to Chrome
          </Button>
        </div>

        {/* Mobile CTA + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button as="a" href="#install" variant="primary" className="hidden sm:inline-flex">
            Add to Chrome
          </Button>
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

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-[min(86vw,360px)] border-l border-[var(--color-hair-2)] bg-[var(--color-bg-2)] shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-[56px] items-center justify-between border-b border-[var(--color-hair)] px-5">
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
          <nav className="flex flex-col gap-1 p-4">
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
              href="#"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-3 text-[14px] text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
            >
              Docs
            </a>
            <a
              href="#"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-3 text-[14px] text-[var(--color-ink-dim)] transition-colors hover:bg-white/[.04] hover:text-[var(--color-ink)]"
            >
              GitHub
            </a>
            <div className="mt-3">
              <Button as="a" href="#install" variant="primary" size="lg" className="w-full">
                Add to Chrome
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </nav>
  );
}
