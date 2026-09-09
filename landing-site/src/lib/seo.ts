import type { Metadata } from "next";

// Next's Metadata merges per top-level key, not deeply. A page that exports its
// own `openGraph` silently drops the file-convention OG image, and one that
// exports `openGraph` without `twitter` inherits the root layout's twitter card
// wholesale. Every page builds its metadata here so neither trap is reachable.

export const OG_IMAGE_PATH = "/og.png";
export const OG_IMAGE_ALT = "IdxBeaver — a database client for browser storage";

// next.config.ts sets `trailingSlash: true`, so the non-slashed form of every
// route 308-redirects. Canonicals, OG urls and JSON-LD must carry the slash or
// they advertise a redirecting URL.
export function withSlash(path: string): string {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Defaults to `title`. Use when the SERP title carries a suffix the card should not. */
  socialTitle?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetadataInput): Metadata {
  const url = withSlash(path);
  const cardTitle = socialTitle ?? title;
  const images = [
    { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: OG_IMAGE_ALT },
  ];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: cardTitle,
      description,
      url,
      siteName: "IdxBeaver",
      type,
      images,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      images,
    },
  };
}
