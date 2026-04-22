# 01 — Footer UI Fixes

## Context

The current data section has three UX bugs that collectively make the panel feel
un-TablePlus-like:

1. `JSON` / `CSV` export buttons live in the per-store header (top-right of the
   grid area). In TablePlus, export lives in an action bar separate from the
   data table. They are mis-scoped in our header and fight for space with the
   search box.
2. The `Structure` tab in the footer bar is a permanently-disabled stub. In
   TablePlus it is the primary way to inspect schema.
3. The `Search…` box in the header and the `Filters` toggle in the footer solve
   overlapping problems. See Plan 02 for the Filters rebuild; this plan removes
   the Search box and relocates the exports.

## Files to change

- `src/panel/main.tsx` — the top store header (around the `Search` input and
  export buttons), the `DataFooter` component and its `Structure` pseudo-button.
- `src/panel/styles.css` — nothing expected, but verify class names still exist.

## Approach

### Remove the Search input

- Delete the `<Input placeholder="Search…">` block in the store header.
- Delete the `filterText` state and the `filterText` prop threaded into
  `DataGrid`. `useReactTable`'s `globalFilter` branch becomes dead code — remove it.
- `filterPattern` (introduced for the Filters bar) remains; Plan 02 expands it
  into a structured filter model.

### Relocate JSON / CSV buttons

- Add an `Export` button group to `DataFooter`, right-aligned, between the
  `Filters` button and the pagination cluster, separated by the existing
  divider.
- Button group is a single `Export` button with a dropdown (`JSON`, `CSV`, and
  later `NDJSON`, `SQL`, `Origin archive` — those wired by Plan 16).
- Remove the two `Button`s from the header.

### Enable Structure tab

- Replace the disabled `<button>Structure</button>` stub with a real toggle. The
  footer tabs now switch between two in-grid views: `Data` and `Structure`.
- Introduce a component-local `gridView: "data" | "structure"` state in the
  indexeddb render branch of `App`. Footer exposes it through the `DataFooter`
  prop `view` / `onChangeView`.
- When `view === "structure"`, the `DataGrid` is swapped for the `StructureView`
  component defined in Plan 04.
- Export button is hidden when `view === "structure"`.

### Visual parity with TablePlus

- Tabs in footer render as a segmented control (already present), now both
  interactive, with `aria-pressed` reflecting active tab.
- The row-count readout reads `{n} rows` in Data view and `{n} columns · {m} indexes`
  in Structure view.

## Acceptance

- Header no longer contains a Search input or export buttons.
- Footer's `Export` dropdown triggers the same client-side downloads as before.
- Clicking `Structure` swaps the grid for the schema view (content delivered by Plan 04).
- `⌘F` (once Plan 08 lands) opens the Filters bar, not the old Search box.

## Verification

- Manual: open a store, verify only one place filters data, and that export formats still produce the right file.
- Build: `npm run build` (no new deps).
- No unit test surface here; Plan 02 covers the filter behavior.
