import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoSeeder } from "@/components/demo-seeder";
import { BRAND_PURPLE, CHROME_WEB_STORE_URL } from "@/lib/brand";
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

const SITE_URL = resolveSiteUrl();
// Keyword-first ordering: "IndexedDB viewer" is the query users actually
// search; "IdxBeaver" has no standalone search volume yet.
const TITLE = "IndexedDB Viewer & Editor for Chrome DevTools — IdxBeaver";
const DESCRIPTION =
  "Free IndexedDB viewer and editor for Chrome DevTools. Browse, query, edit, and export IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage from a database-style data grid.";
const KEYWORDS = [
  "IndexedDB viewer",
  "IndexedDB editor",
  "IndexedDB Chrome extension",
  "view IndexedDB data",
  "edit IndexedDB",
  "export IndexedDB",
  "browser storage inspector",
  "Chrome DevTools extension",
  "LocalStorage editor",
  "Cookies inspector",
  "Cache Storage viewer",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "IdxBeaver",
  keywords: KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "IdxBeaver",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  verification: {
    google: "PKWYf_6WmNLKpXbJMZTJ49YOJDZbBqZns_C1BhJ2xQE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={{ "--color-brand": BRAND_PURPLE } as React.CSSProperties}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="grain">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "IdxBeaver",
              alternateName: "IdxBeaver — IndexedDB Viewer & Editor",
              applicationCategory: "DeveloperApplication",
              applicationSubCategory: "Browser Extension",
              operatingSystem: "Chromium 120+",
              browserRequirements: "Requires a Chromium-based browser, version 120 or newer",
              description: DESCRIPTION,
              url: SITE_URL,
              downloadUrl: CHROME_WEB_STORE_URL,
              installUrl: CHROME_WEB_STORE_URL,
              softwareVersion: APP_VERSION,
              softwareHelp: `${SITE_URL}/faq/`,
              license: "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              // Sourced from the public Chrome Web Store listing. Keep in sync
              // with the live rating — stale values here are a structured-data
              // violation, not just a cosmetic drift.
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "5",
                bestRating: "5",
                worstRating: "1",
                ratingCount: 7,
              },
              author: {
                "@type": "Person",
                name: "Aditya Jindal",
                url: "https://github.com/adityaongit",
              },
              sameAs: [
                "https://github.com/adityaongit/idxbeaver",
                CHROME_WEB_STORE_URL,
              ],
            }),
          }}
        />
        <div className="atmos" />
        <DemoSeeder />
        {children}
      </body>
    </html>
  );
}
