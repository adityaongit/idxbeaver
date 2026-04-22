# 07 — Schema-Aware Autocomplete & Hover Hints

## Context

`src/panel/QueryEditor.tsx` already wires CodeMirror 6 autocomplete from a
`QuerySuggestion[]` pool assembled in `main.tsx`: store names, inferred columns
of the currently selected store, and Mongo operators. Gaps vs PRD F-3.3:

- Suggestions do not deepen as the user narrows the JSON path
  (e.g. after typing `"filter": {`, completions should be field names of the
  target store, not stores).
- No hover tooltip showing "this is a store with N rows and these indexes" or
  "this column is seen in 95% of sampled rows and is inferred as integer".

## Files to change

- `src/panel/QueryEditor.tsx` — upgrade the completion source to be
  context-aware; add a hover extension.
- `src/panel/main.tsx` — pass additional context:
  - Discovery data (store counts, indexes).
  - The inferred schema (`InferredColumn[]` from Plan 04).
- New file: `src/panel/queryCompletions.ts` — pure functions for context detection.

## Context-aware completion

The query is valid JSON most of the time. We can cheaply parse the doc up to
the cursor with a recoverable parser (walk characters counting braces/quotes)
and decide:

- At the top level → suggest keys `store`, `filter`, `sort`, `limit`, `project`.
- Inside `store` value position → suggest store names.
- Inside `filter` / `sort` / `project` object → suggest field names.
- At an operator position (inside `{ "$..." }`) → suggest operators.

Reuse the existing flat suggestion pool as a fallback. Context detection is
best-effort; if ambiguous, fall through to the pool.

## Hover hints

Use `@codemirror/view` `hoverTooltip`:

- When the cursor's token matches a known store name, tooltip shows:
  `<storeName> · N rows · keyPath: "id" · indexes: by_email, by_status`.
- When it matches a known column, tooltip shows:
  `<column> · type string · seen in 95% of sampled rows`.
- When it matches an operator, tooltip shows a one-line description pulled
  from a static map: `$regex — matches string values against a RegExp pattern`.

Data sources:

- Store metadata → `discovery.indexedDb[?].stores[?]`.
- Column metadata → `inferSchema(tableResult.rows)` from Plan 04 (memoise on `tableResult`).

## Performance

- Context detection is capped at O(N) in document length; tolerate up to ~20 KB.
- Hover tooltips are cheap (lookups in pre-built maps).
- All extensions added inside a memoised `useMemo` so they are not rebuilt per
  keystroke.

## Acceptance

- Typing `{ "store": "` then Ctrl-Space shows store names only.
- Typing `{ "filter": { "` inside that JSON shows only columns of the current
  store.
- Hovering a known store name surfaces row count and key path.
- Hovering `$regex` surfaces the description.

## Verification

- Unit tests for `queryCompletions.ts` covering the four context cases.
- Manual: exercise autocomplete in each of the nested positions above.
