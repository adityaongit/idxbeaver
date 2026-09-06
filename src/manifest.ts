import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  // Chrome Web Store search is heavily title-weighted, and the store derives
  // both the listing title and its summary line from these two fields — not
  // from any Dev Console form. Keyword-first ordering is deliberate: "IdxBeaver"
  // shares no tokens with "indexeddb viewer", the query users actually type.
  // Name limit is 45 chars, description 132.
  name: "IndexedDB Viewer & Editor — IdxBeaver",
  description: "IndexedDB viewer and editor for DevTools. Browse, query, edit, and export IndexedDB, LocalStorage, Cookies, and Cache Storage.",
  version: pkg.version,
  minimum_chrome_version: "120",
  devtools_page: "devtools.html",
  icons: {
    "16": "public/icons/icon-16.png",
    "32": "public/icons/icon-32.png",
    "48": "public/icons/icon-48.png",
    "128": "public/icons/icon-128.png"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  permissions: ["activeTab", "scripting", "storage", "webNavigation", "cookies"],
  host_permissions: ["<all_urls>"],
  web_accessible_resources: [
    {
      resources: ["panel.html"],
      matches: ["<all_urls>"]
    }
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  }
});
