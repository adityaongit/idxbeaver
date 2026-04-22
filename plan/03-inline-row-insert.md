# 03 — Inline Row Insert (TablePlus-style)

## Context

Currently `+ Row` opens a modal dialog with a JSON editor. The user wants the
TablePlus behaviour: clicking `+ Row` appends a blank row to the grid and
focuses the first editable cell; Enter commits that cell; Tab moves to the
next; pressing `Esc` before any commit discards the row. Only the final
`addIndexedDbRecord` fires when the row is fully ready.

## Files to change

- `src/panel/main.tsx` — App-level state for the pending draft row; DataGrid
  gets a `pendingDraft` prop and emits `onCommitDraft` / `onCancelDraft`.
- New helper: `src/shared/indexed.ts` (utility that derives key strategy from
  an `IndexedDbStoreInfo`).
- Remove `insertRecordOpen` dialog JSX and associated state; wipe `newKey` /
  `newValue` state.

## Key inference

```ts
type KeyStrategy =
  | { kind: "auto" }                           // autoIncrement true, no keyPath
  | { kind: "autoIncrementInline"; path: string[] }  // autoIncrement true + keyPath
  | { kind: "inlineKeyPath"; path: string[] }  // autoIncrement false + keyPath
  | { kind: "outOfLine" };                     // keyPath null, autoIncrement false

export function keyStrategy(store: IndexedDbStoreInfo): KeyStrategy;
```

Behavior:

- `auto` → no key column appears in the draft row; `addIndexedDbRecord` omits `key`.
- `autoIncrementInline` → skip editing the keyPath cell; commit with `key`
  omitted; IDB fills it.
- `inlineKeyPath` → the keyPath cell is required; block commit if empty.
- `outOfLine` → a synthetic `key` column appears at the left of the draft row.

## Draft row UX

State stored on `App`:

```ts
type DraftRow = {
  values: Record<string, string>; // raw strings per column, parsed on commit
  outOfLineKey?: string;
  activeColumn: string;
};
```

Render:

- The draft row is rendered by `DataGrid` as a synthetic pinned row at the top
  (or bottom; TablePlus uses bottom). Has a distinctive left indicator (a `+`
  gutter) so the user sees it is unsaved.
- Keyboard: `Tab` moves active column forward, `Shift+Tab` backward. When
  leaving the last cell, Tab wraps. `Enter` commits (calls `addIndexedDbRecord`).
  `Esc` discards.
- Mouse: clicking another cell commits the previous cell's value into `values`
  and focuses the clicked one.

## Commit

- Build the object using the column list and parsed values (reuse the
  `JSON.parse || raw` fallback already used for inline edit).
- Validate with `keyStrategy`.
- Call existing `addIndexedDbRecord` flow (already exists in `App`). On
  success the grid reloads; on error show the notice strip (already exists).

## Removed code

- `insertRecordOpen` state.
- The `+ Row` dialog JSX.
- `newKey` / `newValue` / `setNewKey` / `setNewValue`.
- `<Dialog>` wiring and related imports if no longer used.

The KV surface keeps its existing "Save key" form — it is not a table and the
inline-row pattern does not map. Plan 16 (imports) later unifies KV bulk add.

## Acceptance

- For an autoIncrement store: clicking `+ Row` yields a draft row; filling any
  cells and hitting Enter adds the record with IDB-generated key.
- For a store with `keyPath: "id"` and no autoIncrement: pressing Enter with
  `id` empty shows an inline validation error on that cell.
- For an out-of-line store: a `key` gutter cell appears; Enter commits with
  that key.
- `Esc` discards without firing RPC.

## Verification

- Unit tests for `keyStrategy` covering the four branches in `src/shared/indexed.test.ts`.
- Manual walk-through on three sample stores (auto-increment, inline keyPath, out-of-line).
