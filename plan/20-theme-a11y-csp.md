# 20 — Theme Inheritance, A11y, CSP

## Context

Three smaller hardening items that do not fit elsewhere:

- DevTools theme inheritance (PRD §7.2).
- Full keyboard nav and WCAG 2.1 AA contrast (PRD §9).
- Strict CSP on the panel HTML and Trusted Types for the query parser (PRD §8.5).

## Files to change

- `src/panel/main.tsx` — read `chrome.devtools.panels.themeName` and seed the
  theme pref when Plan 05's theme is set to `"system"`.
- `src/panel/styles.css` — add missing focus-visible rings; audit contrast.
- `panel.html` — set `<meta http-equiv="Content-Security-Policy">` with a
  strict policy and a nonce for the bundle.
- `vite.config.ts` — emit bundle with a CSP-nonce attribute on the generated
  `<script>` tag (Vite has a plugin config for this; otherwise inject via
  build-time template).
- `src/panel/QueryEditor.tsx` — ensure no `new Function` / `eval` paths
  under Trusted Types.

## DevTools theme inheritance

- On panel load:
  ```ts
  const themeName = chrome.devtools.panels.themeName; // "dark" | "default"
  ```
- When `prefs.theme === "system"`, map `default → light` and `dark → dark`.
- Listen for theme change events (panels expose an `onThemeChanged` via
  `chrome.devtools.panels` in recent Chromes; fallback: poll on focus).

## A11y

- Audit every interactive element for:
  - An explicit `aria-label` or visible text.
  - Focus-visible ring that meets 3:1 contrast.
  - Keyboard operability (no mouse-only affordances).
- Run `@axe-core/react` in dev builds; log violations to console.
- Tab order: header left-to-right, then sidebar, then main, then right pane.

## CSP

- Policy:
  ```
  default-src 'self';
  script-src 'self' 'nonce-<BUILD_NONCE>';
  style-src 'self' 'unsafe-inline';  (Tailwind-in-JS; revisit)
  img-src 'self' data: blob:;
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  ```
- No `eval`. CodeMirror / shadcn do not need eval by default; verify.
- Trusted Types: set `require-trusted-types-for 'script'` header; wrap the
  only source that writes to DOM via text (CodeMirror) with a trusted policy.

## Acceptance

- Opening DevTools in dark theme renders the panel in dark theme when
  prefs.theme is `"system"`.
- Running axe in dev yields zero critical violations on the main flow.
- No CSP violations in the console for any common interaction.

## Verification

- Manual tab-only walkthrough from a clean focus state.
- `npm run build` + load the unpacked extension; DevTools Network → inspect
  CSP header / meta.
- Axe run captured as a CI artefact.
