import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoSeeder } from "@/components/demo-seeder";
import { BRAND_PURPLE } from "@/lib/brand";

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

// Resolve the deployed origin at build time so canonical / og:url match the host.
// Order: explicit override → Netlify → Vercel (prod, then preview) → localhost.
function resolveSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL || // Netlify production
    process.env.DEPLOY_PRIME_URL || // Netlify deploy previews
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (fromEnv) return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  return "http://localhost:3000";
}

const SITE_URL = resolveSiteUrl();
const TITLE = "IdxBeaver — A database client for browser storage";
const DESCRIPTION =
  "Native-feeling database client for IndexedDB, LocalStorage, Sessions, Cookies and Cache — inside Chrome DevTools. Mongo-style queries, dense grid.";

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
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  verification: {
    google: "ZnpXsLB28gEL5MvEeNaEz6nhPNpCSnVMzcbrbx3H7qY",
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
        <div className="atmos" />
        <DemoSeeder />
        {children}
      </body>
    </html>
  );
}
