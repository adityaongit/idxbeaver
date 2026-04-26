# 16 — Import / Export Expansion

## Context

Today we only export the current view as JSON or CSV. PRD F-5 calls for:

- Formats: JSON, CSV, NDJSON, SQL-insert script.
- Scopes: current result set, a whole store, a whole DB, an origin archive.
- Import with schema-conflict resolution (merge / replace / cancel).

## Files to change

- New file: `src/shared/export.ts` — format writers.
- New file: `src/shared/import.ts` — parsers + conflict resolver.
- `src/panel/main.tsx` — Export dropdown (seeded by Plan 01) gains new formats
  and a `Scope` selector; Import flow lives in a new dialog.
- New file: `src/panel/ImportDialog.tsx`.

## Export formats

- **JSON** — existing, `[...]` of `{ key, value }`.
- **NDJSON** — one JSON object per line (`{ "key": ..., "value": ... }\n`).
- **CSV** — existing (with nested values stringified).
- **SQL-insert** — `INSERT INTO "<store>" ("col", …) VALUES (…);` per row.
  Use JSON-encoded strings for non-primitive cells. Clearly a best-effort
  format; safe to re-parse only by `src/shared/import.ts`.
- **Origin archive** — `.idxbeaver.zip` containing:
  - `manifest.json` with origin, surface list, version.
  - `indexeddb/<db>/<store>.ndjson` per store.
  - `localStorage.json`, `sessionStorage.json`, `cookies.json`.
  - `cache/<cacheName>.ndjson` with URL + preview (bodies base64).

## Scopes

Implemented as a two-step dropdown in the Export action:

```
Export ▸
  ├ Current view                (Ctrl/Cmd+E)
  ├ Entire store …
  ├ Entire database …
  └ Entire origin (.zip) …
```

Each scope then chooses the format. Blobs / typed arrays round-trip only in
the `.zip` because other formats do not carry binary payload cleanly.

## Import

- Drop zone accepts `.json`, `.ndjson`, `.csv`, `.sql`, `.zip`.
- Parses header / structure to detect scope.
- For store-scoped imports: user picks the target store (can create a new one
  if the DB allows schema evolution).
- For origin-archive imports: summary dialog listing detected stores + counts.
- On import, runs a dry-run diff (Plan 15 machinery) when a store already
  contains data:
  - Merge (rows with matching keys are overwritten; others preserved).
  - Replace (target is cleared first).
  - Cancel.

## Dependencies

- `src/shared/serialize.ts` tagged wire format from Plan 19 — needed so the
  `.zip` archive preserves Dates, Blobs, etc.
- Plan 17's typed confirmation for Replace.

## Acceptance

- Export current view as NDJSON produces one-object-per-line.
- Export a store as `.zip`; import into a freshly wiped store; row counts,
  keys, values match exactly.
- Import a `.zip` at the origin scope into a new origin; every surface
  (IDB, LS, SS, cookies, cache) round-trips.

## Verification

- Unit tests for `export.ts` / `import.ts` round-tripping each format.
- Manual: export → delete store → import → diff should show no changes.
