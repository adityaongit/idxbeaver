# 13 — Origin Dashboard

## Context

The `Overview` tab today shows only a small frame+storage summary. PRD F-6.1
requires a proper dashboard: total storage, breakdown by surface, top five
object stores, stale-data markers, and a typed-confirm "Nuke this origin"
control.

## Files to change

- `src/panel/main.tsx` — `Overview` component swap for `OriginDashboard`.
- New file: `src/panel/OriginDashboard.tsx`.
- `src/background/index.ts` — extend discovery to include per-store byte
  estimates and per-DB last-write markers when cheaply derivable.
- Depends on Plans 11 and 12 for cookie and cache bytes.

## Metrics

- **Total usage** — `navigator.storage.estimate()` executed in the page world.
- **Per-surface breakdown** — best-effort:
  - IndexedDB: sum rough sizes from `TableReadResult` samples; extrapolate via
    row count. Fallback to "N databases · M stores".
  - LocalStorage / SessionStorage: sum `key.length + value.length`.
  - Cookies: same.
  - Cache: sum `contentLength` across entries, skipping null entries.
- **Top 5 stores** — sorted by estimated byte size.
- **Stale markers**:
  - Cache entries past max-age (inspect `Cache-Control`).
  - Cookies past `expirationDate` that the browser has not evicted.
  - IndexedDB databases with `lastWriteAt` older than 90 days (needs tracking;
    we only know `version`, so fall back to "no activity seen this session").

## UI

```
┌── Origin: https://app.example.com ─────────────────────┐
│ Total: 184 MB                                          │
│                                                        │
│  IndexedDB ██████████████████████         163 MB       │
│  Cache     ████████                        18 MB       │
│  LocalSt   █                                2 MB       │
│  Cookies   ·                                8 KB       │
│                                                        │
│ Top stores                                             │
│  1. users           34,102 rows       89 MB            │
│  2. posts           12,908 rows       48 MB            │
│  …                                                     │
│                                                        │
│ Stale data                                             │
│  • api-v1 cache: 14 entries past max-age               │
│  • auth-token cookie: expired 2d ago                   │
│                                                        │
│ [ Nuke this origin ]                                   │
└────────────────────────────────────────────────────────┘
```

## Nuke this origin

- Uses Plan 17's typed-confirmation dialog. Requires typing the origin hostname.
- Sequentially:
  1. `chrome.cookies.getAll({ url })` → delete each.
  2. `localStorage.clear()` / `sessionStorage.clear()` in the page world.
  3. `indexedDB.databases()` → `indexedDB.deleteDatabase(name)` for each.
  4. `caches.keys()` → `caches.delete(name)` for each.
- Surfaces progress (N of M done) and any failures in a summary toast.
- "Take snapshot first" toggle (defaulted on when a snapshot backend is
  available, Plan 15) snapshots the whole origin before nuking.

## Acceptance

- Dashboard numbers match independent sanity checks (DevTools' Application
  panel size readout).
- Top-5 list correctly re-orders on changes.
- Nuke requires typing the hostname; partial failures leave the rest intact
  and report clearly.

## Verification

- Manual: open on a heavy PWA, cross-check numbers with DevTools Application.
- Snapshot-before-nuke round-trip: nuke + restore brings the origin back.
