# Design Property Table — Admin Dashboard CostPanel

**Source:** `design/design_handoff_admin_ui/admin-dashboard.jsx` (lines 103–186), primitives from `admin-primitives.jsx`, tokens/notes from `README.md`.

**Responsive note (applies to every table below):** The README states explicitly: _"Mobile admin — no mobile breakpoints. Admin is desktop-only by design (≥1280px)."_ Every "Mobile" cell is therefore **unspecified by design** — the desktop value is the only value. Cells below show the single specified value in the Desktop column and `unspecified` in Mobile.

**Font constants** (top of `admin-primitives.jsx`):

- `ADMIN_FONT` = `Inter, system-ui, -apple-system, sans-serif`
- `ADMIN_MONO` = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`

**Approved deviations from mock (locked in READINESS.md + plan `docs/superpowers/plans/2026-07-10-admin-dashboard-cost-panel.md`):**

- "Open billing" header action DROPPED (no billing surface exists)
- Budget is `LLM_BUDGET_USD = 20` constant (mock's `$40 budget · resets May 31` copy replaced; no reset cadence)
- Headline `$28.74`, badge `+18% wow`, chart data, and top-spend rows are live data, not mock constants
- WoW badge tone computed dynamically (warning on increase, success on decrease/flat)
- Mobile stacking allowed (grid collapses to single column below `lg`) — admin is desktop-first but must not break on small screens

---

## Component: Panel (wrapper, from `admin-primitives.jsx`)

CostPanel is `<Panel padding={0}>` — the Panel's inner content div renders `padding: 0`.

### Panel container

| Property      | Mobile      | Desktop                   |
| ------------- | ----------- | ------------------------- |
| background    | unspecified | `var(--bg-elevated)`      |
| border        | unspecified | `1px solid var(--border)` |
| border-radius | unspecified | 12                        |

### Panel header strip (rendered because title + action are present)

| Property        | Mobile      | Desktop                 |
| --------------- | ----------- | ----------------------- |
| display         | unspecified | flex                    |
| align-items     | unspecified | center                  |
| justify-content | unspecified | space-between           |
| padding         | unspecified | 14px 18px               |
| border-bottom   | unspecified | 1px solid var(--border) |

### Panel header title cluster (wraps the title node)

| Property    | Mobile      | Desktop |
| ----------- | ----------- | ------- |
| display     | unspecified | flex    |
| align-items | unspecified | center  |
| gap         | unspecified | 10      |

### Panel content wrapper

| Property | Mobile      | Desktop                    |
| -------- | ----------- | -------------------------- |
| padding  | unspecified | 0 (via `padding={0}` prop) |

---

## Component: CostPanel header title (custom node)

### Title text — "LLM spend, last 30 days"

| Property    | Mobile      | Desktop    |
| ----------- | ----------- | ---------- |
| font-family | unspecified | ADMIN_FONT |
| font-size   | unspecified | 14         |
| font-weight | unspecified | 700        |

### WoW badge — `<StatusBadge kind="warning" mono>+18% wow</StatusBadge>` (variant defaults to `soft`)

| Property       | Mobile      | Desktop                                                          |
| -------------- | ----------- | ---------------------------------------------------------------- |
| display        | unspecified | inline-flex                                                      |
| align-items    | unspecified | center                                                           |
| gap            | unspecified | 6                                                                |
| padding        | unspecified | 2px 8px                                                          |
| border-radius  | unspecified | 999                                                              |
| font-family    | unspecified | ADMIN_MONO (mono prop)                                           |
| font-size      | unspecified | 11                                                               |
| font-weight    | unspecified | 600                                                              |
| letter-spacing | unspecified | 0.04em (mono prop)                                               |
| line-height    | unspecified | 16px                                                             |
| white-space    | unspecified | nowrap                                                           |
| color          | unspecified | `var(--warning)`                                                 |
| background     | unspecified | `color-mix(in oklab, var(--warning) 18%, transparent)`           |
| border         | unspecified | `1px solid color-mix(in oklab, var(--warning) 38%, transparent)` |
| dot            | unspecified | — (no dot prop; no leading dot rendered)                         |
| text content   | unspecified | `+18% wow` (live: computed WoW %)                                |

### Header action — "Open billing" button

DROPPED per READINESS/plan (approved deviation). No header action renders.

---

## Component: CostPanel body grid

### Two-column grid wrapper

| Property              | Mobile      | Desktop                |
| --------------------- | ----------- | ---------------------- |
| display               | unspecified | grid                   |
| grid-template-columns | unspecified | `1fr 280px`            |
| border-top            | unspecified | `0px` (explicitly set) |

---

## Component: Left column — chart cell

### Cell container

| Property     | Mobile      | Desktop                 |
| ------------ | ----------- | ----------------------- |
| padding      | unspecified | 20px 24px               |
| border-right | unspecified | 1px solid var(--border) |

### Headline row (dollar figure + budget note)

| Property      | Mobile      | Desktop  |
| ------------- | ----------- | -------- |
| display       | unspecified | flex     |
| align-items   | unspecified | baseline |
| gap           | unspecified | 10       |
| margin-bottom | unspecified | 12       |

### Big dollar figure — "$28.74"

| Property             | Mobile      | Desktop                             |
| -------------------- | ----------- | ----------------------------------- |
| font-family          | unspecified | ADMIN_MONO                          |
| font-size            | unspecified | 32                                  |
| font-weight          | unspecified | 700                                 |
| color                | unspecified | `var(--fg)`                         |
| letter-spacing       | unspecified | -0.01em                             |
| font-variant-numeric | unspecified | tabular-nums                        |
| text content         | unspecified | live 30-day total, `$` + 2 decimals |

### Budget note

| Property     | Mobile      | Desktop                                                |
| ------------ | ----------- | ------------------------------------------------------ |
| font-family  | unspecified | ADMIN_FONT                                             |
| font-size    | unspecified | 12                                                     |
| color        | unspecified | `var(--fg-muted)`                                      |
| text content | unspecified | `of $20 budget` (approved deviation; no reset cadence) |

### Chart container

| Property | Mobile      | Desktop  |
| -------- | ----------- | -------- |
| width    | unspecified | 100%     |
| height   | unspecified | 110      |
| position | unspecified | relative |

### X-axis labels row

| Property         | Mobile      | Desktop                                                                        |
| ---------------- | ----------- | ------------------------------------------------------------------------------ |
| display          | unspecified | flex                                                                           |
| justify-content  | unspecified | space-between                                                                  |
| margin-top       | unspecified | 8                                                                              |
| font-family      | unspecified | ADMIN_MONO                                                                     |
| font-size        | unspecified | 10                                                                             |
| color            | unspecified | `var(--fg-subtle)`                                                             |
| letter-spacing   | unspecified | 0.06em                                                                         |
| labels (5 spans) | unspecified | 5 date labels spanning the window (live: derived from data, uppercase `MMM D`) |

---

## Component: CostChart (SVG)

### SVG root

| Property            | Mobile      | Desktop                      |
| ------------------- | ----------- | ---------------------------- |
| viewBox             | unspecified | `0 0 100 100` (w=100, h=100) |
| preserveAspectRatio | unspecified | `none`                       |
| width               | unspecified | 100% (style)                 |
| height              | unspecified | 100% (style)                 |
| display             | unspecified | block                        |

### Gradient def — `linearGradient id="costGrad"`

| Property       | Mobile      | Desktop                                                |
| -------------- | ----------- | ------------------------------------------------------ |
| x1, y1, x2, y2 | unspecified | 0, 0, 0, 1 (vertical)                                  |
| stop 1         | unspecified | offset 0%, stopColor `var(--signal)`, stopOpacity 0.32 |
| stop 2         | unspecified | offset 100%, stopColor `var(--signal)`, stopOpacity 0  |

### Gridlines (3 lines, at y = 25, 50, 75)

| Property         | Mobile      | Desktop              |
| ---------------- | ----------- | -------------------- |
| x1 / x2          | unspecified | 0 / 100 (full width) |
| stroke           | unspecified | `var(--border)`      |
| stroke-width     | unspecified | 0.3                  |
| stroke-dasharray | unspecified | `1 1.5`              |

### Area path

| Property          | Mobile      | Desktop                                                    |
| ----------------- | ----------- | ---------------------------------------------------------- |
| path construction | unspecified | line path + `L${w},${h} L0,${h} Z` (closed to bottom edge) |
| fill              | unspecified | `url(#costGrad)`                                           |
| stroke            | unspecified | —                                                          |

### Line path

| Property          | Mobile      | Desktop                                                                                                                 |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| point math        | unspecified | `stepX = 100/(n-1)`; `x = i*stepX`; `y = 100 - (v/max)*(100-8) - 2` (max = max of data; 8px headroom, 2px bottom inset) |
| path construction | unspecified | `M` first point, then `L` per point, space-joined                                                                       |
| stroke            | unspecified | `var(--signal)`                                                                                                         |
| stroke-width      | unspecified | 0.9                                                                                                                     |
| fill              | unspecified | none                                                                                                                    |
| vector-effect     | unspecified | non-scaling-stroke                                                                                                      |

### Last-point dot (circle)

| Property | Mobile      | Desktop                        |
| -------- | ----------- | ------------------------------ |
| cx, cy   | unspecified | coordinates of last data point |
| r        | unspecified | 1.2                            |
| fill     | unspecified | `var(--signal)`                |

---

## Component: Right column — top spend cell

### Cell container

| Property       | Mobile      | Desktop   |
| -------------- | ----------- | --------- |
| padding        | unspecified | 20px 22px |
| display        | unspecified | flex      |
| flex-direction | unspecified | column    |
| gap            | unspecified | 14        |

### Section label — `<MonoLabel>top spend</MonoLabel>`

| Property       | Mobile      | Desktop                      |
| -------------- | ----------- | ---------------------------- |
| font-family    | unspecified | ADMIN_MONO                   |
| font-size      | unspecified | 10 (default)                 |
| font-weight    | unspecified | 700                          |
| letter-spacing | unspecified | 0.1em                        |
| text-transform | unspecified | uppercase                    |
| color          | unspecified | `var(--fg-subtle)` (default) |
| text content   | unspecified | `top spend`                  |

### Rows list container

| Property       | Mobile      | Desktop |
| -------------- | ----------- | ------- |
| margin-top     | unspecified | 8       |
| display        | unspecified | flex    |
| flex-direction | unspecified | column  |
| gap            | unspecified | 8       |

### Each row — name/cost line

| Property        | Mobile      | Desktop       |
| --------------- | ----------- | ------------- |
| display         | unspecified | flex          |
| justify-content | unspecified | space-between |
| margin-bottom   | unspecified | 4             |

### Venue name span

| Property    | Mobile      | Desktop     |
| ----------- | ----------- | ----------- |
| font-family | unspecified | ADMIN_FONT  |
| font-size   | unspecified | 12          |
| color       | unspecified | `var(--fg)` |

### Cost value — `<CostText value={r.c} size={12} />`

| Property             | Mobile      | Desktop                                                                                 |
| -------------------- | ----------- | --------------------------------------------------------------------------------------- |
| font-family          | unspecified | ADMIN_MONO                                                                              |
| font-size            | unspecified | 12 (size prop)                                                                          |
| font-weight          | unspecified | 500 (default)                                                                           |
| color                | unspecified | `var(--fg)` (non-zero, non-dim); `var(--fg-subtle)` if value is 0/null or `dim`         |
| font-variant-numeric | unspecified | tabular-nums                                                                            |
| letter-spacing       | unspecified | 0.01em                                                                                  |
| formatting           | unspecified | `$` + value.toFixed(2) for values ≥ 1; toFixed(4) for values < 1; `$0.00` for zero/null |

### Row progress bar — `<ProgressBar value={r.p} kind="signal" height={4} />`

| Property            | Mobile      | Desktop                                           |
| ------------------- | ----------- | ------------------------------------------------- |
| wrapper display     | unspecified | flex                                              |
| wrapper align-items | unspecified | center                                            |
| wrapper gap         | unspecified | 10                                                |
| wrapper width       | unspecified | 100%                                              |
| track flex          | unspecified | 1                                                 |
| track height        | unspecified | 4                                                 |
| track border-radius | unspecified | 4 (= height)                                      |
| track background    | unspecified | `var(--surface-2)`                                |
| track overflow      | unspecified | hidden                                            |
| fill height         | unspecified | 100%                                              |
| fill width          | unspecified | `${value}%` (max 100 default)                     |
| fill border-radius  | unspecified | 4                                                 |
| fill background     | unspecified | `var(--signal)`                                   |
| fill transition     | unspecified | width .25s ease                                   |
| label               | unspecified | — (showLabel defaults false; no % label rendered) |

---

## Data Shapes

### Chart data — 30-element daily-cost series (dollars per day, zero-filled)

### Top-spend rows — `{ venueName, costUsd, percent }` per row

Mock: top 3 venues + `(others)` aggregate row; `(others)` styled identically to venue rows.

---

## State Coverage

| State                   | Triggering condition                    | Component rendered                                                      | Key props required            |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| WoW increase badge      | current 7-day spend > prior 7-day spend | StatusBadge kind=warning mono                                           | `+N% wow` text                |
| WoW decrease/flat badge | current ≤ prior                         | StatusBadge kind=success mono (inferred; not drawn)                     | `-N% wow` / `0% wow` text     |
| "(others)" row          | more than 3 venues with spend in window | identical row styling                                                   | aggregated cost + percent     |
| Zero/dim cost           | costUsd = 0 or null                     | CostText renders `$0.00` in `var(--fg-subtle)`                          | —                             |
| Sub-$1 cost             | 0 < costUsd < 1                         | CostText 4-decimal format                                               | —                             |
| Empty window (no runs)  | all daily sums 0                        | zero-filled chart + $0.00 total (per plan)                              | API returns 30 zero-fill days |
| Loading                 | data fetch in flight                    | server component — data fetched before render (no client loading state) | —                             |
