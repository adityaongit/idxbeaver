---
name: IdxBeaver
tagline: A TablePlus-style database client for browser storage, inside Chrome DevTools.
vibe: Native, dense, developer-tool. Pixel-aligned hairlines, tabular numerics, zero ornament.

design_tokens:
  color:
    light:
      # Surfaces
      background: "#FFFFFF"
      foreground: "#1D1D1F"
      card: "#F2F2F2"
      card_foreground: "#1D1D1F"
      popover: "#FFFFFF"
      popover_foreground: "#1D1D1F"
      titlebar_bg: "#E5E5E5"
      hairline: "rgba(0, 0, 0, 0.1)"

      # Sidebar
      sidebar: "#EDEDED"
      sidebar_foreground: "#1D1D1F"
      sidebar_primary: "#0A84FF"
      sidebar_primary_foreground: "#FFFFFF"
      sidebar_accent: "#D6E4F7"
      sidebar_accent_foreground: "#1D1D1F"
      sidebar_border: "#D1D1D1"
      sidebar_row_hover: "rgba(0, 0, 0, 0.05)"
      sidebar_row_active: "#D6E4F7"

      # Brand + semantic
      primary: "#0A84FF"          # macOS system blue
      primary_foreground: "#FFFFFF"
      secondary: "#ECECEC"
      secondary_foreground: "#1D1D1F"
      muted: "#E8E8E8"
      muted_foreground: "#6E6E73"
      accent: "#D6E4F7"
      accent_foreground: "#1D1D1F"
      destructive: "#E5484D"
      destructive_foreground: "#FFFFFF"
      border: "#D1D1D1"
      input: "#D1D1D1"
      ring: "#0A84FF"

      # Data-grid rows
      row_even: "#FFFFFF"
      row_odd: "#F5F5F5"
      row_hover: "#E8F0FB"
      row_selected: "#D6E4F7"
      row_selected_border: "#0A84FF"

      # Icon hues (object-kind coding)
      icon_store: "#4A90E2"
      icon_db: "#6E6E73"
      icon_dim: "#A1A1A6"

      # Charts
      chart_1: "#0A84FF"
      chart_2: "#4A90E2"
      chart_3: "oklch(0.6056 0.2189 292.7172)"
      chart_4: "oklch(0.7686 0.1647 70.0804)"
      chart_5: "#5AC8FA"

      # JSON syntax
      json_string: "#C2185B"
      json_number: "#1976D2"
      json_boolean: "#7B1FA2"
      json_null: "#6E6E73"
      json_key: "#0A5FA8"
      json_punct: "#6E6E73"

      # SQL syntax
      sql_keyword: "#AF00DB"
      sql_string: "#A31515"
      sql_number: "#098658"
      sql_comment: "#2E7D32"
      sql_ident: "#1D1D1F"
      sql_punct: "#6E6E73"

    dark:
      # Surfaces
      background: "#1E1E1E"
      foreground: "#E8E8E8"
      card: "#2A2A2A"
      card_foreground: "#E8E8E8"
      popover: "#2A2A2A"
      popover_foreground: "#E8E8E8"
      titlebar_bg: "#2A2A2A"
      hairline: "rgba(255, 255, 255, 0.1)"

      # Sidebar
      sidebar: "#252525"
      sidebar_foreground: "#C8C8C8"
      sidebar_primary: "#0A84FF"
      sidebar_primary_foreground: "#FFFFFF"
      sidebar_accent: "#0D3E7A"
      sidebar_accent_foreground: "#FFFFFF"
      sidebar_border: "#363636"
      sidebar_row_hover: "rgba(255, 255, 255, 0.06)"
      sidebar_row_active: "#0D3E7A"

      # Brand + semantic
      primary: "#0A84FF"
      primary_foreground: "#FFFFFF"
      secondary: "#2F2F2F"
      secondary_foreground: "#E8E8E8"
      muted: "#2A2A2A"
      muted_foreground: "#9A9A9E"
      accent: "#0D3E7A"
      accent_foreground: "#FFFFFF"
      destructive: "#FF6369"
      destructive_foreground: "#FFFFFF"
      border: "#363636"
      input: "#3E3E3E"
      ring: "#0A84FF"

      # Data-grid rows
      row_even: "#1E1E1E"
      row_odd: "#232323"
      row_hover: "#2B3B56"
      row_selected: "#0D3E7A"
      row_selected_border: "#0A84FF"

      # Icon hues
      icon_store: "#5AC8FA"
      icon_db: "#9A9A9E"
      icon_dim: "#6E6E73"

      # Charts
      chart_1: "#0A84FF"
      chart_2: "#5AC8FA"
      chart_3: "oklch(0.7090 0.1592 293.5412)"
      chart_4: "oklch(0.8369 0.1644 84.4286)"
      chart_5: "#64D2FF"

      # JSON syntax
      json_string: "#FF7AB6"
      json_number: "#78D2FA"
      json_boolean: "#D09CFE"
      json_null: "#9A9A9E"
      json_key: "#7FD1FF"
      json_punct: "#9A9A9E"

      # SQL syntax
      sql_keyword: "#C792EA"
      sql_string: "#ECC48D"
      sql_number: "#F78C6C"
      sql_comment: "#7EC699"
      sql_ident: "#E8E8E8"
      sql_punct: "#9A9A9E"

  typography:
    families:
      sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
      mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
      brand: "'Outfit', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    base_size_px: 13
    base_line_height: 1.4
    mono_features: ["tnum", "zero", "ss01"]  # tabular numerics, slashed zero
    scale:
      micro:      { size: "9px",  weight: 500, usage: "chip--tight, badge counters" }
      chip:       { size: "10px", weight: 500, usage: "chip, inline metadata" }
      caption:    { size: "11px", weight: 500, line_height: 1.55, usage: "json tree, secondary labels" }
      section:    { size: "11px", weight: 600, tracking: "0.06em", transform: "uppercase", color: "muted_foreground", usage: ".section-label" }
      body:       { size: "13px", weight: 400, line_height: 1.4,  usage: "default UI text, table cells" }
      body_emph:  { size: "13px", weight: 500, usage: "active tab, selected row" }
      title:      { size: "14px", weight: 600, usage: "panel titles, modal headers" }
      brand:      { size: "13px", weight: 600, font: "brand", usage: "topbar wordmark" }
    tracking:
      tighter: "-0.05em"
      tight:   "-0.025em"
      normal:  "0em"
      wide:    "0.025em"
      wider:   "0.05em"
      widest:  "0.1em"

  spacing:
    unit: "0.25rem"   # 4px base
    scale:
      px_2: "2px"
      px_4: "4px"
      px_6: "6px"
      px_8: "8px"
      px_12: "12px"
      px_16: "16px"
      px_24: "24px"
    row_heights:
      tp_row_sm: { height: "20px", padding_x: "6px", gap: "4px", usage: "tree items, compact list rows" }
      tp_row:    { height: "22px", padding_x: "8px", gap: "6px", usage: "default data-grid row, sidebar row" }
      tp_toolbar:{ height: "28px",                              usage: "toolbars, tab strips" }
    chip:        { height: "18px", padding_x: "6px", gap: "4px" }
    chip_tight:  { height: "16px", padding_x: "4px" }

  radius:
    sm: "4px"
    md: "6px"   # default --radius
    lg: "8px"
    xl: "12px"
    chip: "3px"
    scrollbar: "10px"

  elevation:
    light:
      "2xs": "0 1px 0 rgba(0, 0, 0, 0.03)"
      xs:    "0 1px 0 rgba(0, 0, 0, 0.04)"
      sm:    "0 1px 2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)"
      base:  "0 1px 2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)"
      md:    "0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)"
      lg:    "0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)"
      xl:    "0 16px 48px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)"
      "2xl": "0 24px 64px rgba(0, 0, 0, 0.24)"
    dark:
      "2xs": "0 1px 0 rgba(0, 0, 0, 0.25)"
      xs:    "0 1px 0 rgba(0, 0, 0, 0.3)"
      sm:    "0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)"
      base:  "0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)"
      md:    "0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)"
      lg:    "0 8px 24px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06)"
      xl:    "0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)"
      "2xl": "0 24px 64px rgba(0, 0, 0, 0.7)"

  borders:
    hairline_width: "1px"
    selected_rail_width: "2px"
    focus_ring_width: "2px"
    focus_ring_offset: "2px"

  motion:
    duration:
      instant: "0ms"
      fast:    "120ms"    # hover/selection color transitions
      base:    "200ms"
      slow:    "1400ms"   # pulse-soft loader cycle
    easing:
      standard: "ease"
      ease_in_out: "ease-in-out"
    keyframes:
      pulse_soft:
        description: "Opacity breath for inline busy indicators."
        cycle: "0% 40%, 50% 100%, 100% 40%"
        duration: "1400ms"
        timing: "ease-in-out"
        iteration: "infinite"
    principles:
      - "Motion is reserved for state, not decoration."
      - "No layout animation on row selection, tab switches, or panel reveals."
      - "Only opacity and color transitions; never transform or size."

  scrollbar:
    width: "10px"
    thumb_radius: "10px"
    thumb_light: "rgba(0, 0, 0, 0.22)"
    thumb_light_hover: "rgba(0, 0, 0, 0.36)"
    thumb_dark: "rgba(255, 255, 255, 0.22)"
    thumb_dark_hover: "rgba(255, 255, 255, 0.36)"
    track: "transparent"

  focus:
    style: "solid 2px ring, 2px offset, radius-sm"
    visible_only: true   # :focus-visible is the source of truth; bare :focus is suppressed

layout:
  shell: "Three-pane: left sidebar (databases/stores), center workspace (tabs + data grid + query editor), right inspector."
  sidebar_width: "~240px"
  inspector_width: "~320-360px"
  workspace:
    tab_strip_height: "28px"
    toolbar_height: "28px"
    query_editor_min_height: "120px"
  data_grid:
    row_height: "22px"
    header_height: "22px"
    zebra: true
    sticky_header: true
    column_pinning: true
    column_resize: true
---

# IdxBeaver — Design Intent

IdxBeaver is a Chrome DevTools panel that looks and feels like a native desktop database client — specifically in the lineage of TablePlus and the macOS Finder. Everything is calibrated for a developer who already lives in a data grid: tight rows, tabular numerics, hairline borders, no ornament.

## Identity

- **Native, not web.** The UI impersonates an Apple desktop app. System font stack first, `SF Pro Text` for body, `SF Mono` for data. The only custom font is `Outfit` for the wordmark in the topbar.
- **Quiet chrome, loud data.** Every pixel of UI chrome earns its place. Panels are greyscale; color is reserved for data (JSON syntax, index chips) and for one purpose: the macOS system blue `#0A84FF` that flags primary actions, the active item, and the selected row rail.
- **Dense by default.** Rows are 22px, toolbars are 28px. A single viewport should comfortably show ~30 records without scrolling. Padding is measured in 2/4/6/8px steps — never the fluffy 12/16/24 rhythm of consumer web apps.

## Palette philosophy

Two pillars, both explicitly engineered — no `color-mix`, no alpha hacks for primary surfaces:

- **Light mode** is cool TablePlus-white: a pure `#FFFFFF` canvas with an `#EDEDED` sidebar and `#F5F5F5` zebra rows. Hairlines at `rgba(0,0,0,0.1)` are the quiet skeleton of the whole UI. Selection is a pale blue `#D6E4F7` with a 2px blue rail on the left edge — never a heavy fill.
- **Dark mode** samples TablePlus dark: `#1E1E1E` background, `#252525` sidebar, `#2A2A2A` card. Zebra is barely perceptible (`#232323` vs `#1E1E1E`, ~2% contrast). Selection flips to a saturated `#0D3E7A` so the row is unambiguously claimed even at a glance.

The brand blue `#0A84FF` is identical across both themes. This is intentional: the product has exactly one accent color, and it must read the same way regardless of OS appearance.

Destructive actions use Radix-style red (`#E5484D` / `#FF6369`). That is the only other semantic hue in the chrome.

### Syntax colors

Two themed palettes — one for JSON (the storage payload), one for SQL (import/export previews) — follow VSCode conventions but are tuned for the TablePlus grey surround:

- **JSON light**: magenta strings, blue numbers, purple booleans. Keys are a deep desaturated blue `#0A5FA8`, weight 500, so a scanning eye lands on structure first and values second.
- **JSON dark**: pink-forward, closely modeled on the default Dark+ theme but lighter on contrast to sit against `#1E1E1E`.
- **SQL** uses VSCode Dark+ in dark mode and VSCode Light+ in light mode, verbatim.

## Typography

- **Single base size of 13px.** Everything scales around this — chips at 10px, sections at 11px, titles at 14px. There is no 15px, 16px, 17px. The product rejects the default 14-16px web cadence.
- **Mono is tabular.** `tnum`, `zero`, `ss01` are enabled on every monospaced element so numeric columns align perfectly and the slashed zero prevents O/0 confusion in ID columns.
- **The data grid has its own font variable.** Users toggle between mono and sans for table cells in Settings without affecting the rest of the chrome. `--font-table` is scoped to `.data-grid-root` and falls back to `--font-mono`.
- **Section labels** are the one piece of typographic "shouting": 11px, 600 weight, 0.06em tracking, ALL CAPS, in `muted-foreground`. They divide the sidebar and the inspector into bands without drawing heavy separators.

## Interaction surfaces

### The sidebar

The left rail is a single column — no nested accordions, no collapsible sub-trees with heavy indent. Databases and stores are flat rows at 20-22px height. Hover is `rgba(0,0,0,0.05)` (light) / `rgba(255,255,255,0.06)` (dark) — barely visible, enough to confirm cursor intent. The active row is the `sidebar_row_active` color plus, for the database picker specifically, a 2px primary-blue rail on the left edge and 14px left padding to carve space for it.

### The data grid

This is the soul of the product. Rules:

- 22px rows, zebra striped via `:nth-child(odd/even)` — no JavaScript, no `color-mix`, just `--row-odd` and `--row-even`.
- Hover is a pale blue `--row-hover` so the row you're about to click reads differently from the selected row.
- Selected row: `--row-selected` fill plus a 2px `--row-selected-border` inset shadow on the left edge. Never a 2px outline — always an inset.
- Sticky header at the same 22px, hairline border below.
- Column dividers are hairlines. No vertical grid lines between cells (too busy); spacing does the work.

### The inspector

Right pane. Fields are laid out as key/value rows with a subtle left-aligned label in `muted-foreground` and the editable value on the right. JSON values render as a collapsible tree with chevron `›` glyphs that rotate 90° on expand. Indent is `0.75rem` per level — tight enough that deeply nested objects remain readable in a narrow pane.

### Chips and badges

Chips are 18px tall (16px for `.chip--tight`), mono, 10px type, 3px radius — smaller radius than buttons so they read as metadata, not as interactive targets. Background is 60% `--muted` over transparent, so they sit on any surface without fighting it. Use chips for: record counts, index names, frame tags, query plan hints.

### Toolbars

All toolbars are exactly 28px tall. Buttons inside are icon-led, 13px text if present, with an outline-on-hover and solid-on-active treatment. No drop shadows on toolbar buttons — the toolbar itself has the subtle `titlebar_bg` fill that separates it from the content.

## Elevation

Elevation is extremely restrained. Most surfaces sit flat on the background separated only by a 1px hairline. Shadows exist for popovers, modals, and the command palette — and every shadow is paired with a `0 0 0 1px` ring so the surface has a defined edge even when the drop shadow is too soft to do so.

- `sm` / base: inputs, cards, dropdown triggers.
- `md`: popovers, select menus.
- `lg`: the command palette (⌘K).
- `xl`: full modals (confirm destructive, settings).
- `2xl`: reserved; currently unused.

## Motion

Motion in IdxBeaver exists to confirm state, not to decorate. The entire motion vocabulary is:

1. **120ms color transitions** on hover and selected states in the database picker.
2. **Pulse-soft opacity breath** on inline busy indicators (1.4s cycle, 40%↔100%).

There are no page transitions, no row enter/exit animations, no parallax, no skeleton shimmer on the data grid (a spinner chip in the toolbar does that job). Anything that moves in the UI is communicating "something changed" — if it isn't, it shouldn't move.

## Focus and accessibility

Focus is the one place where chrome becomes loud. `:focus-visible` paints a 2px solid ring in the brand blue with a 2px offset and a 4px inner radius. Bare `:focus` (mouse clicks) is suppressed so the ring only appears for keyboard users. Hover and selected states have enough independent contrast that they do not rely on the ring to be understood.

Keyboard is a first-class input surface: ⌘K for the command palette, navigation through tabs, stores, and saved queries is fully keyboardable, and the global shortcut system uses a ref-based pattern to avoid stale closures without re-registering listeners.

## What IdxBeaver is not

- **Not rounded.** The default radius is 6px. Nothing is a 12px or 16px pill. Chips are 3px. The one exception is the scrollbar thumb (10px capsule) because it has to read as a live, draggable surface.
- **Not gradient.** There are zero gradients in the product. Every surface is a flat color. If you're reaching for a gradient, the fix is a hairline.
- **Not glassy.** No `backdrop-filter: blur`. No translucent panels. The DevTools iframe already has enough visual noise; we don't layer more on top.
- **Not playful.** No illustrations, no emojis, no curved accents. Icons are stroke-style at 14-16px, blue-tinted for storage objects (`#4A90E2` light, `#5AC8FA` dark) and grey for metadata (`#6E6E73`).
- **Not responsive in a phone sense.** The panel assumes a desktop DevTools width ≥ 900px. Below that, the inspector collapses; below ~700px, the sidebar collapses to icons. Nothing reflows to a single column — this is a developer tool for developers on laptops.

## Summary for implementors

If you are building a new surface inside IdxBeaver, pass these three tests:

1. **Would this component feel right in TablePlus or Finder?** If it has a drop shadow, rounded-2xl container, or animated reveal, the answer is no.
2. **Does the color you're about to add appear in the token list above?** If not, pick the nearest token. The palette is closed.
3. **At 13px / 22px-row density, does the interface still breathe?** Density is the product. Padding should feel slightly tight the first time you see it and correct by the tenth.
