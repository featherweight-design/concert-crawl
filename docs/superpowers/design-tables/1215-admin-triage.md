# Design Property Table — Admin Triage Panel

Source: `design/design_handoff_admin_triage/` (`triage-panel.jsx`, `triage-copy.jsx`, `triage-data.jsx`, `triage-icons.jsx`, `admin-primitives.jsx`, README, READINESS).

Conventions used below:

- **Mobile** = `compact === true` (the 320px scene). **Desktop** = `compact === false` (default). The prototype switches on the `compact` prop, not a media query; production breakpoint is 640px / Tailwind `sm:`.
- Font vars: `ADMIN_FONT = Inter, system-ui, -apple-system, sans-serif`; `ADMIN_MONO = 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`.
- Severity ink per band (`SEVERITY`): `hard → var(--danger)`, `loss → var(--warning)`, `suspect → var(--accent-2, var(--accent))`.
- `sevTint(tier)` → `{ ink, fill: color-mix(in oklab, <ink> 14%, transparent), edge: color-mix(in oklab, <ink> 34%, transparent) }`.
- Numeric style values are unitless in JSX = px.

---

## Component: AttentionPanel

Props: `faults = []`, `queues = []`, `sweep = SWEEP`, `compact = false`, `refreshing = false`, `denseAt = DENSE_AT (7)`, `style`.

Derived: `ordered = orderFaults(faults)`; `dense = ordered.length >= denseAt`; `queueTotal = sum(queues[].count)`; `topTier = CONDITION_META[ordered[0].condition].tier` or `null`; `nothing = ordered.length === 0 && queues.length === 0`.

### Panel shell (`Panel` primitive, `padding={0}`)

| Property      | Mobile                    | Desktop                   |
| ------------- | ------------------------- | ------------------------- |
| background    | `var(--bg-elevated)`      | `var(--bg-elevated)`      |
| border        | `1px solid var(--border)` | `1px solid var(--border)` |
| border-radius | 12                        | 12                        |
| body padding  | 0 (`padding={0}`)         | 0                         |

### Panel header bar (from `Panel`)

| Property                                 | Mobile                    | Desktop                   |
| ---------------------------------------- | ------------------------- | ------------------------- |
| display                                  | flex                      | flex                      |
| align-items                              | center                    | center                    |
| justify-content                          | space-between             | space-between             |
| padding                                  | `14px 18px`               | `14px 18px`               |
| border-bottom                            | `1px solid var(--border)` | `1px solid var(--border)` |
| left cluster display / align-items / gap | flex / center / 10        | flex / center / 10        |

### Header title group (`header`)

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 10     | 10      |
| min-width   | 0      | 0       |

#### `h2` title — copy `T.panel.title` = "Needs attention"

| Property       | Mobile      | Desktop     |
| -------------- | ----------- | ----------- |
| margin         | 0           | 0           |
| font-family    | ADMIN_FONT  | ADMIN_FONT  |
| font-size      | 14          | 14          |
| font-weight    | 700         | 700         |
| color          | `var(--fg)` | `var(--fg)` |
| letter-spacing | `-0.01em`   | `-0.01em`   |

### Header action group (`action`)

| Property                | Mobile           | Desktop                                                                   |
| ----------------------- | ---------------- | ------------------------------------------------------------------------- |
| display                 | flex             | flex                                                                      |
| align-items             | center           | center                                                                    |
| gap                     | 4                | 10                                                                        |
| "checked {t}" MonoLabel | — (not rendered) | rendered, `T.panel.syncedAt(sweep.at)`, color `var(--fg-subtle)`, size 10 |

#### Refresh button (`AdminButton variant="ghost" size="sm" icon="refresh"`)

| Property                                      | Mobile                                               | Desktop                                 |
| --------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| min-height                                    | 44                                                   | 44                                      |
| min-width                                     | 44                                                   | 44                                      |
| height (size sm base)                         | 28 (overridden by min-height 44)                     | 28 (overridden by min-height 44)        |
| padding                                       | `0` (override)                                       | `0 10px` (size sm default)              |
| border-radius                                 | 8                                                    | 8                                       |
| border                                        | `1px solid transparent` (ghost)                      | `1px solid transparent`                 |
| background                                    | `transparent`                                        | `transparent`                           |
| color                                         | `var(--fg)`                                          | `var(--fg)`                             |
| font-family / size / weight / letter-spacing  | ADMIN_FONT / 12 / 600 / `-0.005em`                   | same                                    |
| display / align-items / justify-content / gap | inline-flex / center / center / 6                    | same                                    |
| transition                                    | `background .12s, border-color .12s`                 | same                                    |
| opacity (disabled)                            | 0.45                                                 | 0.45                                    |
| label                                         | visually hidden `SR` — "Refresh" or "Checking…"      | visible text — "Refresh" or "Checking…" |
| icon                                          | `refresh`, size 13 (`sizes.fs + 1`), strokeWidth 1.6 | same                                    |

Refresh icon SVG (`AdminIcon` `refresh`): width/height 13, viewBox `0 0 24 24`, fill `none`, stroke `currentColor`, stroke-width 1.6, linecap/linejoin `round`; paths `M21 12a9 9 0 11-3-6.7` and `M21 4v5h-5`.

### Live region

| Property                  | Mobile                                        | Desktop   |
| ------------------------- | --------------------------------------------- | --------- |
| aria-live                 | polite                                        | polite    |
| aria-atomic               | true                                          | true      |
| style                     | `SR_ONLY`                                     | `SR_ONLY` |
| content when `refreshing` | `T.a11y.checking` = "Checking venue health…"  | same      |
| content otherwise         | `T.a11y.announce(ordered.length, queueTotal)` | same      |

`SR_ONLY` = `position: absolute; width: 1; height: 1; padding: 0; margin: -1; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0`.

### Child order inside the panel body

1. `TriageEmpty` when `nothing`
2. `TierStrip(first, T.tiers.faults, ordered.length, SEVERITY[topTier].ink)` + `FaultRow`× + `ModelNote` when `ordered.length > 0 && !dense`
3. band `TierStrip` + rows per band + `ModelNote` when `ordered.length > 0 && dense`
4. `FaultsClearStrip` when `ordered.length === 0 && queues.length > 0`
5. `TierStrip(T.tiers.queues, queueTotal, ink=undefined)` + `QueueRow`× when `queues.length > 0`

---

## Component: SummaryBadge (`StatusBadge`, `mono`)

Rendered exactly once. Branching:

- `faults > 0` → kind = `topTier === "hard" ? "danger" : topTier === "loss" ? "warning" : "accent"`, text `T.panel.faultCount(n)` = `"{n} fault"` / `"{n} faults"`.
- `faults === 0 && queues > 0` → kind `neutral`, text `T.panel.queueCount(n)` = `"{n} in queue"`.
- else → kind `success`, `dot`, text `T.panel.allClear` = `"all clear"`.

### Badge box

| Property                    | Mobile                       | Desktop                  |
| --------------------------- | ---------------------------- | ------------------------ |
| display / align-items / gap | inline-flex / center / 6     | inline-flex / center / 6 |
| padding                     | `2px 8px`                    | `2px 8px`                |
| border-radius               | 999                          | 999                      |
| font-family                 | ADMIN_MONO (`mono`)          | ADMIN_MONO               |
| font-size                   | 11                           | 11                       |
| font-weight                 | 600                          | 600                      |
| letter-spacing              | `0.04em` (mono)              | `0.04em`                 |
| line-height                 | `16px`                       | `16px`                   |
| white-space                 | nowrap                       | nowrap                   |
| border (variant `soft`)     | `1px solid <palette.border>` | same                     |

### Palettes

| kind    | color (fg)        | background                                             | border-color                                           |
| ------- | ----------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| danger  | `var(--danger)`   | `color-mix(in oklab, var(--danger) 16%, transparent)`  | `color-mix(in oklab, var(--danger) 38%, transparent)`  |
| warning | `var(--warning)`  | `color-mix(in oklab, var(--warning) 18%, transparent)` | `color-mix(in oklab, var(--warning) 38%, transparent)` |
| accent  | `var(--accent)`   | `color-mix(in oklab, var(--accent) 16%, transparent)`  | `color-mix(in oklab, var(--accent) 36%, transparent)`  |
| neutral | `var(--fg-muted)` | `var(--surface-2)`                                     | `var(--border)`                                        |
| success | `var(--success)`  | `color-mix(in oklab, var(--success) 16%, transparent)` | `color-mix(in oklab, var(--success) 35%, transparent)` |

### Success dot (only when `dot`, i.e. all-clear badge)

| Property       | Mobile                                                           | Desktop          |
| -------------- | ---------------------------------------------------------------- | ---------------- |
| width / height | 6 / 6                                                            | 6 / 6            |
| border-radius  | 3                                                                | 3                |
| background     | `var(--success)`                                                 | `var(--success)` |
| box-shadow     | `0 0 0 3px color-mix(in oklab, var(--success) 22%, transparent)` | same             |

---

## Component: TierStrip

Props: `label`, `count`, `ink` (optional), `first` (optional). Doubles as the `h3` heading level.

### Strip container

| Property      | Mobile                                              | Desktop            |
| ------------- | --------------------------------------------------- | ------------------ |
| display       | flex                                                | flex               |
| align-items   | center                                              | center             |
| gap           | 8                                                   | 8                  |
| padding       | `8px 18px`                                          | `8px 18px`         |
| background    | `var(--surface-1)`                                  | `var(--surface-1)` |
| border-top    | `none` when `first`, else `1px solid var(--border)` | same               |
| border-bottom | `1px solid var(--border)`                           | same               |

### Ink dot (rendered only when `ink` truthy — faults strip and band strips; absent on the queues strip)

| Property       | Mobile                                                                        | Desktop |
| -------------- | ----------------------------------------------------------------------------- | ------- |
| width / height | 6 / 6                                                                         | 6 / 6   |
| border-radius  | 3                                                                             | 3       |
| background     | `ink` (`var(--danger)` / `var(--warning)` / `var(--accent-2, var(--accent))`) | same    |
| aria-hidden    | true                                                                          | true    |

### Label (`h3` > `MonoLabel`)

| Property       | Mobile                 | Desktop           |
| -------------- | ---------------------- | ----------------- |
| h3 margin      | 0                      | 0                 |
| font-family    | ADMIN_MONO             | ADMIN_MONO        |
| font-size      | 10 (MonoLabel default) | 10                |
| font-weight    | 700                    | 700               |
| letter-spacing | `0.1em`                | `0.1em`           |
| text-transform | uppercase              | uppercase         |
| color          | `var(--fg-muted)`      | `var(--fg-muted)` |

Label strings: faults tier `"broken now"`; queues tier `"work waiting"`; bands `hard → "not crawling"`, `loss → "losing events"`, `suspect → "worth a look"`.

### Count (right)

| Property            | Mobile             | Desktop            |
| ------------------- | ------------------ | ------------------ |
| wrapper margin-left | `auto`             | `auto`             |
| font-family         | ADMIN_MONO         | ADMIN_MONO         |
| font-size           | 10                 | 10                 |
| font-weight         | 700                | 700                |
| letter-spacing      | `0.1em`            | `0.1em`            |
| text-transform      | uppercase          | uppercase          |
| color               | `var(--fg-subtle)` | `var(--fg-subtle)` |

---

## Component: FaultRow

Props: `f` (fixture: `id, venue, condition, days, dur, d`), `compact`, `dense`.

### Row container (`role="link" tabIndex={0}` — production must be router `<Link>`, `aria-label` preserved)

| Property                     | Mobile                                             | Desktop                   |
| ---------------------------- | -------------------------------------------------- | ------------------------- |
| position                     | relative                                           | relative                  |
| display                      | grid                                               | grid                      |
| grid-template-columns        | `28px 1fr auto`                                    | `28px 1fr auto 96px`      |
| column-gap                   | 12                                                 | 12                        |
| row-gap                      | 0                                                  | 0                         |
| align-items                  | start                                              | start                     |
| padding                      | `13px 14px 13px 15px`                              | `13px 18px 13px 15px`     |
| border-bottom                | `1px solid var(--border)`                          | `1px solid var(--border)` |
| border-left                  | `3px solid <sevTint.ink>`                          | `3px solid <sevTint.ink>` |
| background                   | transparent                                        | transparent               |
| cursor                       | pointer                                            | pointer                   |
| min-height                   | 44                                                 | 44                        |
| outline-offset               | -2                                                 | -2                        |
| rendered row height (README) | 88–112                                             | 74–96                     |
| aria-label                   | `T.a11y.rowLabel(venue, verb, ev.stat, dur, tier)` | same                      |

### Glyph tile

| Property                                | Mobile                                                  | Desktop |
| --------------------------------------- | ------------------------------------------------------- | ------- |
| width / height                          | 28 / 28                                                 | 28 / 28 |
| border-radius                           | 8                                                       | 8       |
| flex-shrink                             | 0                                                       | 0       |
| display / align-items / justify-content | inline-flex / center / center                           | same    |
| color                                   | `<ink>`                                                 | `<ink>` |
| background                              | `color-mix(in oklab, <ink> 14%, transparent)`           | same    |
| border                                  | `1px solid color-mix(in oklab, <ink> 34%, transparent)` | same    |
| aria-hidden                             | true                                                    | true    |
| icon size                               | 15                                                      | 15      |

### Glyph SVGs (`TriageIcon`, size 15, viewBox `0 0 24 24`, fill `none`, stroke `currentColor`, stroke-width 1.7 default, linecap/linejoin `round`, aria-hidden `true`, focusable `false`)

| condition | glyph (lucide)  | paths                                                                                    |
| --------- | --------------- | ---------------------------------------------------------------------------------------- |
| blocked   | `Ban`           | `<circle cx="12" cy="12" r="9"/>` + `M5.6 5.6l12.8 12.8`                                 |
| failed    | `OctagonAlert`  | `M8.4 2.6h7.2l5.8 5.8v7.2l-5.8 5.8H8.4l-5.8-5.8V8.4z` + `M12 8v4.5M12 16.2h.01`          |
| wentDark  | `TrendingDown`  | `M22 17l-8.5-8.5-5 5L2 7` + `M16 17h6v-6`                                                |
| ceiling   | `ArrowUpToLine` | `M4 4h16` + `M12 20V9` + `M7.5 13.5L12 9l4.5 4.5`                                        |
| coverage  | `Link2Off`      | `M9.5 17H7.5a5 5 0 010-10h2` + `M14.5 7h2a5 5 0 013.9 8.2` + `M8.5 12H12` + `M3 3l18 18` |

### Line 1 wrapper

| Property                | Mobile | Desktop |
| ----------------------- | ------ | ------- |
| display                 | flex   | flex    |
| align-items             | center | center  |
| gap                     | 8      | 8       |
| flex-wrap               | wrap   | wrap    |
| parent column min-width | 0      | 0       |

#### Venue name

| Property       | Mobile      | Desktop     |
| -------------- | ----------- | ----------- |
| font-family    | ADMIN_FONT  | ADMIN_FONT  |
| font-size      | 13.5        | 13.5        |
| font-weight    | 700         | 700         |
| color          | `var(--fg)` | `var(--fg)` |
| letter-spacing | `-0.01em`   | `-0.01em`   |
| line-height    | 1.3         | 1.3         |

#### ConditionChip

| Property              | Mobile                                                  | Desktop              |
| --------------------- | ------------------------------------------------------- | -------------------- |
| display / align-items | inline-flex / center                                    | inline-flex / center |
| padding               | `1px 7px`                                               | `1px 7px`            |
| border-radius         | 4                                                       | 4                    |
| font-family           | ADMIN_MONO                                              | ADMIN_MONO           |
| font-size             | 10                                                      | 10                   |
| font-weight           | 700                                                     | 700                  |
| letter-spacing        | `0.09em`                                                | `0.09em`             |
| text-transform        | uppercase                                               | uppercase            |
| line-height           | `15px`                                                  | `15px`               |
| white-space           | nowrap                                                  | nowrap               |
| color                 | `<ink>`                                                 | `<ink>`              |
| background            | `color-mix(in oklab, <ink> 14%, transparent)`           | same                 |
| border                | `1px solid color-mix(in oklab, <ink> 34%, transparent)` | same                 |

Chip labels: `blocked → "Blocked"`, `failed → "Crawl failing"`, `wentDark → "Went dark"`, `ceiling → "Ceiling suspected"`, `coverage → "Coverage gap"`.

#### Visually-hidden severity sentence (`SR`, immediately after the chip)

| Property | Mobile                        | Desktop   |
| -------- | ----------------------------- | --------- |
| style    | `SR_ONLY`                     | `SR_ONLY` |
| content  | `T.a11y.severity[tier] + "."` | same      |

Values: `hard → "Severity: not crawling."`, `loss → "Severity: losing events."`, `suspect → "Severity: worth a look."`

#### Persistence chip (line 1, mobile only)

| Property                                                            | Mobile                                         | Desktop                         |
| ------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| rendered                                                            | yes, wrapper `margin-left: auto`               | — (renders in column 4 instead) |
| "for" MonoLabel                                                     | — (hidden when `compact`)                      | rendered in the column variant  |
| value font-family / size / weight                                   | ADMIN_MONO / 12.5 / 600                        | same                            |
| value color                                                         | `var(--fg-muted)`                              | `var(--fg-muted)`               |
| font-variant-numeric                                                | tabular-nums                                   | tabular-nums                    |
| letter-spacing                                                      | `0.01em`                                       | `0.01em`                        |
| wrapper display / align-items / gap / justify-content / white-space | inline-flex / baseline / 4 / flex-end / nowrap | same                            |

### Line 2 — evidence

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 8      | 8       |
| margin-top  | 4      | 4       |
| flex-wrap   | wrap   | wrap    |

#### Evidence stat

| Property             | Mobile       | Desktop      |
| -------------------- | ------------ | ------------ |
| font-family          | ADMIN_MONO   | ADMIN_MONO   |
| font-size            | 12.5         | 12.5         |
| font-weight          | 600          | 600          |
| color                | `var(--fg)`  | `var(--fg)`  |
| font-variant-numeric | tabular-nums | tabular-nums |
| letter-spacing       | `0.01em`     | `0.01em`     |

Stat strings: blocked `HTTP {d.status}` · failed `{d.failures} failures in a row` · wentDark `{d.baselineCount} → {d.count} events` · ceiling `stuck at {d.count} events` · coverage `{d.matched} of {d.expected} source URLs`.

#### EvidenceBars micro-chart — rendered only when `f.d.series` exists AND condition is `wentDark` or `ceiling`

| Property                    | Mobile                                                          | Desktop  |
| --------------------------- | --------------------------------------------------------------- | -------- |
| width                       | 62                                                              | 74       |
| height                      | 22 (component default)                                          | 22       |
| display / align-items / gap | inline-flex / flex-end / 2                                      | same     |
| flex-shrink                 | 0                                                               | 0        |
| role                        | img                                                             | img      |
| aria-label                  | `T.a11y.evidenceChart({window: series.length, series, count})`  | same     |
| bar flex / min-width        | 1 / 3                                                           | 1 / 3    |
| bar height                  | `max(5, (v / max) * 22)px` where `max = Math.max(...series, 1)` | same     |
| bar border-radius           | 1.5                                                             | 1.5      |
| bar background (last index) | `tone` = severity `ink`                                         | same     |
| bar background (other)      | `var(--border-strong)`                                          | same     |
| bar opacity (last / other)  | 1 / 0.75                                                        | 1 / 0.75 |

### Line 3 — context detail

| Property    | Mobile                             | Desktop           |
| ----------- | ---------------------------------- | ----------------- |
| rendered    | only when NOT (`compact && dense`) | always            |
| font-family | ADMIN_FONT                         | ADMIN_FONT        |
| font-size   | 11.5                               | 11.5              |
| color       | `var(--fg-muted)`                  | `var(--fg-muted)` |
| margin-top  | 3                                  | 3                 |
| line-height | 1.45                               | 1.45              |
| text-wrap   | pretty                             | pretty            |

Detail strings:

- blocked — `{d.refusals} refusals in a row · last success {d.lastSuccess}`
- failed — `{d.errorClass} · pauses itself at {d.pauseAt}`
- wentDark — `{d.pct}% against a {d.window}-day average of {d.avg} · flags at {d.threshold}%`
- ceiling — `{d.runs} runs at the same round number · {d.was} before {d.wasWhen}`
- coverage — `{d.expected - d.matched} stopped matching · was {d.expected}/{d.expected} on {d.wasWhen}`

### ActionLink cell

| Property                                      | Mobile                                                                                                                              | Desktop         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| wrapper align-self                            | center                                                                                                                              | center          |
| display / align-items / justify-content / gap | inline-flex / center / center / 4                                                                                                   | same            |
| min-height                                    | 44                                                                                                                                  | 44              |
| min-width                                     | 44                                                                                                                                  | 0               |
| padding                                       | `0 2px`                                                                                                                             | `0 2px`         |
| font-family                                   | ADMIN_FONT                                                                                                                          | ADMIN_FONT      |
| font-size                                     | 11.5                                                                                                                                | 11.5            |
| font-weight                                   | 700                                                                                                                                 | 700             |
| color                                         | `var(--signal)`                                                                                                                     | `var(--signal)` |
| white-space                                   | nowrap                                                                                                                              | nowrap          |
| chevron                                       | `chevR`, size 12, strokeWidth 2.1, viewBox `0 0 24 24`, fill none, stroke currentColor, linecap/linejoin round, path `M9 6l6 6-6 6` | same            |
| separately focusable                          | no                                                                                                                                  | no              |

Action labels by condition: blocked → `"Open venue"`; failed → `"Open run"`; wentDark → `"Open run"`; coverage → `"Open venue"`; ceiling → `"Diagnostics"`.

### Persistence column (desktop only, grid column 4, width 96px)

| Property    | Mobile | Desktop                                                                                                  |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------- |
| rendered    | —      | yes                                                                                                      |
| align-self  | —      | center                                                                                                   |
| text-align  | —      | right                                                                                                    |
| "for" label | —      | `MonoLabel`, ADMIN_MONO, size 9, weight 700, letter-spacing `0.1em`, uppercase, color `var(--fg-subtle)` |
| value       | —      | ADMIN_MONO, 12.5, 600, `var(--fg-muted)`, tabular-nums, letter-spacing `0.01em`                          |

### Hover / focus / active states

| Property     | Mobile                                                            | Desktop          |
| ------------ | ----------------------------------------------------------------- | ---------------- |
| hover style  | — (none defined in the prototype)                                 | — (none defined) |
| focus style  | — (only `outlineOffset: -2` set; no outline colour/width defined) | same             |
| active style | —                                                                 | —                |
| transition   | —                                                                 | —                |
| transform    | —                                                                 | —                |

---

## Component: QueueRow

Props: `q` (`id, kind, glyph, count, breakdown, action`), `compact`.

### Row container (`role="link" tabIndex={0}`, aria-label = `T.a11y.queueRowLabel(title)` = the title string)

| Property                    | Mobile                    | Desktop                   |
| --------------------------- | ------------------------- | ------------------------- |
| display                     | grid                      | grid                      |
| grid-template-columns       | `24px 1fr auto`           | `24px 1fr auto`           |
| column-gap                  | 12                        | 12                        |
| align-items                 | center                    | center                    |
| padding                     | `11px 14px`               | `11px 18px`               |
| border-bottom               | `1px solid var(--border)` | `1px solid var(--border)` |
| border-left (severity rail) | — (absent by design)      | —                         |
| background                  | `var(--surface-1)`        | `var(--surface-1)`        |
| cursor                      | pointer                   | pointer                   |
| min-height                  | 44                        | 44                        |
| outline-offset              | -2                        | -2                        |

### Neutral glyph tile

| Property                                | Mobile                           | Desktop              |
| --------------------------------------- | -------------------------------- | -------------------- |
| width / height                          | 24 / 24                          | 24 / 24              |
| border-radius                           | 7                                | 7                    |
| display / align-items / justify-content | inline-flex / center / center    | same                 |
| color                                   | `var(--fg-muted)`                | `var(--fg-muted)`    |
| background                              | `var(--bg-elevated)`             | `var(--bg-elevated)` |
| border                                  | `1px solid var(--border-strong)` | same                 |
| aria-hidden                             | true                             | true                 |
| icon size                               | 13                               | 13                   |

Queue glyph SVGs (size 13, viewBox `0 0 24 24`, fill none, stroke currentColor, stroke-width 1.7, linecap/linejoin round):

- `flags` (lucide `Flag`) — `M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z` + `M4 22v-7`
- `prices` (lucide `Tag`) — `M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z` + `M7 7h.01`

### Title line

| Property             | Mobile       | Desktop      |
| -------------------- | ------------ | ------------ |
| font-family          | ADMIN_FONT   | ADMIN_FONT   |
| font-size            | 12.5         | 12.5         |
| font-weight          | 600          | 600          |
| color                | `var(--fg)`  | `var(--fg)`  |
| line-height          | 1.35         | 1.35         |
| font-variant-numeric | tabular-nums | tabular-nums |
| parent min-width     | 0            | 0            |

Titles: `eventFlags → "{n} events flagged for review"`; `priceSubmissions → "{n} price submissions waiting"`.

### Detail line

| Property    | Mobile             | Desktop            |
| ----------- | ------------------ | ------------------ |
| font-family | ADMIN_FONT         | ADMIN_FONT         |
| font-size   | 11                 | 11                 |
| color       | `var(--fg-subtle)` | `var(--fg-subtle)` |
| margin-top  | 2                  | 2                  |
| line-height | 1.4                | 1.4                |
| text-wrap   | pretty             | pretty             |

Details: `eventFlags → "{breakdown} · below the auto-approve threshold"`; `priceSubmissions → breakdown` verbatim.

### ActionLink (queue)

| Property        | Mobile                                                           | Desktop                                     |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| compact prop    | `true`                                                           | `false` (passed through from row `compact`) |
| min-width       | 44                                                               | 0                                           |
| all other props | as ActionLink table above                                        | as ActionLink table above                   |
| label           | `eventFlags → "Open Review"`, `priceSubmissions → "Open prices"` | same                                        |

---

## Component: ModelNote

| Property      | Mobile                                                                           | Desktop                   |
| ------------- | -------------------------------------------------------------------------------- | ------------------------- |
| padding       | `9px 18px`                                                                       | `9px 18px`                |
| border-bottom | `1px solid var(--border)`                                                        | `1px solid var(--border)` |
| font-family   | ADMIN_FONT                                                                       | ADMIN_FONT                |
| font-size     | 11                                                                               | 11                        |
| color         | `var(--fg-subtle)`                                                               | `var(--fg-subtle)`        |
| line-height   | 1.4                                                                              | 1.4                       |
| content       | `T.model` = "Rows clear themselves on the next clean crawl. Nothing to dismiss." | same                      |
| rendered      | only when `ordered.length > 0` (both dense and undense branches)                 | same                      |

---

## Component: FaultsClearStrip

Rendered only when `ordered.length === 0 && queues.length > 0`.

### Container

| Property      | Mobile                    | Desktop                   |
| ------------- | ------------------------- | ------------------------- |
| display       | flex                      | flex                      |
| align-items   | center                    | center                    |
| gap           | 10                        | 10                        |
| padding       | `12px 18px`               | `12px 18px`               |
| border-bottom | `1px solid var(--border)` | `1px solid var(--border)` |

### Check tile

| Property                                | Mobile                                                         | Desktop          |
| --------------------------------------- | -------------------------------------------------------------- | ---------------- |
| width / height                          | 22 / 22                                                        | 22 / 22          |
| border-radius                           | 11                                                             | 11               |
| flex-shrink                             | 0                                                              | 0                |
| display / align-items / justify-content | inline-flex / center / center                                  | same             |
| color                                   | `var(--success)`                                               | `var(--success)` |
| background                              | `color-mix(in oklab, var(--success) 16%, transparent)`         | same             |
| border                                  | — (none)                                                       | —                |
| aria-hidden                             | true                                                           | true             |
| icon                                    | `check`, size 12, strokeWidth 2.2, path `M5 12.5l4.5 4.5L19 7` | same             |

### Text

| Property    | Mobile                                                                                     | Desktop     |
| ----------- | ------------------------------------------------------------------------------------------ | ----------- |
| font-family | ADMIN_FONT                                                                                 | ADMIN_FONT  |
| font-size   | 12.5                                                                                       | 12.5        |
| color       | `var(--fg)`                                                                                | `var(--fg)` |
| text-wrap   | pretty                                                                                     | pretty      |
| content     | `T.empty.faultsClearStrip(sweep)` = `"{venues} venues crawling clean · last checked {at}"` | same        |

---

## Component: TriageEmpty

Rendered only when `ordered.length === 0 && queues.length === 0`.

### Container

| Property    | Mobile      | Desktop     |
| ----------- | ----------- | ----------- |
| display     | flex        | flex        |
| gap         | 12          | 16          |
| align-items | flex-start  | flex-start  |
| padding     | `20px 16px` | `26px 22px` |

### Check tile

| Property                                | Mobile                                                           | Desktop          |
| --------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| width / height                          | 34 / 34                                                          | 34 / 34          |
| border-radius                           | 10                                                               | 10               |
| flex-shrink                             | 0                                                                | 0                |
| display / align-items / justify-content | inline-flex / center / center                                    | same             |
| color                                   | `var(--success)`                                                 | `var(--success)` |
| background                              | `color-mix(in oklab, var(--success) 14%, transparent)`           | same             |
| border                                  | `1px solid color-mix(in oklab, var(--success) 32%, transparent)` | same             |
| icon                                    | `check`, size 19, strokeWidth 2.2, path `M5 12.5l4.5 4.5L19 7`   | same             |

### Eyebrow (`MonoLabel`)

| Property                    | Mobile                          | Desktop          |
| --------------------------- | ------------------------------- | ---------------- |
| font-family / size / weight | ADMIN_MONO / 10 / 700           | same             |
| letter-spacing              | `0.1em`                         | `0.1em`          |
| text-transform              | uppercase                       | uppercase        |
| color                       | `var(--success)`                | `var(--success)` |
| content                     | `T.empty.eyebrow` = "all clear" | same             |

### Title

| Property       | Mobile                                | Desktop     |
| -------------- | ------------------------------------- | ----------- |
| font-family    | ADMIN_FONT                            | ADMIN_FONT  |
| font-size      | 16                                    | 18          |
| font-weight    | 700                                   | 700         |
| color          | `var(--fg)`                           | `var(--fg)` |
| letter-spacing | `-0.02em`                             | `-0.02em`   |
| margin-top     | 6                                     | 6           |
| line-height    | 1.2                                   | 1.2         |
| content        | `T.empty.title` = "Nothing's broken." | same        |

### Body

| Property         | Mobile                                                                                                                 | Desktop           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------- |
| font-family      | ADMIN_FONT                                                                                                             | ADMIN_FONT        |
| font-size        | 12.5                                                                                                                   | 12.5              |
| color            | `var(--fg-muted)`                                                                                                      | `var(--fg-muted)` |
| margin-top       | 6                                                                                                                      | 6                 |
| line-height      | 1.5                                                                                                                    | 1.5               |
| max-width        | 420                                                                                                                    | 420               |
| text-wrap        | pretty                                                                                                                 | pretty            |
| parent min-width | 0                                                                                                                      | 0                 |
| content          | `T.empty.body(sweep)` = `"All {venues} venues crawled clean at {at}. {events} events came in. Both queues are empty."` | same              |

### Aside

| Property                        | Mobile                                         | Desktop            |
| ------------------------------- | ---------------------------------------------- | ------------------ |
| wrapper margin-top              | 10                                             | 10                 |
| font-family / size / weight     | ADMIN_MONO / 10 / 700                          | same               |
| letter-spacing / text-transform | `0.1em` / uppercase                            | same               |
| color                           | `var(--fg-subtle)`                             | `var(--fg-subtle)` |
| content                         | `T.empty.aside(sweep)` = `"Next sweep {next}"` | same               |

---

## Ordering contract (`orderFaults`)

| Rule              | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| primary key       | `SEVERITY[tier].rank` ascending — `hard: 0`, `loss: 1`, `suspect: 2`                                                          |
| secondary key     | `b.days - a.days` (longest-standing first)                                                                                    |
| mutation          | non-mutating (`[...list].sort`)                                                                                               |
| unknown condition | prototype throws `TypeError` reading `'tier'`; READINESS requires production to sort unknown conditions **last**, never throw |

---

## State Coverage — AttentionPanel

| State                               | Triggering condition                                                  | Component rendered                                                                                                                                                                  | Key props required                                |
| ----------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| All clear / empty                   | `orderFaults(faults).length === 0 && queues.length === 0`             | `TriageEmpty` (only child besides the live region)                                                                                                                                  | `sweep = { venues, at, events, next }`, `compact` |
| Queues only — faults-clear strip    | `ordered.length === 0 && queues.length > 0`                           | `FaultsClearStrip` + queues `TierStrip` + `QueueRow`×                                                                                                                               | `sweep.venues`, `sweep.at`, `queues[]`            |
| Faults only                         | `ordered.length > 0 && queues.length === 0`                           | faults `TierStrip` + `FaultRow`× + `ModelNote`; no queues tier                                                                                                                      | `faults[]`                                        |
| Both tiers                          | `ordered.length > 0 && queues.length > 0`                             | faults tier + `ModelNote` + queues `TierStrip` + `QueueRow`×                                                                                                                        | `faults[]`, `queues[]`                            |
| One fault                           | `ordered.length === 1`                                                | same as faults-only; badge reads `"1 fault"` (singular via `faultCount`)                                                                                                            | `faults` = single row                             |
| Undense (banded off)                | `ordered.length < denseAt` (`denseAt` default `DENSE_AT = 7`, a prop) | single `TierStrip` label `"broken now"`, ink = `SEVERITY[topTier].ink` (worst band **present**, not always danger)                                                                  | `denseAt`                                         |
| Dense / banded                      | `ordered.length >= denseAt` (default 7; high-volume fixture = 16)     | one `TierStrip` per non-empty band in `BAND_KEYS` order (`hard`, `loss`, `suspect`), each with its own ink dot + count; `first` only on index 0; single `ModelNote` after all bands | `denseAt`, `faults[]`                             |
| Dense + mobile (context line drops) | `compact === true && dense === true`                                  | `FaultRow` omits the line-3 detail div; stat + micro-chart still render                                                                                                             | `compact`, `dense`                                |
| Refreshing                          | `refreshing === true`                                                 | live region reads `"Checking venue health…"`; Refresh button label = `"Checking…"` (visually hidden on mobile)                                                                      | `refreshing`                                      |
| Idle (not refreshing)               | `refreshing === false`                                                | live region reads `announce(faults, queueItems)`; button label `"Refresh"`                                                                                                          | —                                                 |
| Header badge — danger               | `faults > 0 && topTier === "hard"`                                    | `StatusBadge kind="danger" mono` = `"{n} faults"`                                                                                                                                   | `topTier` from first ordered row                  |
| Header badge — warning              | `faults > 0 && topTier === "loss"`                                    | `StatusBadge kind="warning" mono`                                                                                                                                                   | —                                                 |
| Header badge — accent               | `faults > 0 && topTier === "suspect"`                                 | `StatusBadge kind="accent" mono`                                                                                                                                                    | —                                                 |
| Header badge — neutral queue count  | `faults === 0 && queueTotal > 0`                                      | `StatusBadge kind="neutral" mono` = `"{n} in queue"` (n = summed `count`, not row count)                                                                                            | `queues[].count`                                  |
| Header badge — all clear            | `faults === 0 && queueTotal === 0`                                    | `StatusBadge kind="success" mono dot` = `"all clear"`                                                                                                                               | —                                                 |

### State Coverage — FaultRow (fault conditions)

| State                             | Triggering condition                                                                                                                                                                                                                         | Component rendered                                                                                                     | Key props required                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Blocked                           | `f.condition === "blocked"` → tier `hard`, ink `var(--danger)`                                                                                                                                                                               | `FaultRow` with `Ban` glyph, chip "Blocked", action "Open venue"                                                       | `d = { status, refusals, lastSuccess }`, `dur`, `days`, `venue`       |
| Crawl failing                     | `f.condition === "failed"` → tier `hard`, ink `var(--danger)`                                                                                                                                                                                | `OctagonAlert` glyph, chip "Crawl failing", action "Open run"                                                          | `d = { failures, errorClass, pauseAt }`                               |
| Went dark                         | `f.condition === "wentDark"` → tier `loss`, ink `var(--warning)`                                                                                                                                                                             | `TrendingDown` glyph, chip "Went dark", action "Open run", **micro-chart**                                             | `d = { count, baselineCount, avg, pct, window, threshold, series[] }` |
| Coverage gap                      | `f.condition === "coverage"` → tier `loss`, ink `var(--warning)`                                                                                                                                                                             | `Link2Off` glyph, chip "Coverage gap", action "Open venue", **no chart** (no `series`)                                 | `d = { matched, expected, wasWhen }`                                  |
| Ceiling suspected                 | `f.condition === "ceiling"` → tier `suspect`, ink `var(--accent-2, var(--accent))`                                                                                                                                                           | `ArrowUpToLine` glyph, chip "Ceiling suspected", action "Diagnostics", **micro-chart**                                 | `d = { count, runs, was, wasWhen, series[] }`                         |
| Ceiling — pinned-count evidence   | `d.series` tail is a repeated identical value (e.g. `[34,31,20,20,20,20,20]`, `runs = 5`)                                                                                                                                                    | same `FaultRow`; detail = `"{runs} runs at the same round number · {was} before {wasWhen}"`                            | `d.runs`, `d.count`                                                   |
| Ceiling — horizon-shrank evidence | Higher `was` value vs current `count` with an earlier `wasWhen` (e.g. `was: 41`, `count: 25`, `wasWhen: "last week"`)                                                                                                                        | same `FaultRow`; **same single sentence** — the handoff does NOT define a second ceiling copy variant                  | `d.was`, `d.wasWhen`, `d.count`                                       |
| Micro-chart shown                 | `f.d.series && (condition === "wentDark" \|\| condition === "ceiling")`                                                                                                                                                                      | `EvidenceBars` at width 62 (mobile) / 74 (desktop)                                                                     | `series[]`, `tone = tier ink`, `count`                                |
| Micro-chart hidden                | condition is `blocked`, `failed`, or `coverage` (no `series`)                                                                                                                                                                                | evidence line renders stat only                                                                                        | —                                                                     |
| Severity band `hard`              | `CONDITION_META[condition].tier === "hard"`                                                                                                                                                                                                  | rail + tile + chip in `var(--danger)`; SR text "Severity: not crawling."; aria "Broken for {dur}."                     | —                                                                     |
| Severity band `loss`              | tier `loss`                                                                                                                                                                                                                                  | `var(--warning)`; SR "Severity: losing events."; aria "Broken for {dur}."                                              | —                                                                     |
| Severity band `suspect`           | tier `suspect`                                                                                                                                                                                                                               | `var(--accent-2, var(--accent))`; SR "Severity: worth a look."; aria uses **"Like this for {dur}."**, not "Broken for" | `tier` must reach `a11y.rowLabel`                                     |
| Persistence as column             | `compact === false`                                                                                                                                                                                                                          | 4th grid column, 96px, right-aligned, with "for" MonoLabel                                                             | `dur`                                                                 |
| Persistence as chip               | `compact === true`                                                                                                                                                                                                                           | inline on line 1, `margin-left: auto`, "for" label suppressed                                                          | `dur`, `compact`                                                      |
| Below-threshold fault present     | e.g. Hi-Dive `pct: -54` vs `threshold: -60`                                                                                                                                                                                                  | still renders as a normal `wentDark` row — fixture is illustrative; production membership is derived server-side       | —                                                                     |
| Threshold source                  | `denseAt` default `DENSE_AT = 7` (banding); went-dark flag threshold comes from the row payload `d.threshold` (fixtures: `-60`); auto-pause at `d.pauseAt` (fixtures: `8`); baseline window `d.window` (fixtures: `7`, also `series.length`) | —                                                                                                                      | —                                                                     |

### State Coverage — QueueRow

| State                   | Triggering condition            | Component rendered                                                                                                                             | Key props required                                                   |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Event flags queue       | `q.kind === "eventFlags"`       | `QueueRow`, `Flag` glyph, title "{n} events flagged for review", detail "{breakdown} · below the auto-approve threshold", action "Open Review" | `count`, `breakdown`, `glyph: "flags"`, `action: "openReview"`       |
| Price submissions queue | `q.kind === "priceSubmissions"` | `QueueRow`, `Tag` glyph, title "{n} price submissions waiting", detail = breakdown verbatim, action "Open prices"                              | `count`, `breakdown`, `glyph: "prices"`, `action: "openSubmissions"` |
| Queue tier strip        | `queues.length > 0`             | `TierStrip label="work waiting" count={queueTotal}` with **no ink dot** and `first` unset (so it always draws a top border)                    | `queues[]`                                                           |
| Queues absent           | `queues.length === 0`           | no queue tier strip, no queue rows                                                                                                             | —                                                                    |

### Accessibility contract (must survive the build)

| Item                                | Value                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading chain                       | `h1` dashboard → `h2` panel title → `h3` per tier/band strip                                                                                 |
| Live region                         | `aria-live="polite"`, `aria-atomic="true"`, visually hidden, one sentence                                                                    |
| Announce (faults or queues present) | `"{f} fault(s), {q} item(s) in the queues."`                                                                                                 |
| Announce (both zero)                | `"Nothing is broken. Both queues are clear."`                                                                                                |
| Row label                           | `"{venue} — {verb}. {stat}. Broken for {dur}."` / `"… Like this for {dur}."` when `suspect`                                                  |
| Chart label                         | `"Daily event counts for the last {window} days: {series joined by ', '}. Latest {count}."`                                                  |
| Focus order                         | Refresh → each fault row in displayed order → each queue row. One stop per row; ActionLink is not focusable. Identical on mobile and desktop |
| Touch targets                       | rows ≥ 44 min-height (74–96 desktop / 88–112 mobile rendered); Refresh 44×44; action cell 44 tall                                            |
| Production swap                     | rows become router `<Link>`; keep `aria-label`                                                                                               |
