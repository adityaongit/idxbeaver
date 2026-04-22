# 09 — Grid Virtualization

## Context

PRD F-2.1 calls for smooth scrolling through 1M rows and 200+ columns at 60
fps. The current `DataGrid` renders every row in a `<tbody>` — acceptable for
≤500 rows, unworkable for anything larger.

## Files to change

- `src/panel/main.tsx` — extract `DataGrid` into its own file first.
- New file: `src/panel/DataGrid.tsx` — rewritten with TanStack Virtual.
- `package.json` — add `@tanstack/react-virtual`.

## Approach

- `useVirtualizer` for rows using an outer scroll container.
- `useVirtualizer` for columns too; TanStack Table exposes `getVisibleLeafColumns()`
  which feeds the column virtualizer.
- Estimate row height 24 px; measure on mount to correct.
- Sticky first column (the `key` / gutter) stays outside the horizontal
  virtualizer — render as a separate fixed `<td>` chain left-aligned.
- Sticky header row: existing sticky `top-0` stays; wrap in a `position: relative`
  outer div that the virtualizer treats as the scroll parent.
- Pinned columns (Plan 10) rendered left of the virtualized area.

## Integration with existing features

- Draft row (Plan 03) is rendered outside the virtualizer as a pinned overlay
  at the bottom (or top). Always visible regardless of scroll.
- Cell editor (`CellEditor`) remains the same; when a row enters edit mode the
  virtualizer cannot recycle it — stabilize by keying off `rowKey + columnId`.
- Selection state (Plan 10, bulk select) lives in a `Map<rowKey, true>` not an
  array of row indices, so virtualization does not invalidate.

## Performance budget

- Target: first paint ≤ 150 ms for 500 rows (current behaviour).
- 60 fps scroll through 1 M synthetic rows on M1 MacBook Air.
- Profile with the React DevTools profiler; assert no render cycle exceeds 16
  ms during scroll.

## Acceptance

- Load a synthetic 1 M row store (use a Dexie seed script in `scripts/`).
- Scroll top→bottom; no visible tearing; memory stable.
- Horizontal scroll across a 200-column store feels the same.

## Verification

- Add a synthetic-seed script `scripts/seed-huge.mjs` that creates a large DB
  in a test page. Document in README.
- Manual: run the synthetic test, capture a performance trace, attach to PR.
