import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174
    }
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, "devtools.html"),
        panel: resolve(__dirname, "panel.html")
      }
    }
  }
});
