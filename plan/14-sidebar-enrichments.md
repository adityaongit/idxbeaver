# 14 — Sidebar Enrichments (Lazy Counts, Sizes, Versions)

## Context

Sidebar tree nodes currently only show a name. PRD F-1.2 requires per-node
row counts, size, schema version on databases, and cookie / cache entry
counts. These are not cheap on a large DB — we must fetch lazily (only when
a branch is expanded) and with caching.

## Files to change

- `src/background/index.ts` — new `readStoreSummary` RPC.
- `src/shared/types.ts` — add the summary type.
- `src/panel/main.tsx` — sidebar tree renderer already exists; add expansion
  state + lazy summary fetch with a local cache.
- Depends on Plan 18 for resilient RPC timing (SW restarts).

## Summary shape

```ts
export interface StoreSummary {
  rowCount: number | null;     // from cursor count(); null if failed
  approxBytes: number | null;  // sampled (N rows * avg size)
  sampledRows: number;
}
```

- `approxBytes` is computed in the page world by sampling 100 rows, measuring
  their JSON size, then multiplying by `rowCount / 100`.

## Sidebar behavior

- Collapsed node: only name.
- Expanding a DB: fetch summaries for all stores in parallel; show a spinner
  per store until resolved.
- Summaries cached in-memory for the session (`Map<storeKey, StoreSummary>`).
- Cache invalidated when the user mutates a store (add/update/delete/clear)
  — already covered by the existing `loadIndexedStore` flow; hook the
  cache write there.

## Cookie and cache nodes

- Cookies node count fetched on origin discovery (Plan 11).
- Cache node entry counts fetched when the user expands `Cache Storage`.

## Display

```
myapp_v5
├── users [12,341 rows · 89 MB] (keyPath "id")
├── posts [87,201 rows · 48 MB]
└── cache [3 rows · 120 KB]
```

- On nodes where count is still loading, show a subtle `…`.
- On failure, show `?` with a tooltip that names the error.

## Acceptance

- Expanding a DB triggers a summary fetch that does not block the entire
  panel.
- Mutating a store updates its sidebar numbers within one refresh cycle.
- Nodes with zero rows show `[0 rows]`, not a missing badge.

## Verification

- Manual: expand a DB with a few stores; observe in-flight spinners, then
  resolved numbers, then mutation-triggered updates.
