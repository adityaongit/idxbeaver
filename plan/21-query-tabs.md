# 21 — Query Tabs (Multiple Editors)

## Context

Today the SQL/Query workspace has a single editor (`activeTabId === "sql"` in
`src/panel/main.tsx`). All query work happens against one shared `queryText`
state. Switching between two queries means copy/paste or wiping the editor.

TablePlus solves this with per-query tabs above the editor (see reference image
in conversation): each tab is its own editor with its own results pane below,
its own dirty/saved state, and a `+` to open a new one. Closing returns to the
neighbour. We want the same for IdxBeaver.

## Goals

- Multiple independent query editors, each with its own:
  - Editor text (`queryText`)
  - Last results (`queryResult`, `queryDbContext`, `inferredSchema` if used)
  - Plan strip output
  - Filter/projection-derived UI state (none today, but reserved)
- A tab strip above the editor with: name, dirty marker (`•`), close (`×`), and
  a trailing `+` button to open a new untitled tab.
- Saving a query (existing `⌘S` flow → `SavedQuery`) names the active tab.
- Reopening a saved query from the SavedQueriesPanel either focuses an existing
  tab on that saved query or opens a new tab.
- Keyboard: `⌘J` opens a new query tab; `⌘E` focuses the workspace and opens a
  new tab on a second press; `⌘X` closes the active tab (skipped when focus is
  in an input or CodeMirror so cut still works); `⌘1..⌘9` jumps; `⌘⇧[` / `⌘⇧]`
  cycles. `⌘T` / `⌘W` are *not* used — Chrome DevTools reserves them at the
  browser accelerator level (see `docs/BUGS.md`).
- Persist open tabs across panel reloads (per origin) so the workspace
  survives a DevTools detach/reattach.

## Non-goals

- Splitting / side-by-side editors (TablePlus has this; we punt).
- Tab drag-to-reorder. Acceptable to add later; first cut just appends.
- Per-tab connection / database selection. Today the active database picker is
  global; tabs share it. If users want different DBs per tab, that's a follow-up.

## Files to change

- `src/panel/main.tsx`
  - Replace single `queryText` / `queryResult` / `queryDbContext` state with a
    `queryTabs: QueryTab[]` + `activeQueryTabId` model.
  - Render the tab strip above the existing `<QueryEditor />`.
  - Re-key the `<QueryEditor />` on `activeQueryTabId` so CodeMirror reinits
    cleanly per tab (or pass the active doc and rely on the existing
    `value`/`onChange` props — the editor handles internal state via React
    refs, so a `key` swap is safer).
- `src/shared/persisted.ts`
  - Add `getOpenQueryTabs(origin)` / `setOpenQueryTabs(origin, tabs)` backed by
    `chrome.storage.local` under key `query-tabs.v1.<origin>` (small, frequent
    writes — IndexedDB is overkill).
- `src/shared/types.ts`
  - Add `QueryTab` type (see Data model below).
- New file: `src/panel/QueryTabsStrip.tsx`
  - Pure presentational component. Props: `tabs`, `activeId`, `onSelect`,
    `onClose`, `onNew`, `onRename`. Double-click a tab name to rename inline.
- `src/panel/SavedQueriesPanel.tsx`
  - "Open" should call a new `openSavedQueryInTab(saved)` callback from
    `main.tsx` instead of overwriting the current editor.
- `src/panel/shortcuts.ts`
  - Add `new-query-tab` (`mod+j`), `close-query-tab` (`mod+x`),
    `next-query-tab` (`mod+shift+]`), `prev-query-tab` (`mod+shift+[`).
- `README.md`
  - Add the new shortcuts to the Keyboard Shortcuts table.

## Data model

```ts
// src/shared/types.ts
export interface QueryTab {
  id: string;                       // uuid; stable for the life of the tab
  name: string;                     // user-visible label, e.g. "Untitled 1" or saved-query name
  queryText: string;
  savedQueryId: string | null;      // when opened from a SavedQuery; null until saved
  dirty: boolean;                   // text differs from savedQueryId snapshot
  // Last execution snapshot — kept in memory only, not persisted.
  lastResult?: QueryResult | null;  // existing type; nullable
  lastPlan?: string | null;
  lastRanAt?: number | null;
}
```

Persisted shape (in `chrome.storage.local`) drops `lastResult` / `lastPlan` /
`lastRanAt` to keep storage small — results are recomputed on demand.

## Behaviour notes

- **New tab**: `id = uuid()`, `name = "Untitled N"` where N is the smallest
  positive int not in use, `queryText = ""`, `savedQueryId = null`,
  `dirty = false`. Focus the editor.
- **Close last tab**: closing the last tab leaves a single empty Untitled tab —
  do not allow zero tabs (avoids an empty-state branch in the editor).
- **Dirty tracking**: `dirty = savedQueryId ? queryText !== saved.queryText : queryText.trim().length > 0`.
  Show `•` before the name in the strip.
- **Save**: `⌘S` opens the existing save dialog. On save, set `savedQueryId`
  and `name` on the active tab; clear `dirty`.
- **Open from SavedQueriesPanel**: if a tab with `savedQueryId === saved.id`
  exists, focus it. Otherwise open in a new tab.
- **Persistence**: write `queryTabs` (sans transient fields) to
  `chrome.storage.local` debounced at 250 ms. On panel mount, hydrate per
  origin; if the persisted set is empty, seed one Untitled tab.

## Failure modes & edge cases

- **Storage quota / corruption**: if `chrome.storage.local` returns garbage,
  fall back to a single Untitled tab. Log once via `console.warn`; do not block
  the UI.
- **Origin change mid-session** (DevTools attached, user navigates the
  inspected page to a different origin): treat as a fresh workspace; persist
  the previous origin's tabs before swapping.
- **Long names**: truncate with `text-overflow: ellipsis` at ~16ch; full name
  on hover via `title`.
- **Inline rename collisions**: allowed — names are display-only, IDs are the
  identity.

## Tests

- `src/shared/persisted.test.ts`: round-trip a `QueryTab[]` through
  `setOpenQueryTabs` / `getOpenQueryTabs`. Confirm transient fields are
  stripped.
- `src/shared/queryTabs.test.ts` (new): pure functions for
  `nextUntitledName(tabs)`, `closeTab(tabs, id) → { tabs, activeId }`,
  `openSaved(tabs, saved) → { tabs, activeId }`.
- Manual check: save a query, close the panel, reopen DevTools — same tabs.

## Rollout

Single PR. No flag. Behind the scenes the change is contained to the SQL tab
view; other tabs (LocalStorage, Cookies, etc.) stay single-pane.

## Open questions

- Should results be **per tab** or **shared at the bottom** like today? This
  plan assumes per-tab — closer to TablePlus and what a user expects when they
  flip tabs. Confirm before implementation.
- ~~Hotkey `⌘T`: today's `mod+shift+t` opens the database picker. Plain `mod+t`
  is unused and conventional for new tab. OK to take it?~~ Resolved: Chrome
  DevTools claims `⌘T` at the browser-accelerator level, so the panel never
  receives the `keydown`. Using `⌘J` and a smart-overload on `⌘E` instead.
- Database context per tab: out of scope here. If we revisit, store
  `dbContextHint` on `QueryTab` and use it as a per-tab default for
  `queryDbContext`.
