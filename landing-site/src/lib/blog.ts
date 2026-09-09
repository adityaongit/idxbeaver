export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedOn: string; // ISO date
  /** Set only when a published post is materially revised. Drives dateModified. */
  updatedOn?: string;
  readingMinutes: number;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-edit-indexeddb-values-in-chrome",
    title: "How to edit IndexedDB values in Chrome",
    description:
      "Chrome's Application panel will not let you change IndexedDB records. Three ways to actually edit a value: a console one-liner, a snippet, or an editable grid.",
    publishedOn: "2026-09-09",
    readingMinutes: 9,
  },
  {
    slug: "exporting-indexeddb-data",
    title: "Exporting IndexedDB data to JSON, CSV, and SQL",
    description:
      "How to get data out of IndexedDB and back in again, including the types that break naive exports: Date, BigInt, Map, Set, Blob, and circular references.",
    publishedOn: "2026-09-09",
    readingMinutes: 8,
  },
  {
    slug: "browser-storage-types-explained",
    title: "Browser storage types explained",
    description:
      "IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage each solve a different problem. What each is for, and the limits that matter.",
    publishedOn: "2026-09-09",
    readingMinutes: 9,
  },
  {
    slug: "debugging-indexeddb-in-chrome-devtools",
    title: "Debugging IndexedDB in Chrome DevTools",
    description:
      "How to inspect, query, and edit IndexedDB from Chrome DevTools: the workflow built into the Application panel, where it falls short, and what to do about it.",
    publishedOn: "2026-04-29",
    readingMinutes: 8,
  },
  {
    slug: "browser-storage-quotas-explained",
    title: "Browser storage quotas explained",
    description:
      "How much can you actually store in the browser? Per-origin quotas across IndexedDB, LocalStorage, Cookies, and Cache Storage, and the gotchas that bite.",
    publishedOn: "2026-04-29",
    readingMinutes: 7,
  },
  {
    slug: "querying-indexeddb-with-mongo-style-filters",
    title: "Querying IndexedDB with MongoDB-style filters",
    description:
      "IndexedDB's native query surface is get, getAll and cursors. A MongoDB-style filter layer compiles to the same calls: how it maps, and where it helps.",
    publishedOn: "2026-04-29",
    readingMinutes: 9,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function postLastModified(post: BlogPost): string {
  return post.updatedOn ?? post.publishedOn;
}
