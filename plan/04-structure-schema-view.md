# 04 — Structure (Schema) View

## Context

Clicking `Structure` in the footer should show the schema of the current store,
the way TablePlus's Structure tab does: a columns table (name, type, nullable,
default) and an indexes table below. IndexedDB is schema-less, so "columns"
come from sampling records and "type" is the inferred JSON/JS type.

## Files to change

- `src/panel/main.tsx` — render branch that currently swaps in `DataGrid`.
  Now switches between `DataGrid` and `StructureView` based on the footer's
  `view` state (set up by Plan 01).
- New file: `src/panel/StructureView.tsx`.
- New file: `src/shared/schemaInfer.ts`.

## Data sources

- `selectedStore: IndexedDbStoreInfo` (already in state) gives the key path,
  autoIncrement flag, and the list of indexes with unique / multiEntry flags.
- Column list and inferred types come from sampling the loaded rows
  (`tableResult.rows`). First 500 rows are enough (that is what we fetch).

## Schema inference

```ts
// src/shared/schemaInfer.ts
type InferredType =
  | "string" | "number" | "integer" | "boolean" | "null" | "date"
  | "array" | "object" | "blob" | "binary" | "mixed";

export interface InferredColumn {
  name: string;
  type: InferredType;
  nullable: boolean;         // at least one row has null/undefined for this column
  sampleCount: number;
  coverage: number;          // 0..1 percent of sampled rows that had this column
}

export function inferSchema(rows: IndexedDbRecord[]): InferredColumn[];
```

- Walk every row's `record.value.value` when it is an object; bucket by key.
- Per bucket, track seen types; reconcile (`string` + `string` → `string`;
  conflicts become `mixed`).
- `integer` vs `number` based on `Number.isInteger`.
- Recognise serialised Blobs/typed arrays/Dates from the tagged wire format
  (see Plan 19).

## Rendering

```
┌─────────────────────────────────────────────────────────┐
│ Primary key: id   ·   Auto-increment: true              │
├─────────────────────────────────────────────────────────┤
│ # │ column        │ type    │ nullable │ coverage       │
│ 1 │ id            │ integer │ false    │ 100%           │
│ 2 │ email         │ string  │ true     │ 95%            │
│ 3 │ created_at    │ date    │ false    │ 100%           │
│ …                                                       │
├─────────────────────────────────────────────────────────┤
│ index           │ on        │ unique │ multiEntry       │
│ by_email        │ email     │ true   │ false            │
│ …                                                       │
└─────────────────────────────────────────────────────────┘
```

- Implemented with the existing `table` primitives. No virtualisation needed
  (small row counts).
- Rows in the columns table clickable → adds a filter rule on that column
  (Plan 02 integration).
- Indexes table is read-only in v1. The PRD explicitly marks index editing as
  complex and out of scope.

## Schema export

Two buttons at the top-right of the Structure view:

- **Copy TypeScript stub** — emits an `interface` or `type` alias from the
  inferred columns.
- **Copy Dexie schema** — emits the equivalent `&indexColumnName` shorthand.

Reusable formatter lives in `src/shared/schemaExport.ts`:

```ts
export function toTypeScript(store: string, columns: InferredColumn[]): string;
export function toDexieSchema(stores: IndexedDbStoreInfo[]): string;
```

Both write to the clipboard via `navigator.clipboard.writeText` and surface the
existing `setNotice({ tone: "success", message: "Copied TS stub." })`.

## Acceptance

- Selecting Structure shows the two tables (columns + indexes) with correct
  values for a known test DB.
- Clicking a row in the columns table opens Filters with a rule on that column.
- Copy buttons deliver syntactically valid TS / Dexie output.

## Verification

- Unit tests on `inferSchema` and both formatters with synthetic `IndexedDbRecord[]`.
- Manual: verify on a Dexie-based demo that the generated Dexie stub matches the original.
