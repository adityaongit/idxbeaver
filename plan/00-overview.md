# 00 — Overview & Roadmap

## Context

IdxBeaver is currently ~45% of the v1 PRD. The session that produced this
plan bundle was triggered by a gap audit: the team wants to know exactly what
still needs building to marry the PRD and the TablePlus UI we are modelling.
This overview groups the per-feature plans into coherent delivery phases so
nothing slips between the cracks.

The MongoDB-style query language stays. The delta is: UI faithfulness to
TablePlus, cross-surface coverage (Cookies, Cache), the persistence layer
(history, saved queries, snapshots, settings), and the polish work the PRD
calls out (virtualization, command palette, theme inheritance, a11y, CSP).

## Phased roadmap

Phases are sized so each one delivers visible value. Parallelism notes assume
roughly two engineers.

### Phase A — UI marriage to TablePlus (blocks nothing; biggest perceived jump)

- 01 Footer UI fixes
- 02 Filters rebuild
- 03 Inline row insert
- 04 Structure schema view
- 05 Settings modal

### Phase B — Query tools parity with PRD

- 06 Query history & saved queries
- 07 Autocomplete + hover hints
- 08 Command palette + keyboard shortcuts

### Phase C — Grid heavy lifting

- 09 Grid virtualization
- 10 Grid editing upgrades (undo/redo, bulk, type-aware cells, column ops)

### Phase D — New surfaces

- 11 Cookies
- 12 Cache API
- 13 Origin dashboard
- 14 Sidebar enrichments

### Phase E — Durable state & disaster recovery

- 15 Snapshots + diff
- 16 Import / export expansion
- 17 Destructive-action typed confirmation

### Phase F — Plumbing & hardening

- 18 Service-worker lifecycle
- 19 Serialization fidelity
- 20 Theme inheritance, a11y, CSP

## Shared infra that shows up in multiple plans

- **Preferences store** — new `src/shared/prefs.ts` wrapping `chrome.storage.local`
  keyed by origin + global scope. Plans 05, 06, and parts of 10/13 all write here.
- **Persistent query store** — new `src/shared/persisted.ts` using a single internal
  IndexedDB database (`idxbeaver`) with stores `history`, `saved_queries`,
  `snapshots`. Plans 06 and 15 share this.
- **Serialization v2** — `src/shared/serialize.ts` upgrade documented once in plan 19
  and referenced from plans 11, 12, 15, 16.
- **RPC expansion** — every new surface adds variants to `StorageRequest` and cases
  in `src/background/index.ts`. Plans 11, 12, 13, 15, 16 each describe their
  request shape locally.

## Open risks

- **Bundle size** — current panel is ~517 KB pre-gzip. Adding monaco/codemirror
  extras, virtualization, and a schema diagrammer could breach the PRD's 2 MB
  zipped cap. Mitigation: keep QueryEditor lazy-loaded (already is), consider
  lazy-loading the Settings modal and diff viewer.
- **Service-worker lifecycle** — Plan 18 is a prerequisite for anything that
  holds in-flight state across message hops. Don't ship snapshots or long
  imports before it lands.
- **Permissions** — adding `cookies` widens the store-listing surface. We also
  retain `<all_urls>` (already present). Review copy in the store listing
  before any release.

## End-to-end acceptance walkthrough

Running this walkthrough proves the bundled plans are delivered end-to-end.
The build passes if every step completes without console errors.

1. Open DevTools on a site with at least one non-trivial IndexedDB store.
2. Sidebar shows row counts and byte sizes without manual refresh (Plan 14).
3. Top-level Origin tab shows storage breakdown and top 5 stores (Plan 13).
4. Open a store. Data footer shows row count, not search box (Plans 01, 02).
5. Click Filters → add a per-column rule → grid filters live (Plan 02).
6. Click Structure → view key path, indexes, inferred columns; export as TS (Plan 04).
7. Click `+ Row` → inline row appears, tab through fields, Enter commits (Plan 03).
8. Edit a cell inline; ⌘Z reverts the edit (Plan 10).
9. ⌘K → command palette, jump to any store (Plan 08).
10. Open query tab, run a query, press ⌘S to save it with a tag (Plan 06).
11. Re-open Query tab → History shows prior queries; autocomplete suggests columns (Plans 06, 07).
12. Open Settings (gear icon) → change UI font and cell font; theme inherits DevTools on next open (Plans 05, 20).
13. Take a snapshot of a store → restore overwrites the store after typed confirmation (Plans 15, 17).
14. Open Cookies tab → edit a cookie → reload page → cookie persists (Plan 11).
15. Open Cache Storage → preview a JSON response body (Plan 12).
16. Export the whole origin as `.idxbeaver.zip`, import on a fresh origin, values round-trip (Plan 16).
17. Force-terminate the service worker mid-query (chrome://serviceworker-internals) → UI recovers and retries (Plan 18).
18. `npm run test` green; `npm run build` produces a bundle ≤ 2 MB zipped.

## Glossary

- **Page world** — the JS realm of the inspected tab. All IDB/Cache ops happen here via `chrome.scripting.executeScript({ world: "MAIN" })`.
- **Surface** — one of IndexedDB, LocalStorage, SessionStorage, Cookies, Cache.
- **Origin scope** — `(scheme, host, port)` tuple used as a partition key for history/saved queries/snapshots.
