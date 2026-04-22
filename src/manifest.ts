import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "IdxBeaver",
  description: "A professional database client for IndexedDB, LocalStorage, and SessionStorage.",
  version: pkg.version,
  minimum_chrome_version: "120",
  devtools_page: "devtools.html",
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
