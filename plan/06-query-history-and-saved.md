# 06 — Query History & Saved Queries

## Context

PRD F-3.3 requires per-origin query history (last 100) and saved queries with
tags and `⌘S` to save. Neither exists today. The query editor keeps nothing
between sessions.

Requested explicitly in-session: keep the MongoDB-style query, just add
persistence around it.

## Files to change

- New file: `src/shared/persisted.ts` — wraps an extension-owned IndexedDB
  database named `storage-studio` with object stores:
  - `history` (keyPath `id`, autoIncrement; indexes: `origin`, `createdAt`)
  - `saved_queries` (keyPath `id`; indexes: `origin`, `updatedAt`)
  - `snapshots` (keyPath `id`; indexes: `origin`, `createdAt`) — used by Plan 15.
- New file: `src/panel/QueryHistoryPanel.tsx`.
- New file: `src/panel/SavedQueriesPanel.tsx`.
- `src/panel/main.tsx` — SQL/Query tab now has a left-rail with History and
  Saved tabs, matching the TablePlus tabs layout in image 64.

## Data model

```ts
export interface HistoryEntry {
  id: string;                 // uuid
  origin: string;
  dbName: string | null;
  storeName: string | null;
  queryText: string;
  createdAt: number;          // epoch ms
  ok: boolean;
  rowCount: number | null;
  durationMs: number | null;
}

export interface SavedQuery {
  id: string;                 // uuid
  origin: string;
  name: string;
  queryText: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

## History write path

- After every `runQuery` resolves (success or failure), append a row to
  `history`.
- On append, trim: `count(history where origin = X) > 100` → delete oldest.
- Record duration by wrapping the RPC in a `performance.now()` pair.

## Saved queries

- `⌘S` handler on the query editor: if query has no saved id, open a small
  inline dialog for `name` + `tags` (comma-separated). If already saved,
  overwrites by id.
- Saved queries list rendered in a left rail inside the query tab:

```
┌────────────────┬────────────────────────────────────┐
│ History        │ [ query editor ]                   │
│ Saved          │                                    │
├────────────────┤                                    │
│  ↓ filter box  │                                    │
│  • active users│                                    │
│    tag:daily   │                                    │
│  • stale drafts│                                    │
│    tag:weekly  │                                    │
└────────────────┴────────────────────────────────────┘
```

- Items can be filtered by tag or name (client-side).
- Right-click on a saved item → Rename / Edit tags / Delete.
- Double-click loads into editor.

## History panel

- Lists last N entries for the current origin, newest first.
- Each row shows a time, a one-line preview of the query, row count, duration.
- Clicking loads the query into the editor.
- `Clear history` button at the bottom.

## Origin scoping

`origin` comes from `discovery?.origin` which is already on `App`. If the user
switches tabs (different origin), history and saved lists re-fetch. No cross-
origin leakage.

## Storage constraints

Per-origin limit is 100 for `history`; saved queries are unlimited (PRD only
gates quantity behind Pro tier, but we don't gate yet). Query payloads are
small; no need for the extension's Blob handling.

## Permissions

Uses the extension's own page-world IndexedDB (accessed via the panel context).
No new manifest permission is needed — the panel page can use `indexedDB`
directly.

## Acceptance

- Running 5 queries populates history; closing + reopening DevTools shows the
  same 5 entries.
- `⌘S` saves and names a query; it appears in the Saved rail and survives
  reload.
- Switching tabs to a different origin shows different lists.

## Verification

- Unit tests on `src/shared/persisted.test.ts` using `fake-indexeddb` (already
  fine to add as a dev dep — small).
- Manual: verify the 100-entry trim works by scripting 110 appends.
