# Design Property Table — Supporting Artists Line

> Source files: `design/design_handoff_supporting_artists_line/supporting-line.jsx`, `event-cards.jsx`, `README.md`
> Canvas-chrome files (design-canvas.jsx, ios-frame.jsx, theme-context.jsx, tweaks-panel.jsx, .html) excluded.
> Mobile and Desktop share the same component tree — the design is mobile-first and a single component renders both. Where values differ by surface (card / hero / detail) those are noted per-surface.

---

## Size Ramp

The `RAMP` object defines all size-dependent values per surface. Every numeric entry below traces back to this table.

| Property                                      | card | hero | detail |
| --------------------------------------------- | ---- | ---- | ------ |
| `head` (headliner font-size)                  | 15   | 22   | 34     |
| `tour` (tour eyebrow / status pill font-size) | 9    | 10   | 12     |
| `lead` (lead-word font-size)                  | 10   | 11   | 13     |
| `name` (opener name font-size)                | 12   | 13   | 16     |
| `gap` (EventTitleBlock column gap)            | 2    | 3    | 5      |

---

## Component: `EventTitleBlock`

The composed block every surface renders. Layout is a flex column; all child components are placed inside it.

### Root element

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| display        | flex                                  |
| flex-direction | column                                |
| gap            | `r.gap` → card: 2, hero: 3, detail: 5 |
| min-width      | 0                                     |

### Kicker row (renders when `status` or `tourPlacement === "eyebrow"`)

| Property      | Value  |
| ------------- | ------ |
| display       | flex   |
| align-items   | center |
| gap           | 8      |
| min-width     | 0      |
| margin-bottom | 1      |

### Headliner element

| Property                              | card             | hero             | detail           |
| ------------------------------------- | ---------------- | ---------------- | ---------------- |
| font-family                           | Inter, system-ui | Inter, system-ui | Inter, system-ui |
| font-weight                           | 800              | 800              | 900              |
| font-size                             | 15               | 22               | 34               |
| color (normal)                        | var(--fg)        | var(--fg)        | var(--fg)        |
| color (dimmed — when status set)      | var(--fg-muted)  | var(--fg-muted)  | var(--fg-muted)  |
| letter-spacing                        | -0.02em          | -0.02em          | -0.03em          |
| line-height                           | 1.12             | 1.12             | 1.12             |
| white-space                           | nowrap           | nowrap           | normal           |
| overflow                              | hidden           | hidden           | hidden           |
| text-overflow                         | ellipsis         | ellipsis         | ellipsis         |
| min-width                             | 0                | 0                | 0                |
| text-decoration (cancelled)           | line-through     | line-through     | line-through     |
| text-decoration-color (cancelled)     | var(--danger)    | var(--danger)    | var(--danger)    |
| text-decoration-thickness (cancelled) | 2px              | 2px              | 2px              |
| text-decoration (all other states)    | none             | none             | none             |

---

## Component: `SupportingLine` — Billing variant (default)

Renders when `variant === "billing"` (the default).

### Root element

| Property    | Value            |
| ----------- | ---------------- |
| display     | flex             |
| align-items | baseline         |
| min-width   | 0                |
| font-family | Inter, system-ui |
| line-height | 1.35             |

### Lead-word span (`aria-hidden="true"`)

| Property       | card                        | hero                        | detail                      |
| -------------- | --------------------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 10                          | 11                          | 13                          |
| color          | var(--fg-subtle)            | var(--fg-subtle)            | var(--fg-subtle)            |
| letter-spacing | 0.04em                      | 0.04em                      | 0.04em                      |
| flex-shrink    | 0                           | 0                           | 0                           |
| margin-right   | 6                           | 6                           | 6                           |
| position       | relative                    | relative                    | relative                    |
| top            | -0.02em                     | -0.02em                     | -0.02em                     |

### Names-and-separators span (clipped run container, `aria-hidden="true"`)

| Property      | Value                                        |
| ------------- | -------------------------------------------- |
| min-width     | 0                                            |
| overflow      | card/hero: hidden; detail: visible           |
| text-overflow | card/hero: ellipsis; detail: —               |
| white-space   | card/hero: nowrap; detail: normal (may wrap) |

### Artist name span (within billing variant)

| Property                    | card             | hero             | detail           |
| --------------------------- | ---------------- | ---------------- | ---------------- |
| font-weight                 | 600              | 600              | 600              |
| font-size                   | 12               | 13               | 16               |
| color (normal)              | var(--fg-muted)  | var(--fg-muted)  | var(--fg-muted)  |
| color (dimmed — `dim=true`) | var(--fg-subtle) | var(--fg-subtle) | var(--fg-subtle) |
| letter-spacing              | -0.005em         | -0.005em         | -0.005em         |

Interactive hover (`.sal-name.sal-tap:hover`, applied via injected stylesheet):

| Property   | Value         |
| ---------- | ------------- |
| color      | var(--signal) |
| transition | color 0.12s   |
| cursor     | pointer       |

### Separator span (between names, `aria-hidden` inherited from parent)

| Property    | card             | hero             | detail           |
| ----------- | ---------------- | ---------------- | ---------------- |
| color       | var(--fg-subtle) | var(--fg-subtle) | var(--fg-subtle) |
| padding     | 0 6px            | 0 6px            | 0 6px            |
| font-weight | 400              | 400              | 400              |
| font-size   | 12               | 13               | 16               |

Default separator glyph: `·` (middot). Alternatives: `•` (bullet), `/` (slash), `,` (comma).

### `+N more` tail span — billing variant (`aria-hidden` inherited)

| Property       | card                        | hero                        | detail                      |
| -------------- | --------------------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 10.5 (`name - 1.5`)         | 11.5 (`name - 1.5`)         | 14.5 (`name - 1.5`)         |
| color          | var(--fg-subtle)            | var(--fg-subtle)            | var(--fg-subtle)            |
| font-weight    | 500                         | 500                         | 500                         |
| letter-spacing | 0.01em                      | 0.01em                      | 0.01em                      |
| white-space    | nowrap                      | nowrap                      | nowrap                      |

A separator glyph (same as between names) also precedes the `+N more` tail.

---

## Component: `SupportingLine` — Chips variant

Renders when `variant === "chips"`.

### Root element

| Property    | Value                                                   |
| ----------- | ------------------------------------------------------- |
| display     | flex                                                    |
| align-items | center                                                  |
| gap         | 5                                                       |
| flex-wrap   | nowrap                                                  |
| overflow    | hidden                                                  |
| min-width   | 0                                                       |
| role        | group                                                   |
| aria-label  | full natural-language list (from `supportingA11yLabel`) |

### Lead-word span (`aria-hidden="true"`)

| Property       | card                        | hero                        | detail                      |
| -------------- | --------------------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 10                          | 11                          | 13                          |
| color          | var(--fg-subtle)            | var(--fg-subtle)            | var(--fg-subtle)            |
| letter-spacing | 0.04em                      | 0.04em                      | 0.04em                      |
| flex-shrink    | 0                           | 0                           | 0                           |

### Artist chip (`<span>` or `<button>` when interactive, `aria-hidden="true"`)

| Property                 | card                           | hero                           | detail                         |
| ------------------------ | ------------------------------ | ------------------------------ | ------------------------------ |
| display                  | inline-flex                    | inline-flex                    | inline-flex                    |
| align-items              | center                         | center                         | center                         |
| flex-shrink              | 0                              | 0                              | 0                              |
| padding                  | 2px 8px                        | 2px 8px                        | 2px 8px                        |
| border-radius            | 999                            | 999                            | 999                            |
| border                   | 1px solid var(--border-strong) | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| background               | transparent                    | transparent                    | transparent                    |
| font-family              | Inter, system-ui               | Inter, system-ui               | Inter, system-ui               |
| font-weight              | 600                            | 600                            | 600                            |
| font-size                | 12                             | 13                             | 16                             |
| color (normal)           | var(--fg-muted)                | var(--fg-muted)                | var(--fg-muted)                |
| color (dimmed)           | var(--fg-subtle)               | var(--fg-subtle)               | var(--fg-subtle)               |
| letter-spacing           | -0.005em                       | -0.005em                       | -0.005em                       |
| line-height              | 1.4                            | 1.4                            | 1.4                            |
| white-space              | nowrap                         | nowrap                         | nowrap                         |
| cursor (non-interactive) | default                        | default                        | default                        |
| cursor (interactive)     | pointer                        | pointer                        | pointer                        |

Interactive hover (`.sal-chip.sal-tap:hover`, injected stylesheet):

| Property     | Value                           |
| ------------ | ------------------------------- |
| border-color | var(--signal)                   |
| color        | var(--fg)                       |
| transition   | border-color 0.12s, color 0.12s |

### `+N more` chip (dashed border, chips variant, `aria-hidden="true"`)

| Property       | card                            | hero                            | detail                          |
| -------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| flex-shrink    | 0                               | 0                               | 0                               |
| padding        | 2px 8px                         | 2px 8px                         | 2px 8px                         |
| border-radius  | 999                             | 999                             | 999                             |
| border         | 1px dashed var(--border-strong) | 1px dashed var(--border-strong) | 1px dashed var(--border-strong) |
| font-family    | 'JetBrains Mono', monospace     | 'JetBrains Mono', monospace     | 'JetBrains Mono', monospace     |
| font-size      | 11 (`name - 1`)                 | 12 (`name - 1`)                 | 15 (`name - 1`)                 |
| color          | var(--fg-subtle)                | var(--fg-subtle)                | var(--fg-subtle)                |
| letter-spacing | 0.02em                          | 0.02em                          | 0.02em                          |
| white-space    | nowrap                          | nowrap                          | nowrap                          |

---

## Component: `TourEyebrow`

Renders above the headliner when `tourPlacement === "eyebrow"` and `tourName` is non-null. Lives inside the kicker row alongside `StatusPill`.

| Property       | card                        | hero                        | detail                      |
| -------------- | --------------------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 9                           | 10                          | 12                          |
| color (normal) | var(--fg-muted)             | var(--fg-muted)             | var(--fg-muted)             |
| color (dimmed) | var(--fg-subtle)            | var(--fg-subtle)            | var(--fg-subtle)            |
| letter-spacing | 0.14em                      | 0.14em                      | 0.14em                      |
| text-transform | uppercase                   | uppercase                   | uppercase                   |
| white-space    | nowrap                      | nowrap                      | nowrap                      |
| overflow       | hidden                      | hidden                      | hidden                      |
| text-overflow  | ellipsis                    | ellipsis                    | ellipsis                    |
| margin-bottom  | 3                           | 3                           | 8                           |
| aria-label     | `Tour: {tourName}`          | `Tour: {tourName}`          | `Tour: {tourName}`          |

---

## Component: `TourSubtitle`

Alternate tour placement (`tourPlacement === "subtitle"`). Renders below the headliner.

| Property       | card               | hero               | detail             |
| -------------- | ------------------ | ------------------ | ------------------ |
| font-family    | Inter, system-ui   | Inter, system-ui   | Inter, system-ui   |
| font-style     | italic             | italic             | italic             |
| font-weight    | 500                | 500                | 500                |
| font-size      | 12                 | 13                 | 16                 |
| color (normal) | var(--fg-muted)    | var(--fg-muted)    | var(--fg-muted)    |
| color (dimmed) | var(--fg-subtle)   | var(--fg-subtle)   | var(--fg-subtle)   |
| letter-spacing | -0.005em           | -0.005em           | -0.005em           |
| white-space    | nowrap             | nowrap             | nowrap             |
| overflow       | hidden             | hidden             | hidden             |
| text-overflow  | ellipsis           | ellipsis           | ellipsis           |
| margin-top     | 2                  | 2                  | 2                  |
| aria-label     | `Tour: {tourName}` | `Tour: {tourName}` | `Tour: {tourName}` |

---

## Component: `StatusPill`

Rendered in the kicker row when `status` is `"cancelled"` or `"postponed"`.

### Root element

| Property       | Value                       |
| -------------- | --------------------------- |
| display        | inline-flex                 |
| align-items    | center                      |
| flex-shrink    | 0                           |
| padding        | 2px 7px                     |
| border-radius  | 4                           |
| background     | transparent                 |
| font-family    | 'JetBrains Mono', monospace |
| font-weight    | 700                         |
| letter-spacing | 0.1em                       |
| text-transform | uppercase                   |
| line-height    | 1                           |

### Per-status values

| Status    | Label     | font-size (card / hero / detail) | border                   | color          |
| --------- | --------- | -------------------------------- | ------------------------ | -------------- |
| cancelled | CANCELLED | 9 / 10 / 12                      | 1px solid var(--danger)  | var(--danger)  |
| postponed | POSTPONED | 9 / 10 / 12                      | 1px solid var(--warning) | var(--warning) |

---

## Component: `EventCard`

Browse/watching list row. The 320px overflow surface.

### Root element

| Property      | Value                   |
| ------------- | ----------------------- |
| display       | flex                    |
| align-items   | flex-start              |
| gap           | 12                      |
| padding       | 12px 14px               |
| border-radius | 12                      |
| background    | var(--surface-1)        |
| border        | 1px solid var(--border) |

### Surface defaults passed to `EventTitleBlock`

| Prop          | Value               |
| ------------- | ------------------- |
| surface       | "card"              |
| maxInline     | 2                   |
| variant       | "billing" (default) |
| separator     | "middot" (default)  |
| tourPlacement | "eyebrow" (default) |

### Artist image (`SALArtistImage`)

| Property        | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| width           | 56                                                                           |
| height          | 56                                                                           |
| flex-shrink     | 0                                                                            |
| border-radius   | 8                                                                            |
| background      | `linear-gradient(135deg, oklch(0.35 0.08 {hue}), oklch(0.22 0.06 {hue+40}))` |
| display         | flex                                                                         |
| align-items     | center                                                                       |
| justify-content | center                                                                       |
| overflow        | hidden                                                                       |

Artist image initial letter:

| Property       | Value                    |
| -------------- | ------------------------ |
| font-family    | Inter, system-ui         |
| font-weight    | 800                      |
| font-size      | `size * 0.4` = 22.4      |
| color          | `oklch(0.75 0.12 {hue})` |
| opacity        | 0.7                      |
| letter-spacing | -0.02em                  |

Image tint overlay:

| Property   | Value             |
| ---------- | ----------------- |
| position   | absolute          |
| inset      | 0                 |
| background | var(--image-tint) |

### Text column wrapper

| Property  | Value |
| --------- | ----- |
| flex      | 1     |
| min-width | 0     |

### Price badge (top-right, only shown when price is set AND no status)

| Property       | Value            |
| -------------- | ---------------- |
| font-family    | Inter, system-ui |
| font-weight    | 800              |
| font-size      | 14               |
| color          | var(--signal)    |
| letter-spacing | -0.01em          |
| flex-shrink    | 0                |
| margin-top     | 1                |

Price value: first segment of `price.split("–")[0]`.

---

## Component: `MetaLine`

Venue · time · price row. Shared across all three card surfaces.

### Root element

| Property       | Value                       |
| -------------- | --------------------------- |
| display        | flex                        |
| align-items    | center                      |
| gap            | 5                           |
| margin-top     | 5                           |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 9.5                         |
| letter-spacing | 0.02em                      |
| min-width      | 0                           |
| color (normal) | var(--fg-muted)             |
| color (dimmed) | var(--fg-subtle)            |

### Venue span

| State  | color                               |
| ------ | ----------------------------------- |
| normal | var(--signal)                       |
| dimmed | same as root `c` = var(--fg-subtle) |

| Property    | Value  |
| ----------- | ------ |
| white-space | nowrap |

### Separator dots (between venue/time/price)

| Property | Value |
| -------- | ----- |
| opacity  | 0.4   |

### Time span

| Property    | Value  |
| ----------- | ------ |
| white-space | nowrap |

### Price span (conditional — only rendered when `price` truthy)

| State  | color                               |
| ------ | ----------------------------------- |
| normal | var(--signal)                       |
| dimmed | same as root `c` = var(--fg-subtle) |

| Property    | Value  |
| ----------- | ------ |
| white-space | nowrap |

---

## Component: `HeroEventCard`

Full-bleed art + gradient overlay. Title block sits over the image bottom.

### Root element

| Property      | Value                          |
| ------------- | ------------------------------ |
| border-radius | 16                             |
| overflow      | hidden                         |
| background    | var(--surface-1)               |
| border        | 1px solid var(--border-strong) |
| position      | relative                       |

### Image container

| Property | Value    |
| -------- | -------- |
| position | relative |

### Image (`SALArtistImage`, fullBleed mode)

| Property        | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| width           | 100%                                                                         |
| height          | 200                                                                          |
| flex-shrink     | 0                                                                            |
| border-radius   | 0                                                                            |
| background      | `linear-gradient(135deg, oklch(0.35 0.08 {hue}), oklch(0.22 0.06 {hue+40}))` |
| display         | flex                                                                         |
| align-items     | center                                                                       |
| justify-content | center                                                                       |
| overflow        | hidden                                                                       |

Image initial letter (fullBleed):

| Property       | Value                    |
| -------------- | ------------------------ |
| font-size      | 64                       |
| font-weight    | 800                      |
| font-family    | Inter, system-ui         |
| color          | `oklch(0.75 0.12 {hue})` |
| opacity        | 0.7                      |
| letter-spacing | -0.02em                  |

### Gradient overlay (over image)

| Property   | Value                                                      |
| ---------- | ---------------------------------------------------------- |
| position   | absolute                                                   |
| inset      | 0                                                          |
| background | `linear-gradient(180deg, transparent 24%, var(--bg) 104%)` |

### "Tonight's pick" badge

| Property       | Value                       |
| -------------- | --------------------------- |
| position       | absolute                    |
| top            | 12                          |
| left           | 12                          |
| padding        | 3px 8px                     |
| border-radius  | 4                           |
| background     | var(--accent)               |
| color          | var(--fg-on-accent)         |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 9                           |
| font-weight    | 700                         |
| letter-spacing | 0.08em                      |
| text-transform | uppercase                   |

### Content area (below image, overlaps via negative margin)

| Property   | Value       |
| ---------- | ----------- |
| padding    | 0 18px 18px |
| margin-top | -52         |
| position   | relative    |

### Surface defaults passed to `EventTitleBlock`

| Prop          | Value               |
| ------------- | ------------------- |
| surface       | "hero"              |
| maxInline     | 3                   |
| variant       | "billing" (default) |
| separator     | "middot" (default)  |
| tourPlacement | "eyebrow" (default) |

---

## Component: `DetailHeader`

Event detail page. Full room — openers can wrap, no truncation.

### Root element

| Property | Value          |
| -------- | -------------- |
| padding  | 26px 24px 22px |

### Surface defaults passed to `EventTitleBlock`

| Prop          | Value                |
| ------------- | -------------------- |
| surface       | "detail"             |
| maxInline     | null (no truncation) |
| variant       | "billing" (default)  |
| separator     | "middot" (default)   |
| tourPlacement | "eyebrow" (default)  |

### Detail meta row (venue · date · price)

| Property       | Value                       |
| -------------- | --------------------------- |
| display        | flex                        |
| align-items    | center                      |
| gap            | 8                           |
| margin-top     | 16                          |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 11                          |
| color          | var(--fg-muted)             |
| letter-spacing | 0.04em                      |
| flex-wrap      | wrap                        |

#### Venue span

| Property | Value         |
| -------- | ------------- |
| color    | var(--signal) |

#### Separator dots

| Property | Value |
| -------- | ----- |
| opacity  | 0.4   |

#### Price span (conditional)

| Property | Value         |
| -------- | ------------- |
| color    | var(--signal) |

---

## Overflow: `maxInline` per Surface

| Surface | Default `maxInline` | Behavior when exceeded                                                   |
| ------- | ------------------- | ------------------------------------------------------------------------ |
| card    | 2                   | Show first 2 names; roll remainder into `+N more`                        |
| hero    | 3                   | Show first 3 names; roll remainder into `+N more`                        |
| detail  | null                | No truncation — all names shown; openers may wrap (billing variant only) |

`+N more` copy: `+${hidden} more` where `hidden = artists.length - shown.length`. This is a Sour Patch voice scaffolding string in `SUPPORT_COPY.more`.

---

## Conditional Rendering

| Element                                 | Condition to render                                    |
| --------------------------------------- | ------------------------------------------------------ |
| `SupportingLine` (entire component)     | `artists.length > 0`; returns null otherwise           |
| `TourEyebrow`                           | `tourName` non-null AND `tourPlacement === "eyebrow"`  |
| `TourSubtitle`                          | `tourName` non-null AND `tourPlacement === "subtitle"` |
| `StatusPill`                            | `status === "cancelled"` or `status === "postponed"`   |
| Kicker row (`status + eyebrow` wrapper) | `status` set OR `showEyebrow` is true                  |
| `+N more` tail (billing)                | `hidden > 0` (i.e. `artists.length > maxInline`)       |
| `+N more` chip (chips)                  | `hidden > 0`                                           |
| EventCard price badge                   | `event.price` truthy AND `!event.status`               |
| MetaLine price segment                  | `event.price` truthy                                   |
| Headliner line-through                  | `status === "cancelled"`                               |
| `dim` state on names/tour               | `!!status` (either cancelled or postponed)             |

---

## State Coverage Table

| State                           | Triggering condition                                         | Component rendered                                                                  | Key props                                 |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| Normal — headliner only         | `supportingArtists = []`, `tourName = null`, `status = null` | `EventTitleBlock` → headliner div only; `SupportingLine` returns null               | `headliner` set; all others default       |
| Single opener                   | `supportingArtists.length === 1`                             | `SupportingLine` renders one name with no separator                                 | `artists = ["X"]`                         |
| Multiple openers (within limit) | `artists.length > 1` and `artists.length ≤ maxInline`        | Full billing line with separators                                                   | `artists`, `maxInline` ≥ artists.length   |
| Overflow — `+N more`            | `artists.length > maxInline`                                 | Billing/chips line truncated; `+N more` tail appended                               | `artists`, `maxInline` set                |
| Tour — eyebrow (default)        | `tourName` non-null, `tourPlacement = "eyebrow"`             | `TourEyebrow` in kicker row above headliner                                         | `tourName`, `tourPlacement = "eyebrow"`   |
| Tour — subtitle                 | `tourName` non-null, `tourPlacement = "subtitle"`            | `TourSubtitle` below headliner                                                      | `tourName`, `tourPlacement = "subtitle"`  |
| Tour — hidden                   | `tourName` non-null, `tourPlacement = "hidden"`              | Tour name not rendered                                                              | `tourPlacement = "hidden"`                |
| Tour-only (no openers)          | `tourName` set, `supportingArtists = []`                     | `TourEyebrow` + headliner; `SupportingLine` returns null                            | `tourName`, `supportingArtists = []`      |
| Solo headliner                  | `supportingArtists = []`, `tourName = null`                  | Headliner div only; no kicker row, no billing line                                  | —                                         |
| Cancelled                       | `status = "cancelled"`                                       | `StatusPill` (CANCELLED, danger color) + headliner with line-through; block dims    | `status = "cancelled"`                    |
| Postponed                       | `status = "postponed"`                                       | `StatusPill` (POSTPONED, warning color); block dims; no line-through                | `status = "postponed"`                    |
| Interactive openers             | `interactive = true`                                         | Names/chips become `button` or `span` with cursor:pointer; hover → var(--signal)    | `interactive = true`, `onArtist` callback |
| Chips variant                   | `variant = "chips"`                                          | Artist names rendered as pill chips with solid border; `+N more` uses dashed border | `variant = "chips"`                       |
| Billing variant                 | `variant = "billing"` (default)                              | Names in a clipped inline run with separator glyphs                                 | `variant = "billing"`                     |
| Legacy fallback                 | `supportingArtists` field absent / legacy run-on title       | Not handled client-side — data migration/backfill is eng responsibility             | —                                         |

---

## A11y Specification

### `SupportingLine` (both variants)

| Attribute                            | Value                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `role` on root                       | `"group"`                                                                 |
| `aria-label` on root                 | Full natural-language list from `supportingA11yLabel()`                   |
| Lead-word span                       | `aria-hidden="true"`                                                      |
| Separator glyphs                     | `aria-hidden="true"` (inherited from parent clipped span)                 |
| Artist name spans                    | `aria-hidden="true"` (full roster announced via group aria-label)         |
| `+N more` tail                       | `aria-hidden="true"` (SR hears the complete list, not the overflow count) |
| Artist chip `<button>` (interactive) | `aria-hidden="true"` on chip (announced via group label)                  |

`supportingA11yLabel` natural-language patterns:

| Count | aria-label format                         |
| ----- | ----------------------------------------- |
| 0     | `""` (empty — group not rendered)         |
| 1     | `"with {artist}"`                         |
| 2     | `"with {A} and {B}"`                      |
| 3+    | `"with {A}, {B}, and {C}"` (Oxford comma) |

### `TourEyebrow`

| Attribute    | Value                                      |
| ------------ | ------------------------------------------ |
| `aria-label` | `"Tour: {tourName}"`                       |
| Rendered as  | `<div>` with aria-label (no explicit role) |

### `TourSubtitle`

| Attribute    | Value                   |
| ------------ | ----------------------- |
| `aria-label` | `"Tour: {tourName}"`    |
| Rendered as  | `<div>` with aria-label |

### `StatusPill`

No explicit aria attributes specified in design. Status is visually communicated via label text (CANCELLED / POSTPONED) and color; the text is not `aria-hidden`.

### Interactive name/chip hover

| Class               | Applied when                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `.sal-name.sal-tap` | `interactive=true`, billing variant — adds `cursor:pointer`, hover color transition        |
| `.sal-chip.sal-tap` | `interactive=true`, chips variant — adds `cursor:pointer`, hover border + color transition |

### Heading level

No explicit heading-level assignment in the design components. The headliner div is a styled `<div>`, not an `<h*>` element — heading level is left to the consuming page context.

### Screen-reader behavior for `+N more`

Screen readers hear the COMPLETE artist roster via the group `aria-label`, regardless of the visual `+N more` truncation. The overflow tail is `aria-hidden`.

---

## Token Index

All color values use CSS custom properties. No raw hex values appear anywhere in the design files.

| Token                  | Used in                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `var(--fg)`            | Headliner (normal state)                                                                                                                    |
| `var(--fg-muted)`      | Headliner (dimmed), artist names (normal), tour eyebrow/subtitle (normal), MetaLine root color                                              |
| `var(--fg-subtle)`     | Lead-word, separators, `+N more` text, artist names (dimmed), tour eyebrow/subtitle (dimmed), MetaLine separator dots (opacity 0.4 overlay) |
| `var(--fg-on-accent)`  | "Tonight's pick" badge text (HeroEventCard)                                                                                                 |
| `var(--signal)`        | Interactive hover color (names), price badge, venue name in MetaLine + DetailHeader meta row, interactive chip hover border                 |
| `var(--danger)`        | StatusPill cancelled border + color; headliner line-through color                                                                           |
| `var(--warning)`       | StatusPill postponed border + color                                                                                                         |
| `var(--border)`        | EventCard outer border                                                                                                                      |
| `var(--border-strong)` | Chip solid border; HeroEventCard outer border                                                                                               |
| `var(--surface-1)`     | EventCard background; HeroEventCard background                                                                                              |
| `var(--bg)`            | HeroEventCard gradient fade-to (`linear-gradient(180deg, transparent 24%, var(--bg) 104%)`)                                                 |
| `var(--accent)`        | "Tonight's pick" badge background                                                                                                           |
| `var(--image-tint)`    | Tint overlay on artist image avatar                                                                                                         |

Font families used (no raw hex; token-aligned per 9-theme system):

| Font family                   | Used in                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Inter, system-ui`            | Headliner, artist names, artist image initial, price badge, chips (names)                                    |
| `'JetBrains Mono', monospace` | Lead-word, tour eyebrow, StatusPill, `+N more` tail, MetaLine, DetailHeader meta row, "Tonight's pick" badge |

No raw hex color values appear in `supporting-line.jsx` or `event-cards.jsx`. The `SALArtistImage` avatar uses `oklch()` functional notation for procedurally-generated placeholder colors (not design tokens) — these are avatar fill placeholders, not shippable color decisions.
