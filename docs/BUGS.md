# Known bugs / deferred fixes

All previously listed bugs have been resolved. See git history for details.

---

## [FIXED] Keyboard shortcuts conflicting with browser globals

Remapped all browser-intercepted shortcuts to `mod+shift` variants:

| Old | New | Action |
|---|---|---|
| ⌘T | ⌘⇧T | Open database picker |
| ⌘S | ⌘⇧S | Save current query |
| ⌘F | ⌘⇧F | Open filters |
| ⌘N | ⌘⇧N | New inline row |
| ⌘E | ⌘⇧E | Export current view |

Chrome DevTools also reserves `⌘T`, `⌘W`, and `⌘N` at the browser-accelerator level — panel iframes never receive those `keydown` events, so capture-phase `preventDefault` cannot reclaim them. Tab management uses `⌘J` (new tab), `⌘E` (focus workspace; press again to open a new tab), and `⌘X` (close active tab — handler skips inputs/CodeMirror so cut still works) instead.

**Files:** `src/panel/shortcuts.ts`, `src/panel/main.tsx`, `src/panel/CommandPalette.tsx`

---

## [FIXED] QueryEditor `h-full` in Suspense fallback sizing

Changed fallback from `grid h-full` to `flex min-h-[120px]` so it renders
correctly even before the parent has an explicit pixel height.

**File:** `src/panel/main.tsx`

---

## [FIXED] History sidebar shows entries across different origins

History and saved queries now derive the key from `new URL(discovery.url).origin`
when `discovery.url` is available, falling back to `discovery.origin`. This ensures
the top-level tab origin is used rather than a sub-frame origin.

**File:** `src/panel/main.tsx`

---

## [FIXED] `⌘K` command palette — `onToggleFilters` fires even with no store open

`onToggleFilters` and `onNewRow` are now optional props in `CommandPalette`.
`main.tsx` passes them only when `selected.kind === "indexeddb"`, so the actions
are hidden from the palette when no store is active.

**Files:** `src/panel/CommandPalette.tsx`, `src/panel/main.tsx`

---

## [FIXED] Large query result DataGrid has no virtualization

`DataGrid` uses `useVirtualizer` from `@tanstack/react-virtual` — only visible
rows are rendered as DOM nodes.

**File:** `src/panel/DataGrid.tsx`
