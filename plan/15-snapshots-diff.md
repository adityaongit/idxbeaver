# 15 — Snapshots & Diff

## Context

User asked for snapshots of stores / databases / origins with diffing. This
is listed as v2 in the PRD but the user wants it in this cycle. The
`chrome.storage.local` quota (~10 MB) is too small for real datasets, so we
back snapshots with the extension's own IndexedDB (unbounded, per PRD
§5.1 rationale).

## Files to change

- New file: `src/shared/persisted.ts` — already introduced in Plan 06,
  this plan adds the `snapshots` object store.
- New file: `src/panel/SnapshotsDialog.tsx` — pick/restore/diff UI.
- New file: `src/panel/DiffView.tsx` — side-by-side diff.
- `src/panel/main.tsx` — commands: `Snapshot…`, `Restore…`, `Diff…` in the
  command palette (Plan 08) and on context menus of DBs/stores/origin.
- `src/background/index.ts` — helpers that dump/restore a store or a DB
  atomically (wrap in a single IDB transaction where possible).

## Snapshot model

```ts
export interface SnapshotManifest {
  id: string;            // uuid
  origin: string;
  scope: "origin" | "database" | "store";
  dbName?: string;
  dbVersion?: number;
  storeName?: string;
  createdAt: number;
  label?: string;
  bytes: number;
  entryCount: number;
}

export interface SnapshotRowChunk {
  id: string;            // uuid, foreign key to manifest.id
  seq: number;           // ordering
  rows: IndexedDbRecord[];
}
```

- Stored in the internal `storage-studio` IDB.
- `snapshots` holds manifests; `snapshot_chunks` holds body rows (50k rows per
  chunk) to keep individual transactions reasonable.
- Deleting a manifest deletes its chunks.

## Capture flow

1. User picks a scope (origin / db / store) from a context menu or palette.
2. Optional label input.
3. Background RPC streams rows from the page world in chunks of 5 k; panel
   writes each chunk to the internal IDB.
4. Manifest finalised at end. Progress toast shown throughout.

## Restore flow

1. User picks a snapshot and confirms (Plan 17 typed-confirm).
2. Existing target data is cleared.
3. Chunks streamed back to page world; `put` each row.
4. On any mid-restore failure, pause and ask the user to abort or retry.

## Diff flow

Three modes:
- Snapshot ↔ current state.
- Snapshot ↔ snapshot.
- Current ↔ snapshot.

Algorithm:

- Build maps keyed by `JSON.stringify(key)`.
- Emit three lists: `added` (key in B but not A), `removed` (A but not B),
  `changed` (both, values differ).
- For `changed`, do a shallow key-by-key JSON diff so the UI can highlight
  which columns differ.

## Diff UI

- Left pane: entries from side A; right pane: side B.
- Rows colored: added (green), removed (red), changed (amber with per-cell
  highlight).
- Filters: show only added / removed / changed.
- Export the diff as JSON for sharing (Plan 16).

## Resource considerations

- Large snapshots (millions of rows) should stream to / from IDB, not load
  fully in memory. The UI exposes "Load full snapshot" vs a count-only
  preview.
- A progress dialog for capture/restore; cancellable (Plan 18 reconnect
  semantics help here).

## Acceptance

- Snapshot a 50k-row store; label it; reload DevTools; snapshot persists.
- Restore overwrites the current store to match the snapshot.
- Diff of snapshot vs. current with two toggled rows highlights them.

## Verification

- Unit tests on the diff algorithm with synthetic `IndexedDbRecord[]` fixtures.
- Manual: snapshot → edit a few rows → diff shows exactly those rows changed.
