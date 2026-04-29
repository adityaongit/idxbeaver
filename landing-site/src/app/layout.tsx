import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoSeeder } from "@/components/demo-seeder";
import { BRAND_PURPLE, CHROME_WEB_STORE_URL } from "@/lib/brand";
import { resolveSiteUrl } from "@/lib/site";

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
const TITLE = "IdxBeaver — IndexedDB & storage client for Chrome DevTools";
const DESCRIPTION =
  "Chrome DevTools extension that turns IndexedDB, LocalStorage, Cookies, and Cache Storage into a real database client — TablePlus-style grid, Mongo queries, schema inference.";
const KEYWORDS = [
  "IndexedDB Chrome extension",
  "IndexedDB viewer",
  "IndexedDB editor",
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
      <body className="grain">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "IdxBeaver",
              alternateName: "IdxBeaver — IndexedDB & Storage Inspector",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Chromium 110+",
              description: DESCRIPTION,
              url: SITE_URL,
              downloadUrl: CHROME_WEB_STORE_URL,
              installUrl: CHROME_WEB_STORE_URL,
              softwareVersion: "1.0",
              license: "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
