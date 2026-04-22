# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Type-check then bundle the extension
npm run build

# Watch mode (dev builds, no type-check)
npm run build:watch

# UI preview in browser — no extension APIs needed
npm run dev          # then open http://127.0.0.1:5173/panel.html

# Tests
npm test             # run once (vitest)
npm run test:watch   # watch mode

# Run a single test file
npx vitest run src/shared/query.test.ts
```

After `npm run build`, load `dist/` as an unpacked extension in Chrome DevTools mode.

## Architecture

This is a **Manifest V3 Chrome DevTools extension** packaged with Vite + `@crxjs/vite-plugin`. There is no separate dev server for extension development — you must run `npm run build` and reload the extension.

### Three-process model

```
Chrome DevTools panel (panel.html / src/panel/main.tsx)
    ↕ chrome.runtime port (PanelMessage / PanelReply)
Service worker (src/background/index.ts)
    ↕ chrome.scripting.executeScript (world: "MAIN")
Inspected page (injected inline — no content script file)
```

**Panel** (`src/panel/main.tsx`) — the entire UI. A single React root with a `useStorageRpc()` hook that sends typed `StorageRequest` messages over a persistent port and awaits `StorageResponse` replies. All state lives here; there is no external store.

**Background service worker** (`src/background/index.ts`) — receives RPC requests and routes them to the inspected page via `chrome.scripting.executeScript`. Handles `discover` specially: it scans all scriptable frames in parallel and merges their IndexedDB databases (each frame origin has its own partition). `executeStorageRequest` is a self-contained function injected into the page's MAIN world — it must not reference any module-scope variables.

**Injected logic** — the entire IDB cursor loop, MongoDB-style filter matcher, and KV read/write all run inside `executeStorageRequest` in `background/index.ts`. Serialization of non-JSON types (BigInt, Date, RegExp, Map, Set, ArrayBuffer, Blob, circular references) happens here before values cross the message boundary.

### Shared types (`src/shared/`)

| File | Purpose |
|---|---|
| `types.ts` | All cross-process types: `StorageRequest`, `StorageResponse`, `IndexedDbRecord`, `SerializedCell`, `NoSqlQuery`, etc. |
| `query.ts` | `parseMongoQuery()` — validates and normalises the JSON query string into `NoSqlQuery`. Also has `getPathValue()` for dotted-path access. |
| `filters.ts` | Client-side filter bar: `FilterState`, `FilterRule`, `applyFilters()`, `activeRuleCount()`. Operators applied in the panel, not in the injected script. |
| `indexed.ts` | `keyStrategy()` — infers whether a store uses auto, inline, or out-of-line keys from `IndexedDbStoreInfo`. Used when constructing draft rows. |
| `schemaInfer.ts` | `inferSchema(rows)` — samples up to 500 rows and returns `InferredColumn[]` (name, type, nullable, coverage). Used to power autocomplete and the Structure view. |
| `schemaExport.ts` | `toTypeScript()` / `toDexieSchema()` — exports inferred schema as code. |
| `persisted.ts` | Extension-owned IndexedDB (`storage-studio` DB) for query history and saved queries. History is auto-trimmed to 100 entries per origin. |
| `prefs.ts` | `Prefs` type and `chrome.storage.local` helpers (`getPrefs`, `setPrefs`, `watchPrefs`). Key: `prefs.v1`. |
| `serialize.ts` | Utilities for round-tripping `SerializedCell` values. |

### Panel components (`src/panel/`)

**`main.tsx`** — the entire app. One large `App` component managing all state, RPC calls, and layout. Key patterns:
- `useStorageRpc()` at the top creates the background port. All RPC calls go through this.
- Workspace tabs use a preview/persist model: single-click previews a store, double-click (or command palette navigation) promotes it to a permanent tab.
- `runQuery()` calls `parseMongoQuery()` on the editor text, sends the RPC, and appends to history via `appendHistory()`.
- Global keyboard shortcuts are registered with a ref-based pattern (closure over current state via `globalShortcutRef`) to avoid stale closures without re-registering the event listener.
- IndexedDB is partitioned per origin. Each database is tagged with `origin` + `frameId`; RPC calls must target the correct `frameId`.

**`QueryEditor.tsx`** — CodeMirror 6 editor with three hot-swappable `Compartment`s: theme, completions, hover tooltips. Completions are context-aware via `detectContext()` in `queryCompletions.ts`. Pass `databases` and `inferredColumns` props to enable schema-aware suggestions.

**`queryCompletions.ts`** — `detectContext(text, pos)` walks the text up to the cursor position and returns one of: `top-level`, `store-value`, `field-name`, `operator`, `unknown`. Used by the completion extension to serve the right candidates.

**`shortcuts.ts`** — `SHORTCUTS` const, `matchesShortcut(event, keys)`, `formatKeys(keys)`. The `mod` token maps to `⌘` on Mac, `Ctrl` elsewhere.

### UI component library

shadcn/ui components live in `src/components/ui/`. The path alias `@/` resolves to `src/`. Tailwind CSS v4 (via `@tailwindcss/vite`). CSS variables drive all theming — dark/light is toggled by a class on `<html>`.

### Query language

The MongoDB-style query runs on two levels:
1. **Index hint** — background inspects the filter for single-field equality/range expressions and uses an `IDBIndex` if one exists. The query plan string reports which path was taken.
2. **In-memory filter** — all matched records are re-evaluated with `matchFilter()` (inline in `executeStorageRequest`) for compound/operator expressions not covered by the index.

`sort` always happens in memory after scanning. `project` selects which fields are included in `projected` on each result row.

### Known deferred issues

See `BUGS.md` for a catalogue of known issues with code references.
