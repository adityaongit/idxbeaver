import type { Metadata } from "next";

import { ContentSection, ContentShell } from "@/components/content-shell";
import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { resolveSiteUrl } from "@/lib/site";

const TITLE = "About — IdxBeaver";
const DESCRIPTION =
  "IdxBeaver is built and maintained by Aditya Jindal. The project, the principles, and how to get in touch.";
const PORTFOLIO_URL = "https://adysfolio.vercel.app";
const GITHUB_URL = "https://github.com/adityaongit";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about", type: "profile" },
};

export default function AboutPage() {
  const base = resolveSiteUrl();
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Aditya Jindal",
    url: PORTFOLIO_URL,
    sameAs: [PORTFOLIO_URL, GITHUB_URL, "https://github.com/adityaongit/idxbeaver"],
    knowsAbout: [
      "IndexedDB",
      "Chrome DevTools extensions",
      "Browser storage",
      "Local-first software",
      "Frontend tooling",
    ],
    mainEntityOfPage: `${base}/about`,
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "About", path: "/about" }]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContentShell
        eyebrow="About"
        title="One person, one extension."
        lede={
          <>
            IdxBeaver is built and maintained by{" "}
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener"
              className="underline decoration-[var(--color-hair-2)] underline-offset-4 hover:text-[var(--color-ink)]"
            >
              Aditya Jindal
            </a>
            . The project, the principles, and how to get in touch.
          </>
        }
      >
        <ContentSection title="Why this exists">
          <p>
            I&rsquo;ve worked on local-first apps and offline-capable web
            tools for years, and IndexedDB has always been the part where
            tooling falls off a cliff. Chrome&rsquo;s built-in Application
            panel can list databases and dump records, but the moment you
            need to filter, project, edit at scale, or export — you&rsquo;re
            either pasting cursor code into the console or wishing for a
            real database client. IdxBeaver is that client, sitting inside
            DevTools where you&rsquo;re already debugging.
          </p>
          <p>
            It&rsquo;s deliberately scoped: zero network, zero accounts,
            zero telemetry. The whole thing is{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver"
              target="_blank"
              rel="noopener"
            >
              MIT-licensed
            </a>{" "}
            and runnable from source.
          </p>
        </ContentSection>

        <ContentSection title="About me">
          <p>
            I&rsquo;m a product-minded engineer who likes shipping small,
            well-built tools. Beyond IdxBeaver, you can see other things
            I&rsquo;ve worked on — design, code, writing — at{" "}
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener">
              adysfolio.vercel.app
            </a>
            .
          </p>
          <ul>
            <li>
              <strong>Portfolio:</strong>{" "}
              <a href={PORTFOLIO_URL} target="_blank" rel="noopener">
                adysfolio.vercel.app
              </a>
            </li>
            <li>
              <strong>GitHub:</strong>{" "}
              <a href={GITHUB_URL} target="_blank" rel="noopener">
                github.com/adityaongit
              </a>
            </li>
            <li>
              <strong>Source for IdxBeaver:</strong>{" "}
              <a
                href="https://github.com/adityaongit/idxbeaver"
                target="_blank"
                rel="noopener"
              >
                github.com/adityaongit/idxbeaver
              </a>
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Principles behind IdxBeaver">
          <ul>
            <li>
              <strong>Inspect the inspector.</strong> A tool that reads
              storage data should be auditable end-to-end. Source is open;
              there are no obfuscated bundles.
            </li>
            <li>
              <strong>No network unless you ask.</strong> The extension
              never talks to a server. There are no analytics events, no
              crash reporters, no remote configs.
            </li>
            <li>
              <strong>Stay close to the platform.</strong> The query
              language compiles down to native IndexedDB cursors and
              indexes — no shadow database, no shadow APIs.
            </li>
            <li>
              <strong>Density beats decoration.</strong> The UI is built
              for power users with hundreds of stores and thousands of
              rows. Pinning, resizing, sticky headers, keyboard
              navigation — the things you actually use every day.
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Get in touch">
          <p>
            Bugs, feature requests, and feedback are all welcome on{" "}
            <a
              href="https://github.com/adityaongit/idxbeaver/issues/new"
              target="_blank"
              rel="noopener"
            >
              GitHub Issues
            </a>
            . If you want to install the extension, that lives on the{" "}
            <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener">
              Chrome Web Store
            </a>
            .
          </p>
        </ContentSection>
      </ContentShell>
    </>
  );
}
