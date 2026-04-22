# 08 — Command Palette & Keyboard Shortcuts

## Context

`CommandDialog` (shadcn cmdk) is imported but never opened. PRD §7.3 lists a
full keyboard shortcut grid; today only `⌘↵` (run query) is wired. A command
palette (`⌘K`) is also required per §7.4.

## Files to change

- New file: `src/panel/CommandPalette.tsx`.
- New file: `src/panel/shortcuts.ts` — single source of truth for shortcut
  bindings so the palette and the help dialog can both read them.
- `src/panel/main.tsx` — global `keydown` listener; wire each action to its
  existing handler.

## Shortcut map (initial)

```ts
// src/panel/shortcuts.ts
export const SHORTCUTS = [
  { id: "cmd-palette",     keys: "mod+k",             label: "Command palette" },
  { id: "new-tab",         keys: "mod+t",             label: "New tab (open picker)" },
  { id: "run-query",       keys: "mod+enter",         label: "Run query" },
  { id: "run-explain",     keys: "mod+shift+enter",   label: "Run query with EXPLAIN" },
  { id: "save-query",      keys: "mod+s",             label: "Save current query" },
  { id: "open-filters",    keys: "mod+f",             label: "Open filters bar" },
  { id: "new-row",         keys: "mod+n",             label: "New row (inline)" },
  { id: "duplicate-row",   keys: "mod+d",             label: "Duplicate selected row" },
  { id: "export",          keys: "mod+e",             label: "Export current view" },
  { id: "delete-selected", keys: "backspace",         label: "Delete selected rows" },
  { id: "cancel",          keys: "escape",            label: "Cancel edit / close modal" },
  { id: "settings",        keys: "mod+,",             label: "Open settings" },
] as const;
```

`mod` is `⌘` on macOS and `Ctrl` elsewhere (detected once via
`navigator.platform`).

EXPLAIN (`mod+shift+enter`) is a no-op placeholder until we add a `plan`
preview to the existing query flow; keep it harmless for now.

## Command palette

- Contents: every shortcut label, every open store (with path `db › store`),
  and every saved query (from Plan 06).
- Uses shadcn `Command` primitives with fuzzy search.
- Selecting a store dispatches `openNode` on the matching node.
- Selecting a saved query opens the query tab and loads text.

## Global listener

Single listener on `window` registered in `App`:

- Ignore when the target is inside a CodeMirror editor (CM handles its own
  keymap, and we bind `⌘↵` via its extension there).
- Ignore Backspace when focus is inside an `<input>` / `<textarea>` so users
  don't lose text.
- `preventDefault` only for shortcuts we actually consume.

## Help

`?` toggles a dialog listing every binding. Small surface but great for
discoverability; also satisfies the a11y plan.

## Acceptance

- `⌘K` opens the palette from anywhere in the panel.
- `⌘↵` still runs a query; `⌘S` saves it; `⌘F` opens Filters (Plan 02);
  `⌘N` starts an inline row (Plan 03); `⌘,` opens Settings (Plan 05).
- Backspace does not delete rows while typing in an input.

## Verification

- Unit test for the binding table: every id has a non-empty `keys` and `label`.
- Manual: each shortcut's effect visually verified. Cross-OS (mac + win).
