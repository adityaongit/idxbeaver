export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedOn: string; // ISO date
  readingMinutes: number;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "debugging-indexeddb-in-chrome-devtools",
    title: "Debugging IndexedDB in Chrome DevTools — the practical guide",
    description:
      "How to inspect, query, and edit IndexedDB from Chrome DevTools — the workflow built into the Application panel, the bits that miss the mark, and what to do about it.",
    publishedOn: "2026-04-29",
    readingMinutes: 8,
  },
  {
    slug: "browser-storage-quotas-explained",
    title: "Browser storage quotas explained: IndexedDB, LocalStorage, Cache, and Cookies",
    description:
      "How much data can you actually store in the browser? A clear-eyed breakdown of per-origin quotas across IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage — with the gotchas that bite local-first apps.",
    publishedOn: "2026-04-29",
    readingMinutes: 7,
  },
  {
    slug: "querying-indexeddb-with-mongo-style-filters",
    title: "Querying IndexedDB with MongoDB-style filters",
    description:
      "IndexedDB's native API is verbose. A MongoDB-style filter language compiles down to the same cursor calls but is dramatically easier to read, share, and debug. Here's how it maps and where it helps.",
    publishedOn: "2026-04-29",
    readingMinutes: 9,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
