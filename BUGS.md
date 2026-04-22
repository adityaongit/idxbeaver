# Known bugs / deferred fixes

## Keyboard shortcuts conflicting with browser globals

**File:** `src/panel/shortcuts.ts` + `src/panel/main.tsx:289-310` (global shortcut listener)

Several shortcuts are grabbed by the browser before the DevTools panel receives them:

| Shortcut | Browser action | Our intent |
|---|---|---|
| ⌘T | New tab | Open database picker |
| ⌘S | Save page | Save current query |
| ⌘F | Find in page | Open filters |
| ⌘N | New window | New inline row |
| ⌘E | (varies) | Export current view |

**Root cause:** The DevTools panel runs in an extension panel which shares some (not all) keyboard shortcut interception with the browser chrome. `e.preventDefault()` works for some keys inside the panel but not all.

**Fix options:**
- Remap conflicting shortcuts to combinations the browser doesn't intercept (e.g. ⌘⇧S for save, ⌘⇧F for filter)
- Use non-modifier shortcuts for actions that only make sense when the panel is focused
- File location for remapping: `src/panel/shortcuts.ts` (the `SHORTCUTS` const) + update `matchesShortcut` calls in `src/panel/main.tsx` global listener at line ~289

---

## QueryEditor `h-full` in Suspense fallback sizing

**File:** `src/panel/main.tsx` — the Suspense wrapper around `QueryEditor` in the SQL tab (the top resizable panel)

The Suspense fallback uses `grid h-full` but before CodeMirror loads the container height may not be set. Rarely visible in practice (CodeMirror loads fast) but could flicker on slow machines.

---

## History sidebar shows entries across different origins

**File:** `src/shared/persisted.ts:130` (`getHistory`) + `src/panel/main.tsx` — `useEffect` that loads history on `discovery?.origin` change

If the user inspects a page where the DevTools `origin` is a frame origin rather than the tab origin, saved queries stored under a different origin won't appear. The `discovery.origin` may differ from the `inspectedWindow` origin. Currently no fallback / merge strategy.

---

## `⌘K` command palette — `onToggleFilters` fires even with no store open

**File:** `src/panel/CommandPalette.tsx:127` and `src/panel/main.tsx` — `onToggleFilters` prop passed to CommandPalette

The "Open filters" action in the command palette calls `onToggleFilters` unconditionally. When no IndexedDB store is open (selected.kind !== "indexeddb"), toggling the filter state has no visible effect but still updates `filterState.open`. Should guard: only show/enable the action when a store is active.

---

## Large query result DataGrid has no virtualization

**File:** `src/panel/main.tsx:3009` — `DataGrid` component

DataGrid renders all rows as real DOM nodes. For queries returning thousands of rows (no `limit` set) this causes jank and potential OOM. Tracked as Phase C work (Plan 09).
