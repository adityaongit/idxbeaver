# Publishing IdxBeaver to Firefox Add-ons (AMO)

The extension source is shared with Chrome. Only the manifest differs, and that
difference is applied after the build by `scripts/release-zip.mjs`, not by
branching `src/manifest.ts`.

---

## 1. Build

```bash
npm run release:zip:firefox
```

That runs `npm run build`, writes `dist-firefox/` (a copy of `dist/` with a
re-stamped `manifest.json`), and zips it to
`releases/idxbeaver-<version>-firefox.zip`.

`dist-firefox/` is gitignored and is also what you load unpacked while testing.

## 2. What the Firefox manifest changes, and why

| Change | Reason |
|---|---|
| `background.service_worker` → `background.scripts: ["service-worker-loader.js"]` | Firefox does not implement service-worker backgrounds. MV3 extensions use non-persistent event pages. `type: "module"` stays, supported since Firefox 112 |
| `minimum_chrome_version` dropped | Chromium-only key |
| `browser_specific_settings.gecko.id` = `idxbeaver@portlabs.in` | AMO requires a stable add-on id |
| `strict_min_version: "140.0"` | The real functional floor is **128**, where `world: "MAIN"` injection landed, and every storage read depends on it. 140 is claimed instead because `data_collection_permissions` is unknown before it, and 140 is the current ESR |
| `browser_specific_settings.gecko.data_collection_permissions: { required: ["none"] }` | Mandatory for new AMO listings. We read page storage but never transmit it |
| `use_dynamic_url` stripped from `web_accessible_resources` | Chromium-only, and unknown keys make the AMO linter noisy |

Everything else carries over unchanged: `devtools_page`, the `activeTab`,
`scripting`, `storage`, `webNavigation`, `cookies` permissions,
`host_permissions: ["<all_urls>"]`, and the extension-pages CSP are all
supported in Firefox.

## 3. Lint before uploading

```bash
npx web-ext lint --source-dir dist-firefox
```

Current state: **0 errors, 3 warnings**, all understood:

- `UNSAFE_VAR_ASSIGNMENT` x2 - `innerHTML` writes inside the minified
  React/CodeMirror bundle. Library code, not ours, and warnings do not block a
  listing.
- `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` - `data_collection_permissions`
  needs Firefox for Android 142. Ignorable: Firefox for Android has no DevTools
  panels, so this add-on has nothing to do there. Do not "fix" it by claiming
  Android support.

Treat any *error* as a release blocker.

## 4. Test it locally

```bash
npx web-ext run --source-dir dist-firefox \
  --firefox="/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox"
```

This launches a temporary profile with the add-on installed. Or, manually:
`about:debugging` → **This Firefox** → **Load Temporary Add-on** →
`dist-firefox/manifest.json`.

Then open DevTools (⌥⌘I / F12) on a page with IndexedDB and pick the IdxBeaver
tab. Background-script errors surface under `about:debugging` → **Inspect**,
not in the page console.

### What to actually check, in this order

The manifest is verified; the runtime is not. These are the places Firefox is
most likely to diverge:

1. **Discovery works at all.** Proves `scripting.executeScript` with
   `world: "MAIN"` plus `func`/`args` serialization behaves as it does in
   Chrome. This is the single load-bearing assumption of the port.
2. **Multi-frame origins.** `webNavigation.getAllFrames` fan-out in
   `src/background/index.ts` merging per-frame databases.
3. **The `inspectedWindow.eval` fallback path** in `src/panel/main.tsx`
   (~`:2954-3009`).
4. **Cookies surface.** `chrome.cookies` maps to `browser.cookies` with the
   same shape, but `sameSite` and partition-key handling differ in detail.
5. **Theme.** `devtools.panels.themeName` exists in Firefox; confirm
   `prefs.theme === "system"` resolves rather than falling back to light.
6. **Host permission revocation.** From Firefox 127, `<all_urls>` is granted at
   install but the user can revoke it per site. Revoke it on a test site and
   confirm the panel shows an error state instead of hanging.

## 5. Submit

1. Sign in at https://addons.mozilla.org/developers/ (free, no registration
   fee, unlike Chrome's $5).
2. **Submit a New Add-on** → choose listed distribution →
   upload `releases/idxbeaver-<version>-firefox.zip`.
3. **Source code is required.** AMO requires a source upload whenever the
   submitted code is minified or bundled, which ours is (Vite + esbuild). Upload
   a repo archive and give reviewers the build steps:

   ```
   npm ci
   npm run release:zip:firefox
   # reviewed artifact: releases/idxbeaver-<version>-firefox.zip
   ```

   Node 20.15+ or 22+ is required (`node:zlib.crc32`).
4. Listing copy: reuse `docs/CHROME_WEB_STORE.md`. AMO additionally wants a
   short summary (250 chars) and at least one screenshot.
5. Privacy: point at `https://idxbeaver.portlabs.in/privacy/`, same as Chrome.

## 6. Version bumps

AMO rejects a re-upload of an existing version, same as Chrome. `version` comes
from `package.json` via `src/manifest.ts`, so `npm version patch` covers both
stores. Keep the Chrome and Firefox version numbers in step; two stores drifting
apart makes bug reports unreadable.
