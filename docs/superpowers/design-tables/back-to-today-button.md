# Design Property Table — "Back to Today" control (#1006)

Source: `design/design_handoff_calendar_jump_picker/` — README R2 + `back-to-today.jsx`. Approved ★ by Hugh 2026-07-18.

## RotateCcwGlyph (shared reset mark)

| #   | Property      | Spec value                                                                                                                                                 |
| --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Shape         | SVG `viewBox="0 0 24 24"`, two strokes: `<polyline points="1 4 1 10 7 10">` + `<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10">`                               |
| G2  | Stroke color  | `var(--accent)` default (the calendar's "today" colour), overridable via `color` prop                                                                      |
| G3  | Stroke        | `strokeWidth` ~2.4 default, `strokeLinecap="round"`, `strokeLinejoin="round"`, `fill="none"`                                                               |
| G4  | Size          | `size` prop drives width+height (13 default; 11 in the picker footer chip)                                                                                 |
| G5  | A11y          | `aria-hidden="true"`, `display:block`                                                                                                                      |
| G6  | Consolidation | Used by BOTH the header BackToTodayControl and the JumpPicker footer "Today" chip — one learned "snap to today" mark; deliberately not a plain `◂` chevron |

## BackToTodayControl (header surface button)

| #   | Property             | Spec value                                                                                                                                      |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Trigger (visibility) | Week-level — rendered only when the shown week does NOT contain today; unmounts the instant today is back in view (no dead tab-stop)            |
| B2  | Action               | Full reset — jump to today's week AND select today; mirrors the JumpPicker footer chip exactly                                                  |
| B3  | Placement            | Inline in the header nav cluster, left of the `◂ ▸` chevrons; identical position mobile + desktop (parity)                                      |
| B4  | Label — default      | Icon (RotateCcwGlyph) + "Today" text where it fits                                                                                              |
| B5  | Label — ≤360px       | Collapses to icon-only via CSS media query (SSR-safe, no JS viewport branch)                                                                    |
| B6  | Wording              | "Today" (from CONSUMER_COPY)                                                                                                                    |
| B7  | Hit target           | Transparent `<button>` ≥44×44 wrapping a 34px visible pill (lines up with 34px chevrons)                                                        |
| B8  | Pill chrome          | `--surface-2` bg, `1px solid var(--border-strong)`, `borderRadius:999`, `color:var(--fg)`, JetBrains Mono, uppercase, small letter-spaced label |
| B9  | Pill hover           | bg → `var(--overlay-press)`, border → `var(--border-focus)`                                                                                     |
| B10 | Focus                | `:focus-visible` ring `2px solid var(--focus)` offset 2px on the pill; no outline on the button                                                 |
| B11 | A11y                 | Standard `<button type="button">`, Tab/Enter/Space, `aria-label="Back to today, {spoken date}"` (e.g. "Back to today, Tuesday, Apr 28")         |
| B12 | Motion               | Fade + slide-in from the right over ~170ms; `prefers-reduced-motion` + print show end-state only                                                |
| B13 | Theming              | Token-only across Electric / Jade / Light; no hardcoded hex, no Tailwind `dark:`                                                                |

## Footer chip consolidation (JumpPicker)

| #   | Property   | Spec value                                                                                                                                         |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Glyph swap | The footer "Today" chip's plain `--accent` dot is replaced with `<RotateCcwGlyph size={11} />`                                                     |
| F2  | Chip stays | Footer chip remains present (default `showTodayChip` true); both controls share the mark, modally separated (header = closed, chip = open overlay) |
