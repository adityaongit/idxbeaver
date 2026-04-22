# 10 — Grid Editing Upgrades

## Context

Inline editing landed in this session, but the PRD requires a full editing
posture: undo/redo, bulk select, duplicate row, Tab navigation during edit,
column pin / reorder / resize, and type-aware cell rendering. This file
gathers those into one plan because they all touch `DataGrid`.

## Files to change

- `src/panel/DataGrid.tsx` (extracted by Plan 09).
- `src/panel/main.tsx` — App-level undo stack and bulk selection state.
- New file: `src/panel/cells.tsx` — type-aware cell renderers.
- New file: `src/shared/undo.ts` — tiny command-pattern helper.

## Undo / redo

- `UndoStack` holds commands like `{ kind: "putRecord", before, after, key, store, db }`.
- Every mutation that currently goes through `addIndexedDbRecord`,
  `putIndexedDbRecord`, `deleteIndexedDbRecord`, and `saveIndexedCell` becomes
  wrapped so we can construct an inverse.
- `⌘Z` pops and applies inverse via the existing RPC flow; `⌘⇧Z` redoes.
- Stack is in-memory only; does not survive reload. Depth cap 100.
- Toast notice on each undo/redo names the operation.

## Bulk selection

- `selectedKeys: Set<string>` where each key is `JSON.stringify(row.key)`.
- Keyboard: `Shift+Click` extends; `Shift+Arrow` extends vertically; `Cmd+Click` toggles one.
- Backspace with > 0 selection triggers the bulk delete flow with typed
  confirmation (Plan 17).
- `selectedCount` already plumbed into the footer (Plan 01 scaffolding); wire
  the real count.

## Duplicate row (⌘D)

- Grabs the currently selected row (or top of multi-select).
- Opens an inline draft row (Plan 03 infrastructure) pre-filled with a deep
  clone of the source's value. For stores with inline keyPath, removes the
  key so autoIncrement can re-issue; for out-of-line keys, focuses the key
  field and blocks commit until changed.

## Tab navigation in edit mode

- `CellEditor` already handles Enter/Escape. Extend:
  - `Tab` commits current cell, moves edit focus to the next column on the
    same row. If at last column, moves to first column on next row.
  - `Shift+Tab` moves backward.
- Commit happens cell-at-a-time so each hop is durable.

## Column operations

- Pin: right-click header → `Pin column`. Pinned columns render left of the
  virtualizer (Plan 09), multiple pins ordered by pin time.
- Reorder: drag-and-drop on the header row. Use HTML5 DnD; TanStack Table
  already supports `columnOrder` state.
- Resize: drag the right edge; persist widths per origin+store in
  `chrome.storage.local` via the prefs system (Plan 05) scoped by store.
- Hide/show lives in the existing `ColumnsPopover`.

## Type-aware cell rendering

`src/panel/cells.tsx` exports:

```ts
export function renderCell(column: InferredColumn, value: unknown): React.ReactNode;
```

Rules (all reading from the serialised wire format from Plan 19):

- `number` / `integer` → right-aligned, tabular-nums.
- `boolean` → a small rounded pill (`true` green, `false` muted).
- `date` → formatted `YYYY-MM-DD HH:mm:ss` in local tz; full ISO on hover.
- `blob` → `<Blob 34 KB image/png>` with a click handler opening a preview
  drawer (right pane).
- `array` / `object` → collapsed inline preview with click-to-expand, no modal.
- `null` → italic muted `null`.
- `mixed` → plain JSON.

The type comes from the inferred schema (Plan 04) memoised per store load.

## Acceptance

- Edit a cell, press `⌘Z`; value reverts and toast says "Undid: edit email".
- Shift-select 5 rows, press Backspace → Plan 17 dialog appears.
- `⌘D` on a selected row appends an inline draft copy.
- Tab through three cells of a draft row; each commits on leave.
- Right-click header → Pin; column sticks left when scrolling.
- Dates render localised; clicking a Blob cell opens an image preview.

## Verification

- Unit tests on `src/shared/undo.ts` (stack semantics) and `renderCell`.
- Manual: exercise each keyboard binding; verify column widths persist across
  DevTools reopen.
