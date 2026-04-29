# Publishing IdxBeaver to the Chrome Web Store

End-to-end guide for submitting this extension, plus **pre-filled answers** for every form field the Chrome Web Store asks for. Copy/paste-friendly.

---

## 1. One-time setup

1. Sign in at https://chrome.google.com/webstore/devconsole with the Google account that should own the listing.
2. Pay the **$5 one-time developer registration fee**. Covers all extensions under that account.
3. Verify your email. (For a team listing, set up a **Group Publisher** instead of a personal account — lets multiple accounts manage the same extensions.)

## 2. Build the artifact

Every upload must have a **higher `version`** than the one already in the store. Versions are defined in `package.json` and read by `src/manifest.ts`.

```bash
# Bump version first — pick one
npm version patch    # 0.1.0 -> 0.1.1
npm version minor    # 0.1.0 -> 0.2.0
npm version major    # 0.1.0 -> 1.0.0

npm run build

# Zip the dist/ contents (the store wants the folder's contents, not the folder itself)
cd dist && zip -r ../idxbeaver-$(node -p "require('../package.json').version").zip . && cd ..
```

The zip should be **under 10 MB**. If larger, investigate `panel.js` chunk size (currently ~640KB).

## 3. Required assets

- **Icons** — 16×16, 48×48, 128×128 PNGs. Add to `src/manifest.ts` under `icons` and keep the source files in `public/icons/`.
- **Screenshots** — 1280×800 or 640×400 PNG/JPEG. Minimum 1, maximum 5. Use `docs/assets/light_v2.png` / `docs/assets/dark_v2.png` as starting points.
- **Small promo tile** (optional but recommended) — 440×280 PNG.
- **Marquee promo tile** (optional, for featuring) — 1400×560 PNG.

## 4. Privacy policy

**Required** because IdxBeaver reads IndexedDB / LocalStorage / SessionStorage / Cookies from inspected pages. Host it somewhere stable — GitHub Pages, a repo markdown file rendered by GitHub, or a simple static site.

See `docs/PRIVACY.md` (you will need to create this) with the template at the bottom of this file.

## 5. Submit

1. Chrome Web Store Dev Console → **Items** → **+ New item**
2. Upload the zip
3. Fill in the listing (see pre-filled answers below)
4. Fill in the **Privacy practices** tab (see below)
5. Save draft → **Submit for review**

## 6. Review timeline

- **Automated checks**: minutes to a few hours
- **Manual review**: typically 1–3 business days for a first submission; can stretch to 1–2 weeks if the reviewer flags broad permissions
- `<all_urls>` + `scripting` + `cookies` + `devtools_page` is a combination reviewers scrutinize closely — the justifications below are written to preempt their questions

## 7. After approval

- Updates go through the same console: bump version → upload new zip → submit
- Version-only updates usually clear review in hours, not days
- Keep a `CHANGELOG.md` and paste the relevant section into the **"What's new"** field on each update

---

# Pre-filled listing answers

Copy/paste directly into the Dev Console fields.

## Store listing tab

### Name (≤45 chars)
```
IdxBeaver — IndexedDB & Storage Inspector
```
(41 chars. The store allows up to 45; clear-and-descriptive beats clever. Drop to "IdxBeaver" alone if the brand becomes recognizable.)

### Summary (≤132 chars, plain text, no superlatives)
```
Inspect, query, edit, and export IndexedDB, LocalStorage, SessionStorage, cookies, and Cache Storage from Chrome DevTools.
```
(122 chars. States the function in concrete terms; no "best", "fastest", or competitor names.)

### Description (detailed, supports line breaks)

Opening paragraph + bulleted feature list, per Chrome's listing guide. Keywords appear naturally in feature names; do not repeat them to game search rankings.

```
IdxBeaver is a database-style client for browser storage, built into Chrome DevTools. Open DevTools on any page and you get a proper data grid, a query editor, row inspector, schema inference, and import/export for IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage — without leaving the browser.

Chrome's built-in Application panel treats browser storage as an afterthought: no filtering, no schema awareness, no bulk edits, no query history, no exports that survive a page refresh. IdxBeaver turns it into the workflow you already use with a real database client.

Features

• IndexedDB browser — discover every database and object store across every frame of the origin. Inspect records in a zebra-striped grid with column pinning, resizing, sticky headers, and inline editing.

• Query editor with MongoDB-style filters — filter, project, sort, and limit your data with a JSON query language. Index-aware plan selection, with an in-memory fallback for compound operators. The chosen plan is shown alongside results.

• Multi-tab query workspace — keep several queries open at once, each with its own editor and results pane. Save queries you reuse and reopen them in a click.

• Row inspector — per-field editor with type indicators, inline NULL handling, and syntax-highlighted nested JSON. Edit values without writing console code.

• LocalStorage, SessionStorage, Cookies, and Cache Storage browsers — view, add, edit, delete, and clear entries with the same grid UI.

• Import and export — read and write NDJSON, CSV, SQL INSERT statements, and ZIP snapshots. Round-trips non-JSON types including Date, BigInt, Map, Set, Blob, and ArrayBuffer.

• Schema inference — samples rows from a store to power autocomplete and a Structure view. Export the inferred schema as TypeScript types or a Dexie schema definition with one click.

• Snapshots and diffs — snapshot a store or whole database, then restore or diff against it later. Useful for verifying migrations and reproducing bugs.

• Command palette (⌘K) and keyboard shortcuts — jump between stores, tabs, and saved queries without touching the mouse.

• Dark and light themes — configurable UI font, table font (mono or sans), and font size.

Built for

• Frontend developers debugging IndexedDB-backed applications
• Teams working on offline-first or PWA codebases
• Anyone who needs to inspect, edit, or migrate data sitting in browser storage
• Engineers tired of writing one-off console snippets to read or modify storage

Privacy

Everything runs locally on your machine. IdxBeaver makes no network requests: no analytics, no telemetry, no remote configuration. Your preferences, query history, and saved queries are stored using chrome.storage.local and never leave your browser.

Open source

Source code, issue tracker, and changelog: https://github.com/adityaongit/idxbeaver
```

### Category
```
Developer Tools
```

### Language
```
English
```

---

## Privacy practices tab

This tab is where submissions usually get slowed down. Copy these verbatim.

### Single purpose description
```
IdxBeaver is a DevTools panel that lets developers inspect, query, edit, and export browser storage (IndexedDB, LocalStorage, SessionStorage, Cookies, Cache Storage) for the page they are debugging, using a database-client-style workflow.
```

### Permission justifications

#### `activeTab`
```
Required so the DevTools panel can access the page currently being inspected. IdxBeaver only operates on the tab the developer has DevTools open for, never on other tabs.
```

#### `scripting`
```
Required to run the storage-read/write logic (IndexedDB cursor loops, LocalStorage/SessionStorage access, filter matching) in the MAIN world of the inspected page. chrome.scripting.executeScript is the only supported way from an MV3 service worker to execute code in the page's own execution context, which is necessary because IndexedDB data is partitioned per origin and must be read from within that origin.
```

#### `storage`
```
Used with chrome.storage.local to persist user preferences (theme, fonts), query history (last 100 per origin), and saved queries. Stored entirely on the user's machine; never transmitted.
```

#### `webNavigation`
```
Used to detect when the inspected page navigates so the panel can refresh its view of the origin's databases. We listen for navigation events to avoid showing stale database/store lists after the user navigates.
```

#### `cookies`
```
IdxBeaver includes a Cookies browser alongside the IndexedDB/LocalStorage/SessionStorage browsers. The cookies permission is required to read and modify cookies for the inspected origin — this is an explicit feature of the extension.
```

#### `host_permissions: <all_urls>`
```
IdxBeaver is a DevTools extension that works on whichever page the developer opens DevTools on. Because developers debug applications on arbitrary origins (localhost, staging, production), we cannot pre-declare a fixed host list. Access is scoped to the tab currently being inspected via activeTab; <all_urls> simply allows the extension to be usable on any origin a developer might debug.
```

#### `web_accessible_resources: panel.html`
```
The DevTools panel page is loaded from the extension. web_accessible_resources exposes panel.html so Chrome's DevTools host can embed it as the extension's panel.
```

### Data usage disclosures

Tick/untick exactly as below:

| Category | Collected? | Notes |
|---|---|---|
| Personally identifiable information | **No** | |
| Health information | **No** | |
| Financial and payment information | **No** | |
| Authentication information | **No** | |
| Personal communications | **No** | |
| Location | **No** | |
| Web history | **No** | |
| User activity | **No** | |
| Website content | **No** | *The extension reads storage from the inspected page on-demand in response to developer actions, but none of that data is collected, transmitted, or stored outside the user's own browser. Chrome's data disclosure questions concern data the extension itself collects/transmits, which IdxBeaver does not do.* |

### Certifications
Tick all three:

- ☑ I do not sell or transfer user data to third parties, apart from the approved use cases.
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Remote code
```
No, I am not using remote code.
```
(Everything runs from the bundled `dist/` assets. No `eval`, no remote script loading, no WASM from CDNs.)

### Privacy policy URL
Make sure the URL is live before submitting:

- Preferred: `https://indexbeaver.vercel.app/privacy/` (rendered from `landing-site/src/app/privacy/page.tsx`)
- Fallback: `https://github.com/adityaongit/idxbeaver/blob/main/docs/PRIVACY.md`

---

## Distribution tab

### Visibility
Start with **Unlisted** for a soft launch with your team, flip to **Public** once you're happy with feedback:

- **Public** — searchable in the Web Store
- **Unlisted** — only accessible via direct URL (good for beta)
- **Private** — only accessible to specific Google accounts or a group

### Regions
Leave as **All regions** unless you have a reason to restrict.

---

# Privacy policy template

Save as `docs/PRIVACY.md` (top-level — must be linkable from the store listing):

```markdown
# IdxBeaver Privacy Policy

_Last updated: YYYY-MM-DD_

IdxBeaver is a Chrome DevTools extension for inspecting and editing browser
storage on pages the developer is actively debugging.

## What data IdxBeaver accesses

When you use the extension on a page, it reads storage belonging to that page:

- IndexedDB databases and object stores
- LocalStorage and SessionStorage entries
- Cookies for the origin
- Cache Storage entries

It does this only in response to actions you take in the panel (clicking a
store, running a query, etc.).

## What data IdxBeaver stores

The extension stores, on your machine only, using `chrome.storage.local`:

- Your preferences (theme, fonts, sizes)
- Your query history (last 100 queries per origin)
- Your saved queries

## What data IdxBeaver transmits

**None.** IdxBeaver does not make any network requests. No analytics, no
telemetry, no crash reporting, no remote configuration. All processing
happens inside your browser.

## Third parties

IdxBeaver does not share data with any third party because it does not
collect or transmit data in the first place.

## Changes

This policy will be updated in-place when the extension's data practices
change. Check the "Last updated" date above.

## Contact

Open an issue at https://github.com/adityaongit/idxbeaver/issues
```

---

# Pre-submission checklist

- [ ] `package.json` version bumped above the store's current version
- [ ] `npm run build` succeeds with no errors
- [ ] `dist/` zipped; zip size < 10 MB
- [ ] Icons (16/48/128) present and referenced in `src/manifest.ts`
- [ ] At least one 1280×800 screenshot ready
- [ ] `docs/PRIVACY.md` committed and reachable via public URL
- [ ] Permission justifications copied into the form
- [ ] Unlisted visibility chosen for first submission (flip to Public after vetting)
- [ ] Submitted; check email for reviewer follow-ups
