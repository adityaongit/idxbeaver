import type { Metadata } from "next";
import { ContentSection, ContentShell } from "@/components/content-shell";
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
      <ContentShell
        eyebrow="Last updated · 2026-04-27"
        title="Privacy Policy"
        lede="IdxBeaver is a Chrome DevTools extension for inspecting and editing browser storage on pages the developer is actively debugging."
      >
        <ContentSection title="What data IdxBeaver accesses">
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
        </ContentSection>

        <ContentSection title="What data IdxBeaver stores">
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
        </ContentSection>

        <ContentSection title="What data IdxBeaver transmits">
          <p>
            <strong>None.</strong> IdxBeaver does not make any network requests.
            No analytics, no telemetry, no crash reporting, no remote
            configuration, no remote code execution. All processing happens
            inside your browser.
          </p>
        </ContentSection>

        <ContentSection title="Third parties">
          <p>
            IdxBeaver does not share data with any third party because it does
            not collect or transmit data in the first place.
          </p>
        </ContentSection>

        <ContentSection title="Permissions">
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
        </ContentSection>

        <ContentSection title="Changes">
          <p>
            This policy will be updated in-place when the extension&apos;s data
            practices change. The &ldquo;Last updated&rdquo; date above will
            reflect the latest revision.
          </p>
        </ContentSection>

        <ContentSection title="Contact">
          <p>
            Email{" "}
            <a
              href="mailto:work.adityajindal@gmail.com"
              className="underline decoration-[var(--color-hair-3)] underline-offset-4 hover:text-[var(--color-ink)]"
            >
              work.adityajindal@gmail.com
            </a>
            .
          </p>
        </ContentSection>
      </ContentShell>
    </>
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
