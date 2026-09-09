import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Google_Sans } from "next/font/google";
import "./globals.css";
import { DemoSeeder } from "@/components/demo-seeder";
import { BRAND_PURPLE, CHROME_WEB_STORE_URL } from "@/lib/brand";
import {
  entityRef,
  graph,
  ORG_ID,
  organizationEntity,
  personEntity,
  PERSON_ID,
  websiteEntity,
} from "@/lib/entities";
import { OG_IMAGE_ALT, OG_IMAGE_PATH } from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site";
import { APP_VERSION } from "@/lib/version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Only the Chrome Web Store badge uses this. Loaded from Google's CSS endpoint
// it cost ~950ms of render-blocking time on every page, because that endpoint
// serves a @font-face block for every unicode subset it knows about.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = resolveSiteUrl();
// Keyword-first ordering: "IndexedDB viewer" is the query users actually
// search; "IdxBeaver" has no standalone search volume yet.
const TITLE = "IndexedDB Viewer & Editor for Chrome DevTools — IdxBeaver";
const DESCRIPTION =
  "Free IndexedDB viewer and editor for Chrome DevTools. Browse, query, edit and export IndexedDB, LocalStorage, Cookies and Cache Storage from a data grid.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "IdxBeaver",
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "IdxBeaver",
    type: "website",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  },
  verification: {
    google: "HP9HKPnWV66-wyF9XCjn-FhrcwNcGpcoB6d0j1tWByw",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090A",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${googleSans.variable} antialiased`}
      style={{ "--color-brand": BRAND_PURPLE } as React.CSSProperties}
    >
      <body className="grain">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              graph(
                organizationEntity(),
                websiteEntity(),
                personEntity(),
                {
                  "@type": "SoftwareApplication",
                  "@id": `${SITE_URL}/#software`,
                  name: "IdxBeaver",
                  alternateName: "IdxBeaver — IndexedDB Viewer & Editor",
                  applicationCategory: "DeveloperApplication",
                  applicationSubCategory: "Browser Extension",
                  operatingSystem: "Chromium 120+",
                  browserRequirements:
                    "Requires a Chromium-based browser, version 120 or newer",
                  description: DESCRIPTION,
                  url: `${SITE_URL}/`,
                  downloadUrl: CHROME_WEB_STORE_URL,
                  installUrl: CHROME_WEB_STORE_URL,
                  softwareVersion: APP_VERSION,
                  softwareHelp: `${SITE_URL}/faq/`,
                  license:
                    "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
                  isAccessibleForFree: true,
                  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                  // No aggregateRating here. Google requires rating markup to
                  // reflect a rating rendered on the page carrying it; nothing
                  // on this site displays one. Restore it only alongside a
                  // visible, sourced ratings block.
                  author: entityRef(PERSON_ID),
                  publisher: entityRef(ORG_ID),
                  sameAs: [
                    "https://github.com/adityaongit/idxbeaver",
                    CHROME_WEB_STORE_URL,
                  ],
                },
              ),
            )}}
        />
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[var(--z-skip)] focus-visible:rounded-[8px] focus-visible:bg-[var(--color-bg-2)] focus-visible:px-4 focus-visible:py-2 focus-visible:text-[14px] focus-visible:text-[var(--color-ink)]"
        >
          Skip to main content
        </a>
        <div className="atmos" />
        <DemoSeeder />
        {children}
      </body>
    </html>
  );
}
