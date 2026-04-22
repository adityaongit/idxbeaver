# 05 — Settings Modal

## Context

No settings system exists. The user wants a dialog to control theme, UI font,
cell (mono) font, font size, and a few other preferences. It should persist
across sessions via `chrome.storage.local` so it survives extension reloads.

## Files to change

- New file: `src/panel/SettingsDialog.tsx`.
- New file: `src/shared/prefs.ts` — wrapper around `chrome.storage.local`.
- `src/panel/main.tsx` — add gear icon in the header, wire dialog open state,
  thread preferences into the app via a `PrefsContext`.
- `src/panel/styles.css` — CSS variables for `--font-ui` and `--font-mono`
  that dialog writes to on change.
- `src/manifest.ts` — `"storage"` already present, no change.

## Preference model

```ts
// src/shared/prefs.ts
export type Theme = "dark" | "light" | "system";

export type Prefs = {
  theme: Theme;                 // default: "system"
  uiFont: string;               // CSS font-family value
  cellFont: string;             // CSS font-family value
  cellFontSize: number;         // px
  uiFontSize: number;           // px
  showHiddenSystemDbs: boolean; // default: false
  confirmDestructive: boolean;  // default: true (see Plan 17)
};

export const DEFAULTS: Prefs = {
  theme: "system",
  uiFont: "Geist Variable, system-ui, sans-serif",
  cellFont: "Geist Mono Variable, ui-monospace, monospace",
  cellFontSize: 11,
  uiFontSize: 12,
  showHiddenSystemDbs: false,
  confirmDestructive: true,
};

export async function getPrefs(): Promise<Prefs>;
export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs>;
export function watchPrefs(cb: (p: Prefs) => void): () => void; // chrome.storage.onChanged
```

Scope is **global**, not per-origin — a settings change affects the whole
panel. Storage key: `prefs.v1`.

## Font options

Present as a `Select` with curated options plus a free-text "custom" row that
falls through to any CSS font stack:

- UI font: `Geist Variable`, `Inter Variable`, `SF Pro`, `system-ui`, custom.
- Cell font: `Geist Mono Variable`, `JetBrains Mono`, `SF Mono`, `Menlo`,
  `system-ui` (when user wants the same font as UI), custom.

Any custom value is stored verbatim and assumed to be a CSS font-family.

## Theme option

- `dark` / `light` / `system`.
- `system` inherits from DevTools' theme via `chrome.devtools.panels.themeName`
  (covered end-to-end in Plan 20). Here we just persist the choice.

## Dialog layout

Uses existing `Dialog` primitives. Single pane; left-aligned labels; groups:

```
Appearance
  Theme        [ dark | light | system ]
  UI font      [ Geist Variable ▾ ]
  UI font size [ 12 px ]
  Cell font    [ Geist Mono ▾ ]
  Cell font size [ 11 px ]

Behavior
  Confirm destructive actions  [x]
  Show system databases         [ ]
```

Buttons: **Done** (close) and **Reset defaults** (writes `DEFAULTS`).

## Wiring

- `PrefsProvider` wraps `<App />`. Reads once on mount, subscribes to
  `watchPrefs`, passes a `{ prefs, setPrefs }` via context.
- `App` sets CSS variables on the root element whenever prefs change:
  `document.documentElement.style.setProperty("--font-ui", prefs.uiFont)`.
- Panel CSS already uses `var(--font-mono)` in a few places; broaden coverage.
- Tailwind class `font-mono` mapped to `var(--font-mono)` via Tailwind config
  if not already.

## Acceptance

- Close DevTools, reopen: theme and fonts survive.
- Changing cell font updates every `font-mono` cell instantly.
- Toggling "Confirm destructive" disables the typed-confirm dialog (Plan 17).

## Verification

- Unit test `src/shared/prefs.test.ts` with a mocked `chrome.storage.local`.
- Manual: change every setting, reload extension, confirm values persisted and
  applied.
