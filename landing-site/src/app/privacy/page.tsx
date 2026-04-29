import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy — IdxBeaver",
  description:
    "IdxBeaver is a Chrome DevTools extension that runs entirely on your machine. It does not collect, transmit, or share any data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Privacy", path: "/privacy" }]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteNav />
      <main className="mx-auto max-w-[760px] px-5 py-24 sm:px-8 sm:py-32">
        <header className="mb-12">
          <p className="mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
            Last updated · 2026-04-27
          </p>
          <h1 className="text-[40px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[48px]">
            Privacy Policy
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--color-ink-dim)]">
            IdxBeaver is a Chrome DevTools extension for inspecting and editing
            browser storage on pages the developer is actively debugging.
          </p>
        </header>

        <Section title="What data IdxBeaver accesses">
          <p>
            When you use the extension on a page, it reads storage belonging to
            that page:
          </p>
          <ul>
            <li>IndexedDB databases and object stores</li>
            <li>LocalStorage and SessionStorage entries</li>
            <li>Cookies for the origin</li>
            <li>Cache Storage entries</li>
          </ul>
          <p>
            It does this only in response to actions you take in the panel
            (clicking a store, running a query, editing a row, etc.).
          </p>
        </Section>

        <Section title="What data IdxBeaver stores">
          <p>
            The extension stores the following on your machine only, using
            <code> chrome.storage.local</code>:
          </p>
          <ul>
            <li>Your preferences (theme, fonts, sizes, panel layout)</li>
            <li>Your query history (last 100 queries per origin)</li>
            <li>Your saved queries</li>
          </ul>
          <p>
            It also writes to its own private IndexedDB database
            (<code>idxbeaver</code>) on the extension&apos;s origin to persist
            history and saved queries across DevTools sessions.
          </p>
        </Section>

        <Section title="What data IdxBeaver transmits">
          <p>
            <strong>None.</strong> IdxBeaver does not make any network requests.
            No analytics, no telemetry, no crash reporting, no remote
            configuration, no remote code execution. All processing happens
            inside your browser.
          </p>
        </Section>

        <Section title="Third parties">
          <p>
            IdxBeaver does not share data with any third party because it does
            not collect or transmit data in the first place.
          </p>
        </Section>

        <Section title="Permissions">
          <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[200px_1fr]">
            <Permission name="activeTab">
              To operate on the tab the developer has DevTools open for.
            </Permission>
            <Permission name="scripting">
              To run storage-access logic inside the inspected page&apos;s MAIN
              world (the only way an MV3 service worker can read per-origin
              IndexedDB).
            </Permission>
            <Permission name="storage">
              To persist preferences, history, and saved queries via
              chrome.storage.local.
            </Permission>
            <Permission name="webNavigation">
              To detect when the inspected page navigates so the panel can
              refresh its view of the origin&apos;s storage.
            </Permission>
            <Permission name="cookies">
              To power the Cookies browser as an explicit feature of the
              extension.
            </Permission>
            <Permission name="host_permissions: <all_urls>">
              Because DevTools may be opened on any origin the developer is
              debugging.
            </Permission>
          </dl>
        </Section>

        <Section title="Changes">
          <p>
            This policy will be updated in-place when the extension&apos;s data
            practices change. The &ldquo;Last updated&rdquo; date above will
            reflect the latest revision.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Open an issue at{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver/issues"
              className="underline decoration-[var(--color-hair-3)] underline-offset-4 hover:text-[var(--color-ink)]"
            >
              github.com/adityaongit/idxbeaver/issues
            </a>
            .
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-[1.7] text-[var(--color-ink-dim)] [&_code]:mono [&_code]:rounded [&_code]:bg-[var(--color-hair)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

function Permission({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="mono text-[12.5px] text-[var(--color-ink)]">{name}</dt>
      <dd className="text-[14.5px] leading-[1.6] text-[var(--color-ink-dim)] sm:mt-0">
        {children}
      </dd>
    </>
  );
}
