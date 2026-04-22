# 02 — Filters Rebuild

## Context

Today's `Filters` button just toggles a plain-text pattern bar that runs a
fuzzy match against `JSON.stringify(row)`. This is the same thing the removed
Search box did — so it adds no new capability. TablePlus's Filters bar is a
structured, per-column rule builder with operators and compound rules. That is
the value we want.

## Files to change

- `src/panel/main.tsx` — replace the existing `FilterBar` component and its
  state (`filterPattern`, `filterBarOpen`) with a richer `FilterRules` model.
- New file: `src/panel/FilterBar.tsx` (lift it out of `main.tsx`; current file
  is already 2,400+ lines).
- `src/shared/query.ts` — reuse operator set to keep parity with the query
  language where it overlaps.
- `DataGrid` prop surface — replace `filterText` with `rows` that are already
  pre-filtered, so the grid stays dumb.

## Data model

```ts
type FilterOperator =
  | "eq" | "ne"
  | "lt" | "lte" | "gt" | "gte"
  | "contains" | "notContains"
  | "startsWith" | "endsWith"
  | "regex"
  | "exists" | "notExists"
  | "in" | "notIn";

type FilterRule = {
  id: string;
  column: string;            // "key" or one of tableResult.columns
  operator: FilterOperator;
  value: string;             // raw input; parsed per-operator
  active: boolean;
};

type FilterState = {
  open: boolean;
  combinator: "and" | "or";
  rules: FilterRule[];
};
```

## UI

Render above the grid, below the store header, when `open`:

```
[ + Add rule ]  combinator: [AND|OR]
┌──────────────────────────────────────────────┐
│ [column ▾]  [operator ▾]  [ value input ]  ×│  (one row per rule)
└──────────────────────────────────────────────┘
```

- Column `ComboBox` reuses `Command` from `ui/command.tsx` — we already have it.
- Operator `Select` uses `ui/select.tsx`.
- Value input swaps by operator: `exists`/`notExists` hides it; `in`/`notIn`
  accepts comma-separated; `regex` shows a flags-aware hint.
- Each rule has a `×` remove and a toggle checkbox for quick enable/disable.
- Focus the new value input on `+ Add rule`.

## Evaluation

Filter evaluation runs client-side on `tableResult.rows` before the existing
offset/limit slicing. Pull into a pure function so we can unit test:

```ts
// src/shared/filters.ts
export function applyFilters(rows: IndexedDbRecord[], state: FilterState): IndexedDbRecord[];
```

- Coerce the cell value using the same helper as `renderColumn`.
- Value input parses as JSON first, falls back to string (matches inline edit
  semantics; see `saveIndexedCell`).
- Regex operator compiles once per rule; guard invalid regex with a visible
  error on the rule row, don't throw.

## Integration points

- Footer's `Filters` button shows a badge `(n)` when any active rule exists.
  Highlights primary variant when open.
- `Clear` (inside filter bar) removes all rules. Closing the bar keeps rules
  but hides the UI; reopening restores.
- KV view gets a lightweight version: only one rule, column fixed to `key` or
  `value`. Implemented by passing `mode="kv"` to the same component.

## Acceptance

- With rules: `salesforce_id contains "acme"` AND `close_date gt "2026-01-01"`
  correctly narrows the table.
- Clicking a column header (Plan 10) adds a "contains" rule prefilled to that
  column (nice-to-have; document but feature-flag if cut).
- Rule count badge shows on footer even when filter bar is closed.

## Verification

- New vitest suite `src/shared/filters.test.ts` covering each operator, type
  coercion, and regex errors.
- Manual: open a store with ~10K rows; add two AND rules and two OR rules;
  confirm row count in footer matches expectation.
