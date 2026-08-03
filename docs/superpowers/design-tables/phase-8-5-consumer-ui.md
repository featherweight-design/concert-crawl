# Design Property Table — Phase 8.5 Consumer UI (Pass A: PendingCardB)

Source file: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/pending-card.jsx`

---

## Constants

| Name    | Value                  |
| ------- | ---------------------- |
| `AZURE` | `oklch(0.62 0.12 240)` |
| `GOLD`  | `oklch(0.66 0.14 78)`  |

---

## Token Bundle: `pendingTokens(kind)`

### kind === "community" (default)

| Token         | Value                                                            |
| ------------- | ---------------------------------------------------------------- |
| `color`       | `oklch(0.62 0.12 240)` (AZURE)                                   |
| `label`       | `"Community"`                                                    |
| `bg`          | `color-mix(in oklab, oklch(0.62 0.12 240) 6%, var(--surface-1))` |
| `border`      | `color-mix(in oklab, oklch(0.62 0.12 240) 32%, var(--border))`   |
| `strip`       | `color-mix(in oklab, oklch(0.62 0.12 240) 12%, transparent)`     |
| `stripBorder` | `color-mix(in oklab, oklch(0.62 0.12 240) 26%, var(--border))`   |
| `pill`        | `color-mix(in oklab, oklch(0.62 0.12 240) 16%, transparent)`     |

### kind === "boxoffice"

| Token         | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| `color`       | `oklch(0.66 0.14 78)` (GOLD)                                    |
| `label`       | `"Box office"`                                                  |
| `bg`          | `color-mix(in oklab, oklch(0.66 0.14 78) 8%, var(--surface-1))` |
| `border`      | `color-mix(in oklab, oklch(0.66 0.14 78) 38%, var(--border))`   |
| `strip`       | `color-mix(in oklab, oklch(0.66 0.14 78) 14%, transparent)`     |
| `stripBorder` | `color-mix(in oklab, oklch(0.66 0.14 78) 30%, var(--border))`   |
| `pill`        | `color-mix(in oklab, oklch(0.66 0.14 78) 22%, transparent)`     |

---

## Component: `PendingDot`

### Props

| Prop     | Default                        |
| -------- | ------------------------------ |
| `size`   | `7`                            |
| `filled` | `false`                        |
| `color`  | `oklch(0.62 0.12 240)` (AZURE) |

### SVG

| Property     | Value         |
| ------------ | ------------- |
| `width`      | `size` (prop) |
| `height`     | `size` (prop) |
| `viewBox`    | `"0 0 7 7"`   |
| `flexShrink` | `0`           |

### circle

| Property      | Value                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `cx`          | `3.5`                                                                          |
| `cy`          | `3.5`                                                                          |
| `r`           | `2.6`                                                                          |
| `fill`        | `color` (prop) when `filled === true`; `"transparent"` when `filled === false` |
| `stroke`      | `color` (prop)                                                                 |
| `strokeWidth` | `1.1`                                                                          |

---

## Component: `LockGlyph`

### Props

| Prop   | Default |
| ------ | ------- |
| `size` | `10`    |

### SVG

| Property  | Value         |
| --------- | ------------- |
| `width`   | `size` (prop) |
| `height`  | `size` (prop) |
| `viewBox` | `"0 0 10 10"` |
| `fill`    | `"none"`      |

### rect

| Property      | Value          |
| ------------- | -------------- |
| `x`           | `2`            |
| `y`           | `4.5`          |
| `width`       | `6`            |
| `height`      | `4`            |
| `rx`          | `0.8`          |
| `stroke`      | `currentColor` |
| `strokeWidth` | `1.1`          |

### path (shackle)

| Property        | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| `d`             | `"M3.4 4.5V3.2A1.6 1.6 0 015 1.6a1.6 1.6 0 011.6 1.6V4.5"` |
| `stroke`        | `currentColor`                                             |
| `strokeWidth`   | `1.1`                                                      |
| `fill`          | `"none"`                                                   |
| `strokeLinecap` | `"round"`                                                  |

---

## Component: `CheckGlyph`

### Props

| Prop    | Default          |
| ------- | ---------------- |
| `size`  | `10`             |
| `color` | `"currentColor"` |

### SVG

| Property  | Value         |
| --------- | ------------- |
| `width`   | `size` (prop) |
| `height`  | `size` (prop) |
| `viewBox` | `"0 0 10 10"` |
| `fill`    | `"none"`      |

### path

| Property         | Value                      |
| ---------------- | -------------------------- |
| `d`              | `"M1.8 5.2L4 7.4 8.4 2.6"` |
| `stroke`         | `color` (prop)             |
| `strokeWidth`    | `1.6`                      |
| `strokeLinecap`  | `"round"`                  |
| `strokeLinejoin` | `"round"`                  |

---

## Component: `ArrowGlyph`

### Props

| Prop   | Default   |
| ------ | --------- |
| `size` | `13`      |
| `dir`  | `"right"` |

### SVG

| Property    | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| `width`     | `size` (prop)                                                                 |
| `height`    | `size` (prop)                                                                 |
| `viewBox`   | `"0 0 12 12"`                                                                 |
| `fill`      | `"none"`                                                                      |
| `transform` | `rotate(0deg)` when `dir === "right"`; `rotate(180deg)` when `dir === "left"` |

### path

| Property         | Value                            |
| ---------------- | -------------------------------- |
| `d`              | `"M2.5 6h7M6 2.5l3.5 3.5L6 9.5"` |
| `stroke`         | `currentColor`                   |
| `strokeWidth`    | `1.8`                            |
| `strokeLinecap`  | `"round"`                        |
| `strokeLinejoin` | `"round"`                        |

---

## Component: `StarGlyph`

### Props

| Prop    | Default                      |
| ------- | ---------------------------- |
| `size`  | `10`                         |
| `color` | `oklch(0.66 0.14 78)` (GOLD) |

### SVG

| Property     | Value         |
| ------------ | ------------- |
| `width`      | `size` (prop) |
| `height`     | `size` (prop) |
| `viewBox`    | `"0 0 10 10"` |
| `flexShrink` | `0`           |

### path

| Property | Value                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| `d`      | `"M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"` |
| `fill`   | `color` (prop)                                                                     |

---

## Component: `Eyebrow`

### Props

| Prop       | Default              |
| ---------- | -------------------- |
| `children` | —                    |
| `color`    | `"var(--fg-subtle)"` |

### Container div

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `9px`                         |
| `color`          | `color` (prop)                |
| `letter-spacing` | `0.06em`                      |
| `text-transform` | `uppercase`                   |

---

## Component: `PendingTrustPill`

### Props

| Prop   | Default |
| ------ | ------- |
| `kind` | —       |

### Container span

| Property         | Value                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `display`        | `inline-flex`                                                                                                       |
| `align-items`    | `center`                                                                                                            |
| `gap`            | `4px`                                                                                                               |
| `padding`        | `2px 6px`                                                                                                           |
| `border-radius`  | `4px`                                                                                                               |
| `background`     | `t.pill` (from `pendingTokens(kind)`)                                                                               |
| `color`          | `t.color` (from `pendingTokens(kind)`)                                                                              |
| `border`         | `1px solid color-mix(in oklab, oklch(0.66 0.14 78) 60%, transparent)` when `kind === "boxoffice"`; `none` otherwise |
| `font-family`    | `'JetBrains Mono', monospace`                                                                                       |
| `font-size`      | `9px`                                                                                                               |
| `letter-spacing` | `0.06em`                                                                                                            |
| `text-transform` | `uppercase`                                                                                                         |
| `font-weight`    | `700`                                                                                                               |
| `line-height`    | `1`                                                                                                                 |
| `white-space`    | `nowrap`                                                                                                            |

### Conditional rendering

| Condition              | Behavior                                          |
| ---------------------- | ------------------------------------------------- |
| `kind === "boxoffice"` | Renders `<StarGlyph size={8}/>` before label text |
| `kind !== "boxoffice"` | No icon; label text only                          |

### Label text

| kind          | Text rendered  |
| ------------- | -------------- |
| `"community"` | `"Community"`  |
| `"boxoffice"` | `"Box office"` |

---

## Component: `PendingCardB`

### Props

| Prop          | Type / Default                                                                |
| ------------- | ----------------------------------------------------------------------------- |
| `floor`       | number, default `48`                                                          |
| `ceiling`     | number or null, default `null`                                                |
| `tier`        | string, default `"GA"`                                                        |
| `vendor`      | string, default `"AXS"`                                                       |
| `kind`        | `"community"` \| `"boxoffice"`, default `"community"`                         |
| `action`      | string or null, default `null`                                                |
| `method`      | string or null, default `null`                                                |
| `submitter`   | `{ handle, url }` or omit/null, default `{ handle: "@hugh", url: "/u/hugh" }` |
| `submittedAt` | string, default `"2h ago"`                                                    |
| `confirms`    | number, default `1`                                                           |
| `needed`      | number, default `2`                                                           |
| `view`        | `"other"` \| `"submitter"` \| `"self-locked"`, default `"other"`              |
| `note`        | string or null, default `null`                                                |

### Derived values

| Variable      | Expression                                                       |
| ------------- | ---------------------------------------------------------------- |
| `t`           | `pendingTokens(kind)`                                            |
| `isSubmitter` | `view === "submitter" \|\| view === "self-locked"`               |
| `isBox`       | `kind === "boxoffice"`                                           |
| `boSubtier`   | `boxOfficeAction(action, method)` when `isBox`; `null` otherwise |

---

### Outer container

| Property        | Value                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `padding`       | `0`                                                                                                      |
| `border-radius` | `12px`                                                                                                   |
| `background`    | `t.bg` when `isBox`; `var(--surface-1)` otherwise                                                        |
| `border`        | `1px solid ${t.border}` when `isBox`; `1px solid var(--border)` otherwise                                |
| `box-shadow`    | `inset 0 1px 0 color-mix(in oklab, oklch(0.66 0.14 78) 40%, transparent)` when `isBox`; `none` otherwise |
| `overflow`      | `hidden`                                                                                                 |

---

### Pending strip

| Property          | Value                        |
| ----------------- | ---------------------------- |
| `padding`         | `8px 14px`                   |
| `background`      | `t.strip`                    |
| `border-bottom`   | `1px solid ${t.stripBorder}` |
| `display`         | `flex`                       |
| `align-items`     | `center`                     |
| `justify-content` | `space-between`              |
| `gap`             | `10px`                       |
| `flex-wrap`       | `wrap`                       |

#### Strip left group (inline-flex)

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `display`        | `inline-flex`                 |
| `align-items`    | `center`                      |
| `gap`            | `8px`                         |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `9.5px`                       |
| `color`          | `t.color`                     |
| `letter-spacing` | `0.08em`                      |
| `text-transform` | `uppercase`                   |
| `font-weight`    | `700`                         |

#### Strip left group — contents

| Element        | Value                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Pending" span | literal text `"Pending"`                                                                                                                                                    |
| Separator span | `"·"` at `opacity: 0.4`                                                                                                                                                     |
| Dots span      | `display: inline-flex; gap: 3px`; renders `needed` `<PendingDot>` elements; dots where `i < confirms` get `filled={true}`, rest `filled={false}`; all use `color={t.color}` |
| Count span     | `"{confirms} of {needed} confirmed"`                                                                                                                                        |

#### Strip right span ("N to go")

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `9px`                         |
| `color`          | `var(--fg-subtle)`            |
| `letter-spacing` | `0.04em`                      |
| `text-transform` | `uppercase`                   |
| Content          | `"{needed - confirms} to go"` |

---

### Body container

| Property  | Value            |
| --------- | ---------------- |
| `padding` | `14px 14px 12px` |

---

### Top row (Eyebrow row)

| Property          | Value           |
| ----------------- | --------------- |
| `display`         | `flex`          |
| `align-items`     | `center`        |
| `justify-content` | `space-between` |

#### Eyebrow text

| Condition         | `color` prop                           | `children`     |
| ----------------- | -------------------------------------- | -------------- |
| `isBox === true`  | `t.color`                              | `"Box office"` |
| `isBox === false` | `"var(--fg-subtle)"` (Eyebrow default) | `"Tickets"`    |

---

### Headline row

| Property      | Value      |
| ------------- | ---------- |
| `margin-top`  | `6px`      |
| `display`     | `flex`     |
| `align-items` | `baseline` |
| `gap`         | `10px`     |
| `flex-wrap`   | `wrap`     |

#### Price span

| Property         | Value                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `font-family`    | `Inter, system-ui`                                                                                          |
| `font-weight`    | `800`                                                                                                       |
| `font-size`      | `28px`                                                                                                      |
| `color`          | `var(--fg)`                                                                                                 |
| `letter-spacing` | `-0.025em`                                                                                                  |
| `line-height`    | `1.05`                                                                                                      |
| Content          | `formatRange(floor, ceiling)` → `"$floor–$ceiling"` when `ceiling && ceiling > floor`; `"$floor"` otherwise |

#### Tier span

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `11px`                        |
| `color`          | `var(--fg-muted)`             |
| `letter-spacing` | `0.06em`                      |
| `text-transform` | `uppercase`                   |
| `font-weight`    | `700`                         |
| Content          | `tier` prop value             |

#### "face value · no fees" span (conditional)

| Condition         | Renders           |
| ----------------- | ----------------- |
| `isBox === true`  | Renders this span |
| `isBox === false` | Does not render   |

| Property         | Value                    |
| ---------------- | ------------------------ |
| `font-family`    | `Inter, system-ui`       |
| `font-weight`    | `600`                    |
| `font-size`      | `12px`                   |
| `color`          | `t.color`                |
| `letter-spacing` | `-0.005em`               |
| Content          | `"face value · no fees"` |

#### PendingTrustPill

Always renders; receives `kind` prop.

---

### Vendor line

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `margin-top`     | `6px`                         |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `10px`                        |
| `color`          | `var(--fg-muted)`             |
| `letter-spacing` | `0.04em`                      |
| Content          | `"seen on {vendor}"`          |

---

### Box-office subtier line (conditional)

| Condition                 | Renders          |
| ------------------------- | ---------------- |
| `boSubtier` is truthy     | Renders this div |
| `boSubtier` is null/falsy | Does not render  |

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `margin-top`     | `4px`                         |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `9px`                         |
| `color`          | `oklch(0.66 0.14 78)` (GOLD)  |
| `letter-spacing` | `0.04em`                      |

#### Inner span

| Property      | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| `font-weight` | `700`                                                           |
| Content       | `boSubtier` value (result of `boxOfficeAction(action, method)`) |

#### `boxOfficeAction` mapping

| action          | method        | Output string                         |
| --------------- | ------------- | ------------------------------------- |
| `"bought"`      | `"in-person"` | `"Bought in person at the venue"`     |
| `"bought"`      | `"phone"`     | `"Bought by phone from the venue"`    |
| `"saw"`         | `"in-person"` | `"Saw at the box office in person"`   |
| `"saw"`         | `"phone"`     | `"Called the box office"`             |
| any other combo | —             | `null` (subtier line does not render) |

---

### Attribution line

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `margin-top`     | `8px`                         |
| `display`        | `inline-flex`                 |
| `align-items`    | `center`                      |
| `gap`            | `6px`                         |
| `flex-wrap`      | `wrap`                        |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `9px`                         |
| `color`          | `var(--fg-muted)`             |
| `letter-spacing` | `0.04em`                      |

#### "Submitted by" prefix

Static text `"Submitted by"`.

#### Submitter element (conditional)

| Condition                                         | Element                                              | Styles                                                                                                                        |
| ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `isSubmitter === true`                            | `<span>you</span>`                                   | `color: t.color; font-weight: 700`                                                                                            |
| `isSubmitter === false` AND `submitter` is truthy | `<a href={submitter.url}>` with `{submitter.handle}` | `color: var(--fg-muted); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 2px` |
| `isSubmitter === false` AND `submitter` is falsy  | `<span>an anonymous fan</span>`                      | `font-style: italic; opacity: 0.85`                                                                                           |

#### Separator + timestamp

| Element              | Value                      |
| -------------------- | -------------------------- |
| `"·"` separator span | `opacity: 0.5`             |
| Timestamp span       | `{submittedAt}` prop value |

---

### Note block (conditional)

| Condition            | Renders          |
| -------------------- | ---------------- |
| `note` is truthy     | Renders this div |
| `note` is null/falsy | Does not render  |

| Property         | Value                                            |
| ---------------- | ------------------------------------------------ |
| `margin-top`     | `10px`                                           |
| `padding`        | `8px 10px`                                       |
| `background`     | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| `border`         | `1px solid var(--border)`                        |
| `border-radius`  | `8px`                                            |
| `font-family`    | `Inter, system-ui`                               |
| `font-size`      | `12.5px`                                         |
| `color`          | `var(--fg-muted)`                                |
| `letter-spacing` | `-0.005em`                                       |
| `line-height`    | `1.45`                                           |
| `font-style`     | `italic`                                         |
| Content          | `"{note}"` (note value wrapped in curly quotes)  |

---

### Footer

| Property          | Value                     |
| ----------------- | ------------------------- |
| `margin-top`      | `12px`                    |
| `padding-top`     | `10px`                    |
| `border-top`      | `1px solid var(--border)` |
| `display`         | `flex`                    |
| `align-items`     | `center`                  |
| `justify-content` | `space-between`           |
| `gap`             | `10px`                    |
| `flex-wrap`       | `wrap`                    |

---

#### Footer view: `"other"`

Both elements render when `view === "other"`.

##### "Saw a different number?" button

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `all`            | `unset`                       |
| `cursor`         | `pointer`                     |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `10px`                        |
| `color`          | `var(--fg-subtle)`            |
| `letter-spacing` | `0.04em`                      |
| `text-transform` | `uppercase`                   |
| Content          | `"Saw a different number?"`   |

##### "Confirm price" button

| Property         | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| `all`            | `unset`                                                                   |
| `cursor`         | `pointer`                                                                 |
| `display`        | `inline-flex`                                                             |
| `align-items`    | `center`                                                                  |
| `gap`            | `6px`                                                                     |
| `padding`        | `7px 12px`                                                                |
| `border-radius`  | `8px`                                                                     |
| `background`     | `t.color`                                                                 |
| `color`          | `var(--fg-on-accent)`                                                     |
| `font-family`    | `Inter, system-ui`                                                        |
| `font-weight`    | `700`                                                                     |
| `font-size`      | `12.5px`                                                                  |
| `letter-spacing` | `-0.005em`                                                                |
| Content          | `<CheckGlyph size={11} color="var(--fg-on-accent)"/>` + `"Confirm price"` |

---

#### Footer view: `"self-locked"`

Both elements render when `view === "self-locked"`.

##### "Your submission" label

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `10px`                        |
| `color`          | `var(--fg-subtle)`            |
| `letter-spacing` | `0.04em`                      |
| `text-transform` | `uppercase`                   |
| Content          | `"Your submission"`           |

##### "Waiting on one more fan" span

| Property         | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| `display`        | `inline-flex`                                          |
| `align-items`    | `center`                                               |
| `gap`            | `6px`                                                  |
| `padding`        | `7px 12px`                                             |
| `border-radius`  | `8px`                                                  |
| `background`     | `color-mix(in oklab, var(--fg) 5%, transparent)`       |
| `border`         | `1px dashed var(--border-strong)`                      |
| `font-family`    | `Inter, system-ui`                                     |
| `font-weight`    | `600`                                                  |
| `font-size`      | `12px`                                                 |
| `color`          | `var(--fg-muted)`                                      |
| `letter-spacing` | `-0.005em`                                             |
| Content          | `<LockGlyph size={10}/>` + `"Waiting on one more fan"` |

---

#### Footer view: `"submitter"`

Both elements render when `view === "submitter"`.

##### "Your submission" label

| Property         | Value                         |
| ---------------- | ----------------------------- |
| `font-family`    | `'JetBrains Mono', monospace` |
| `font-size`      | `10px`                        |
| `color`          | `var(--fg-subtle)`            |
| `letter-spacing` | `0.04em`                      |
| `text-transform` | `uppercase`                   |
| Content          | `"Your submission"`           |

##### Action buttons container

| Property  | Value  |
| --------- | ------ |
| `display` | `flex` |
| `gap`     | `14px` |

##### "Edit" button

| Property         | Value              |
| ---------------- | ------------------ |
| `all`            | `unset`            |
| `cursor`         | `pointer`          |
| `font-family`    | `Inter, system-ui` |
| `font-weight`    | `600`              |
| `font-size`      | `12px`             |
| `color`          | `var(--signal)`    |
| `letter-spacing` | `-0.005em`         |
| Content          | `"Edit"`           |

##### "Withdraw" button

| Property         | Value              |
| ---------------- | ------------------ |
| `all`            | `unset`            |
| `cursor`         | `pointer`          |
| `font-family`    | `Inter, system-ui` |
| `font-weight`    | `600`              |
| `font-size`      | `12px`             |
| `color`          | `var(--warning)`   |
| `letter-spacing` | `-0.005em`         |
| Content          | `"Withdraw"`       |

---

## Hover / Interactive States

No hover or focus styles are defined in the source. All interactive elements use `all: "unset"` with `cursor: "pointer"` only.

---

## Conditional Rendering Summary

| Element                        | Condition                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Outer `box-shadow`             | Only when `isBox === true`                                                                |
| Outer `background`             | `t.bg` when `isBox`; `var(--surface-1)` otherwise                                         |
| Outer `border`                 | `t.border` when `isBox`; `var(--border)` otherwise                                        |
| Eyebrow text                   | `"Box office"` + `color: t.color` when `isBox`; `"Tickets"` + default color otherwise     |
| `PendingDot` filled state      | `filled={true}` for dots where `i < confirms`; `filled={false}` otherwise                 |
| `"face value · no fees"` span  | Only when `isBox === true`                                                                |
| `PendingTrustPill`             | Always renders                                                                            |
| `StarGlyph` inside pill        | Only when `kind === "boxoffice"`                                                          |
| Box-office subtier line        | Only when `boSubtier` is truthy (requires `isBox` AND `boxOfficeAction` returns a string) |
| Attribution "you"              | When `isSubmitter === true` (`view === "submitter"` or `"self-locked"`)                   |
| Attribution handle link        | When `isSubmitter === false` AND `submitter` is truthy                                    |
| Attribution "an anonymous fan" | When `isSubmitter === false` AND `submitter` is falsy                                     |
| Note block                     | Only when `note` prop is truthy                                                           |
| Footer "other" state           | Only when `view === "other"`                                                              |
| Footer "self-locked" state     | Only when `view === "self-locked"`                                                        |
| Footer "submitter" state       | Only when `view === "submitter"`                                                          |

# Design Property Table — Phase 8.5 Consumer UI (Pass B: Corroboration + Dispute)

Source file: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/dispute-surfaces.jsx`

---

## Component: SheetFrame

### Outer container

| Property       | Value                          |
| -------------- | ------------------------------ |
| width          | `393`                          |
| height         | prop `height` (default `720`)  |
| display        | `flex`                         |
| flex-direction | `column`                       |
| background     | `var(--bg)`                    |
| color          | `var(--fg)`                    |
| font-family    | `Inter, system-ui, sans-serif` |
| box-sizing     | `border-box`                   |
| border-radius  | `18`                           |
| overflow       | `hidden`                       |
| border-width   | `1px`                          |
| border-style   | `solid`                        |
| border-color   | `var(--border)`                |

### Header row (drag handle + eyebrow + cancel button row)

| Property        | Value           |
| --------------- | --------------- |
| padding         | `10px 16px 8px` |
| display         | `flex`          |
| align-items     | `center`        |
| justify-content | `space-between` |
| position        | `relative`      |

### Drag handle (pill)

| Property      | Value                  |
| ------------- | ---------------------- |
| position      | `absolute`             |
| top           | `8`                    |
| left          | `50%`                  |
| transform     | `translateX(-50%)`     |
| width         | `36`                   |
| height        | `4`                    |
| border-radius | `999`                  |
| background    | `var(--border-strong)` |

### Eyebrow span

| Property       | Value                         |
| -------------- | ----------------------------- |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `9`                           |
| color          | `var(--fg-subtle)`            |
| letter-spacing | `0.08em`                      |
| text-transform | `uppercase`                   |
| margin-top     | `10`                          |

### Cancel button

| Property       | Value                         |
| -------------- | ----------------------------- |
| all            | `unset`                       |
| cursor         | `pointer`                     |
| margin-top     | `10`                          |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `9`                           |
| color          | `var(--fg-subtle)`            |
| letter-spacing | `0.04em`                      |
| text-transform | `uppercase`                   |

### Title / subtitle block

| Property | Value        |
| -------- | ------------ |
| padding  | `8px 18px 0` |

### Title (h2)

| Property       | Value              |
| -------------- | ------------------ |
| margin         | `0`                |
| font-family    | `Inter, system-ui` |
| font-weight    | `900`              |
| font-size      | `24`               |
| color          | `var(--fg)`        |
| letter-spacing | `-0.025em`         |
| line-height    | `1.1`              |
| text-wrap      | `balance`          |

### Subtitle (p) — renders only when `subtitle` prop is provided

| Property       | Value              |
| -------------- | ------------------ |
| margin         | `6px 0 0`          |
| font-family    | `Inter, system-ui` |
| font-size      | `13.5`             |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| line-height    | `1.45`             |
| text-wrap      | `pretty`           |

### Scroll body

| Property   | Value       |
| ---------- | ----------- |
| flex       | `1`         |
| overflow-y | `auto`      |
| padding    | `16px 18px` |

### Footer — renders only when `footer` prop is provided

| Property   | Value                     |
| ---------- | ------------------------- |
| padding    | `12px 18px 18px`          |
| background | `var(--bg)`               |
| border-top | `1px solid var(--border)` |

---

## Component: SubmissionDetailCard

### Outer container

| Property      | Value                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| padding       | `12px 14px`                                                                                                      |
| background    | when `kind === "boxoffice"`: `tokens.bg`; otherwise: `color-mix(in oklab, ${tokens.color} 6%, var(--surface-1))` |
| border-width  | `1px`                                                                                                            |
| border-style  | `solid`                                                                                                          |
| border-color  | `${tokens.border}`                                                                                               |
| border-radius | `12`                                                                                                             |

### Price + tier row

| Property    | Value      |
| ----------- | ---------- |
| display     | `flex`     |
| align-items | `baseline` |
| gap         | `10`       |
| flex-wrap   | `wrap`     |

### Price span (FormatRange output)

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-weight    | `800`              |
| font-size      | `30`               |
| color          | `var(--fg)`        |
| letter-spacing | `-0.025em`         |
| line-height    | `1`                |

### Tier span

| Property       | Value                         |
| -------------- | ----------------------------- |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `11`                          |
| color          | `var(--fg-muted)`             |
| letter-spacing | `0.06em`                      |
| text-transform | `uppercase`                   |
| font-weight    | `700`                         |

### "face value · no fees" span — renders only when `kind === "boxoffice"`

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-weight    | `600`              |
| font-size      | `12`               |
| color          | `tokens.color`     |
| letter-spacing | `-0.005em`         |

### Metadata grid

| Property              | Value                         |
| --------------------- | ----------------------------- |
| margin-top            | `8`                           |
| display               | `grid`                        |
| grid-template-columns | `auto 1fr`                    |
| gap                   | `4px 12px`                    |
| font-family           | `'JetBrains Mono', monospace` |
| font-size             | `9.5`                         |
| letter-spacing        | `0.04em`                      |

### Metadata label cells (Vendor / By / When)

| Property       | Value              |
| -------------- | ------------------ |
| color          | `var(--fg-subtle)` |
| text-transform | `uppercase`        |

### Metadata value cells

| Property | Value       |
| -------- | ----------- |
| color    | `var(--fg)` |

### "By" row — conditional rendering

Renders only when `showAttribution === true` AND `submitter` is truthy.

### Note block — renders only when `note` prop is provided

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| margin-top     | `10`                                             |
| padding        | `8px 10px`                                       |
| background     | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| border-width   | `1px`                                            |
| border-style   | `solid`                                          |
| border-color   | `var(--border)`                                  |
| border-radius  | `8`                                              |
| font-family    | `Inter, system-ui`                               |
| font-size      | `12.5`                                           |
| color          | `var(--fg-muted)`                                |
| letter-spacing | `-0.005em`                                       |
| line-height    | `1.45`                                           |
| font-style     | `italic`                                         |

---

## Component: VerifyOption

### Button — unselected state

| Property      | Value              |
| ------------- | ------------------ |
| all           | `unset`            |
| cursor        | `pointer`          |
| display       | `flex`             |
| align-items   | `flex-start`       |
| gap           | `12`               |
| width         | `100%`             |
| box-sizing    | `border-box`       |
| padding       | `12px 14px`        |
| border-radius | `10`               |
| background    | `var(--surface-1)` |
| border-width  | `1px`              |
| border-style  | `solid`            |
| border-color  | `var(--border)`    |
| margin-bottom | `8`                |

### Button — selected state

| Property      | Value                                             |
| ------------- | ------------------------------------------------- |
| all           | `unset`                                           |
| cursor        | `pointer`                                         |
| display       | `flex`                                            |
| align-items   | `flex-start`                                      |
| gap           | `12`                                              |
| width         | `100%`                                            |
| box-sizing    | `border-box`                                      |
| padding       | `12px 14px`                                       |
| border-radius | `10`                                              |
| background    | `color-mix(in oklab, ${accent} 10%, transparent)` |
| border-width  | `1.5px`                                           |
| border-style  | `solid`                                           |
| border-color  | `${accent}`                                       |
| margin-bottom | `8`                                               |

### Radio dot — unselected state

| Property        | Value                  |
| --------------- | ---------------------- |
| width           | `16`                   |
| height          | `16`                   |
| border-radius   | `50%`                  |
| flex-shrink     | `0`                    |
| margin-top      | `2`                    |
| background      | `transparent`          |
| border-width    | `1.5px`                |
| border-style    | `solid`                |
| border-color    | `var(--border-strong)` |
| display         | `flex`                 |
| align-items     | `center`               |
| justify-content | `center`               |

### Radio dot — selected state

| Property        | Value       |
| --------------- | ----------- |
| width           | `16`        |
| height          | `16`        |
| border-radius   | `50%`       |
| flex-shrink     | `0`         |
| margin-top      | `2`         |
| background      | `${accent}` |
| border-width    | `1.5px`     |
| border-style    | `solid`     |
| border-color    | `${accent}` |
| display         | `flex`      |
| align-items     | `center`    |
| justify-content | `center`    |

### Check glyph inside radio dot — renders only when `selected` is true

| Property | Value                 |
| -------- | --------------------- |
| size     | `9`                   |
| color    | `var(--fg-on-accent)` |

### Text wrapper span

| Property  | Value |
| --------- | ----- |
| flex      | `1`   |
| min-width | `0`   |

### Label text div

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-weight    | `700`              |
| font-size      | `13.5`             |
| color          | `var(--fg)`        |
| letter-spacing | `-0.005em`         |

### Sub text div — renders only when `sub` prop is provided

| Property       | Value              |
| -------------- | ------------------ |
| margin-top     | `2`                |
| font-family    | `Inter, system-ui` |
| font-weight    | `500`              |
| font-size      | `12`               |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| line-height    | `1.4`              |

---

## Component: ChipGroup

### Outer wrapper div

No inline styles (bare `<div>`).

### Chips flex row

| Property   | Value  |
| ---------- | ------ |
| margin-top | `6`    |
| display    | `flex` |
| flex-wrap  | `wrap` |
| gap        | `6`    |

### Chip button — unselected state

| Property       | Value                  |
| -------------- | ---------------------- |
| all            | `unset`                |
| cursor         | `pointer`              |
| padding        | `8px 14px`             |
| border-radius  | `999`                  |
| background     | `var(--surface-1)`     |
| border-width   | `1px`                  |
| border-style   | `solid`                |
| border-color   | `var(--border-strong)` |
| font-family    | `Inter, system-ui`     |
| font-weight    | `600`                  |
| font-size      | `13.5`                 |
| color          | `var(--fg-muted)`      |
| letter-spacing | `-0.005em`             |

### Chip button — selected (active) state

| Property       | Value                                             |
| -------------- | ------------------------------------------------- |
| all            | `unset`                                           |
| cursor         | `pointer`                                         |
| padding        | `8px 14px`                                        |
| border-radius  | `999`                                             |
| background     | `color-mix(in oklab, ${accent} 14%, transparent)` |
| border-width   | `1.5px`                                           |
| border-style   | `solid`                                           |
| border-color   | `${accent}`                                       |
| font-family    | `Inter, system-ui`                                |
| font-weight    | `600`                                             |
| font-size      | `13.5`                                            |
| color          | `var(--fg)`                                       |
| letter-spacing | `-0.005em`                                        |

---

## Component: NumField

### Outer wrapper div

| Property | Value |
| -------- | ----- |
| flex     | `1`   |

### Optional label suffix span — renders only when `optional` prop is truthy

| Property       | Value       |
| -------------- | ----------- |
| margin-left    | `6`         |
| opacity        | `0.7`       |
| text-transform | `uppercase` |

### Input row div

| Property      | Value                  |
| ------------- | ---------------------- |
| margin-top    | `6`                    |
| padding       | `10px 12px`            |
| background    | `var(--surface-1)`     |
| border-width  | `1px`                  |
| border-style  | `solid`                |
| border-color  | `var(--border-strong)` |
| border-radius | `10`                   |
| display       | `flex`                 |
| align-items   | `center`               |
| gap           | `6`                    |

### Dollar sign span

| Property    | Value                         |
| ----------- | ----------------------------- |
| font-family | `'JetBrains Mono', monospace` |
| font-size   | `14`                          |
| color       | `var(--fg-muted)`             |
| font-weight | `700`                         |

### Value / placeholder span

| Property    | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| flex        | `1`                                                                |
| font-family | `Inter, system-ui`                                                 |
| font-weight | `700`                                                              |
| font-size   | `16`                                                               |
| color       | when `value` is truthy: `var(--fg)`; otherwise: `var(--fg-subtle)` |

---

## Component: CorroborationSheet

### State: `self-locked`

Renders `<SheetFrame>` with the following props:

| Prop     | Value                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| title    | `"That's your number."`                                                                                              |
| subtitle | `"Submitters can't confirm their own price — we need another fan to vouch. Edit or withdraw if anything's changed."` |
| height   | `620`                                                                                                                |

#### Self-locked footer — wrapper div

| Property | Value  |
| -------- | ------ |
| display  | `flex` |
| gap      | `10`   |

#### "Edit submission" button

| Property       | Value                  |
| -------------- | ---------------------- |
| all            | `unset`                |
| cursor         | `pointer`              |
| flex           | `1`                    |
| text-align     | `center`               |
| height         | `44`                   |
| border-radius  | `9`                    |
| background     | `var(--surface-1)`     |
| border-width   | `1px`                  |
| border-style   | `solid`                |
| border-color   | `var(--border-strong)` |
| font-family    | `Inter, system-ui`     |
| font-weight    | `700`                  |
| font-size      | `13.5`                 |
| color          | `var(--fg)`            |
| letter-spacing | `-0.005em`             |

#### "Withdraw" button

| Property       | Value              |
| -------------- | ------------------ |
| all            | `unset`            |
| cursor         | `pointer`          |
| flex           | `1`                |
| text-align     | `center`           |
| height         | `44`               |
| border-radius  | `9`                |
| background     | `transparent`      |
| border-width   | `1px`              |
| border-style   | `solid`            |
| border-color   | `var(--warning)`   |
| font-family    | `Inter, system-ui` |
| font-weight    | `700`              |
| font-size      | `13.5`             |
| color          | `var(--warning)`   |
| letter-spacing | `-0.005em`         |

#### Waiting notice box

| Property      | Value                                            |
| ------------- | ------------------------------------------------ |
| margin-top    | `18`                                             |
| display       | `flex`                                           |
| align-items   | `flex-start`                                     |
| gap           | `10`                                             |
| padding       | `12px 14px`                                      |
| background    | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| border-width  | `1px`                                            |
| border-style  | `dashed`                                         |
| border-color  | `var(--border-strong)`                           |
| border-radius | `10`                                             |

#### Lock icon wrapper span (inside notice box)

| Property   | Value             |
| ---------- | ----------------- |
| color      | `var(--fg-muted)` |
| margin-top | `1`               |

#### Lock icon

| Property | Value |
| -------- | ----- |
| size     | `14`  |

#### Notice body text div

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-size      | `13`               |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| line-height    | `1.45`             |

#### Bold lead text inside notice (b element)

| Property | Value       |
| -------- | ----------- |
| color    | `var(--fg)` |

---

### State: `fresh`

Accent color is determined by `kind` prop: `kind === "boxoffice"` → `GOLD_D` (`oklch(0.66 0.14 78)`); otherwise `AZ_D` (`oklch(0.62 0.12 240)`).

Renders `<SheetFrame>` with the following props:

| Prop     | Value                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| title    | when `ceiling` is truthy: `"Did you also see ${FormatRange(floor, ceiling)}?"`; otherwise: `"Did you also see $${floor}?"`  |
| subtitle | `"Two fan confirms moves a price from pending to live. Pick how you checked — we're trying to keep this honest, not fast."` |
| height   | `820`                                                                                                                       |

#### Fresh footer — "Confirm" button

| Property        | Value                 |
| --------------- | --------------------- |
| all             | `unset`               |
| cursor          | `pointer`             |
| box-sizing      | `border-box`          |
| display         | `flex`                |
| align-items     | `center`              |
| justify-content | `center`              |
| gap             | `8`                   |
| height          | `48`                  |
| width           | `100%`                |
| border-radius   | `10`                  |
| background      | `accentColor`         |
| color           | `var(--fg-on-accent)` |
| font-family     | `Inter, system-ui`    |
| font-weight     | `800`                 |
| font-size       | `14.5`                |
| letter-spacing  | `-0.005em`            |

#### Check icon inside Confirm button

| Property | Value                 |
| -------- | --------------------- |
| size     | `13`                  |
| color    | `var(--fg-on-accent)` |

#### Fresh footer — secondary link text button

| Property       | Value              |
| -------------- | ------------------ |
| all            | `unset`            |
| cursor         | `pointer`          |
| width          | `100%`             |
| margin-top     | `10`               |
| padding        | `8px 0`            |
| font-family    | `Inter, system-ui` |
| font-weight    | `600`              |
| font-size      | `13`               |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| text-align     | `center`           |
| display        | `block`            |

#### "How did you check the price?" eyebrow wrapper

| Property      | Value |
| ------------- | ----- |
| margin-top    | `16`  |
| margin-bottom | `10`  |

#### Four VerifyOption buttons

All four use `accent={accentColor}`. Selected state is controlled by the `selected` prop compared to these values:

| option key                          | selected when `selected ===` |
| ----------------------------------- | ---------------------------- |
| `Same vendor (${vendor})`           | `"same-vendor"`              |
| `A different vendor / site`         | `"other-vendor"`             |
| `Saw the price at the box office`   | `"box-office-saw"`           |
| `Bought a ticket at the box office` | `"box-office-bought"`        |

#### Honesty disclaimer box (bottom of scroll area)

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| margin-top     | `16`                                             |
| padding        | `10px 12px`                                      |
| background     | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| border-width   | `1px`                                            |
| border-style   | `solid`                                          |
| border-color   | `var(--border)`                                  |
| border-radius  | `10`                                             |
| font-family    | `Inter, system-ui`                               |
| font-size      | `12`                                             |
| color          | `var(--fg-subtle)`                               |
| letter-spacing | `-0.005em`                                       |
| line-height    | `1.45`                                           |

---

## Component: DisputedPriceCard

### Outer container

| Property      | Value              |
| ------------- | ------------------ |
| border-radius | `12`               |
| background    | `var(--surface-1)` |
| border-width  | `1px`              |
| border-style  | `solid`            |
| border-color  | `var(--border)`    |
| overflow      | `hidden`           |

### Update strip (top bar)

| Property      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| padding       | `9px 14px`                                             |
| background    | `color-mix(in oklab, var(--fg-muted) 8%, transparent)` |
| border-bottom | `1px dashed var(--border-strong)`                      |
| display       | `flex`                                                 |
| align-items   | `center`                                               |
| gap           | `10`                                                   |
| flex-wrap     | `wrap`                                                 |

### "update pending" badge span

| Property       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| display        | `inline-flex`                                           |
| align-items    | `center`                                                |
| gap            | `5`                                                     |
| padding        | `2px 6px`                                               |
| border-radius  | `4`                                                     |
| background     | `color-mix(in oklab, var(--fg-muted) 14%, transparent)` |
| color          | `var(--fg)`                                             |
| font-family    | `'JetBrains Mono', monospace`                           |
| font-size      | `9`                                                     |
| letter-spacing | `0.06em`                                                |
| text-transform | `uppercase`                                             |
| font-weight    | `700`                                                   |
| line-height    | `1`                                                     |

### SVG inside badge

| Property | Value |
| -------- | ----- |
| width    | `9`   |
| height   | `9`   |

### Dispute meta text span (in update strip)

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-size      | `12`               |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| flex           | `1`                |
| min-width      | `0`                |

### Bold price inside dispute meta text (b element)

| Property | Value       |
| -------- | ----------- |
| color    | `var(--fg)` |

### Card body

| Property | Value            |
| -------- | ---------------- |
| padding  | `14px 14px 12px` |

### Price + tier row (inside card body)

| Property    | Value      |
| ----------- | ---------- |
| margin-top  | `6`        |
| display     | `flex`     |
| align-items | `baseline` |
| gap         | `10`       |
| flex-wrap   | `wrap`     |

### Price span (FormatRange output)

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-weight    | `800`              |
| font-size      | `28`               |
| color          | `var(--fg)`        |
| letter-spacing | `-0.025em`         |
| line-height    | `1.05`             |

### Tier span

| Property       | Value                         |
| -------------- | ----------------------------- |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `11`                          |
| color          | `var(--fg-muted)`             |
| letter-spacing | `0.06em`                      |
| text-transform | `uppercase`                   |
| font-weight    | `700`                         |

### "seen on {vendor}" line

| Property       | Value                         |
| -------------- | ----------------------------- |
| margin-top     | `6`                           |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `10`                          |
| color          | `var(--fg-muted)`             |
| letter-spacing | `0.04em`                      |

### Attribution row

| Property       | Value                         |
| -------------- | ----------------------------- |
| margin-top     | `8`                           |
| display        | `inline-flex`                 |
| align-items    | `center`                      |
| gap            | `6`                           |
| flex-wrap      | `wrap`                        |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `9`                           |
| color          | `var(--fg-muted)`             |
| letter-spacing | `0.04em`                      |

### Submitter handle anchor

| Property              | Value                  |
| --------------------- | ---------------------- |
| color                 | `var(--fg-muted)`      |
| text-decoration       | `underline`            |
| text-decoration-color | `var(--border-strong)` |
| text-underline-offset | `2`                    |

### Separator dots (·)

| Property | Value |
| -------- | ----- |
| opacity  | `0.5` |

### Bottom action row

| Property        | Value                     |
| --------------- | ------------------------- |
| margin-top      | `12`                      |
| padding-top     | `10`                      |
| border-top      | `1px solid var(--border)` |
| display         | `flex`                    |
| align-items     | `center`                  |
| justify-content | `space-between`           |
| gap             | `10`                      |
| flex-wrap       | `wrap`                    |

### "Got a different number?" text span

| Property       | Value              |
| -------------- | ------------------ |
| font-family    | `Inter, system-ui` |
| font-size      | `12`               |
| color          | `var(--fg-muted)`  |
| letter-spacing | `-0.005em`         |
| flex           | `1`                |
| min-width      | `0`                |

### "Submit an update" button

| Property       | Value                  |
| -------------- | ---------------------- |
| all            | `unset`                |
| cursor         | `pointer`              |
| display        | `inline-flex`          |
| align-items    | `center`               |
| gap            | `6`                    |
| padding        | `7px 12px`             |
| border-radius  | `8`                    |
| background     | `transparent`          |
| border-width   | `1px`                  |
| border-style   | `solid`                |
| border-color   | `var(--border-strong)` |
| font-family    | `Inter, system-ui`     |
| font-weight    | `700`                  |
| font-size      | `12.5`                 |
| color          | `var(--fg)`            |
| letter-spacing | `-0.005em`             |

### Arrow glyph inside button

| Property | Value |
| -------- | ----- |
| size     | `11`  |

---

## Component: CounterSubmitSheet

Wraps `<SheetFrame>` with the following props:

| Prop     | Value                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| title    | `"Update the price."`                                                                                                                        |
| subtitle | `"Currently listed: ${FormatRange(currentFloor, currentCeiling)} on ${currentVendor}. Your update goes pending until another fan confirms."` |
| eyebrow  | `"Price update"`                                                                                                                             |
| height   | `820`                                                                                                                                        |

### Footer — "Submit update" button

| Property        | Value                 |
| --------------- | --------------------- |
| all             | `unset`               |
| cursor          | `pointer`             |
| box-sizing      | `border-box`          |
| display         | `flex`                |
| align-items     | `center`              |
| justify-content | `center`              |
| gap             | `8`                   |
| height          | `48`                  |
| width           | `100%`                |
| border-radius   | `10`                  |
| background      | `var(--signal)`       |
| color           | `var(--fg-on-accent)` |
| font-family     | `Inter, system-ui`    |
| font-weight     | `800`                 |
| font-size       | `14.5`                |
| letter-spacing  | `-0.005em`            |

### Arrow glyph inside Submit button

| Property | Value |
| -------- | ----- |
| size     | `13`  |

### Footer — disclaimer text div

| Property       | Value                         |
| -------------- | ----------------------------- |
| margin-top     | `10`                          |
| font-family    | `'JetBrains Mono', monospace` |
| font-size      | `9`                           |
| color          | `var(--fg-subtle)`            |
| letter-spacing | `0.04em`                      |
| text-transform | `uppercase`                   |
| text-align     | `center`                      |

### Scroll body — Floor / Ceiling row

| Property | Value  |
| -------- | ------ |
| display  | `flex` |
| gap      | `12`   |

### Scroll body — Ceiling hint text div

| Property       | Value              |
| -------------- | ------------------ |
| margin-top     | `8`                |
| font-family    | `Inter, system-ui` |
| font-size      | `11.5`             |
| color          | `var(--fg-subtle)` |
| letter-spacing | `-0.005em`         |
| line-height    | `1.4`              |

### Scroll body — Tier chips wrapper

| Property   | Value |
| ---------- | ----- |
| margin-top | `18`  |

### Scroll body — Vendor chips wrapper

| Property   | Value |
| ---------- | ----- |
| margin-top | `18`  |

### Scroll body — Honesty disclaimer box

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| margin-top     | `18`                                             |
| padding        | `10px 12px`                                      |
| background     | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| border-width   | `1px`                                            |
| border-style   | `solid`                                          |
| border-color   | `var(--border)`                                  |
| border-radius  | `10`                                             |
| font-family    | `Inter, system-ui`                               |
| font-size      | `12`                                             |
| color          | `var(--fg-subtle)`                               |
| letter-spacing | `-0.005em`                                       |
| line-height    | `1.45`                                           |

### NumField instances

| Field   | `label`     | `value` prop | `placeholder` | `optional` |
| ------- | ----------- | ------------ | ------------- | ---------- |
| Floor   | `"Floor"`   | `newFloor`   | `"0"`         | not set    |
| Ceiling | `"Ceiling"` | `newCeiling` | `"0"`         | `true`     |

### ChipGroup instances

| Group  | `label`              | `options` constant                                                                            | `selected` prop  |
| ------ | -------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| Tier   | `"Tier"`             | `TIER_OPTIONS` (`["GA","Reserved","VIP","Pit","Lawn"]`)                                       | `selectedTier`   |
| Vendor | `"Where you saw it"` | `VENDOR_OPTIONS` (`["AXS","Ticketmaster","SeatGeek","DICE","Eventbrite","Venue box office"]`) | `selectedVendor` |

# Design Property Table — Phase 8.5 Consumer UI (Pass C: Multi-Tier)

Source: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/multi-tier.jsx`

---

## Component: TierAlternateRow

### Outer container

| Property    | Value                    |
| ----------- | ------------------------ |
| display     | flex                     |
| align-items | center                   |
| gap         | 10                       |
| padding     | 10px 0                   |
| border-top  | 1px dashed var(--border) |

### Tier label span

| Property       | Value                       |
| -------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 10.5                        |
| color          | var(--fg)                   |
| letter-spacing | 0.08em                      |
| text-transform | uppercase                   |
| font-weight    | 700                         |
| min-width      | 56                          |

### Tier dot span

| Property      | Value                         |
| ------------- | ----------------------------- |
| width         | 5                             |
| height        | 5                             |
| border-radius | 2.5                           |
| flex-shrink   | 0                             |
| background    | dotColor (see dotColor logic) |
| align-self    | center                        |
| opacity       | 0.85                          |

### dotColor logic

| kind value    | color                                                  |
| ------------- | ------------------------------------------------------ |
| "boxoffice"   | GOLD_M (`window.PendingGOLD` or `oklch(0.66 0.14 78)`) |
| "community"   | AZ_M (`window.PendingAZURE` or `oklch(0.62 0.12 240)`) |
| anything else | var(--fg-muted)                                        |

### Spacer span

| Property | Value |
| -------- | ----- |
| flex     | 1     |

### Pending state (pending=true)

Renders a `<span>` in place of the vendor span.

| Property       | Value                         |
| -------------- | ----------------------------- |
| font-family    | 'JetBrains Mono', monospace   |
| font-size      | 9.5                           |
| color          | AZ_M (`oklch(0.62 0.12 240)`) |
| letter-spacing | 0.06em                        |
| text-transform | uppercase                     |
| font-weight    | 700                           |
| content        | "pending · {confirms}/2"      |

Price span (pending=true):

| Property | Value           |
| -------- | --------------- |
| color    | var(--fg-muted) |

### Live state (pending=false)

Renders a `<span>` showing the vendor string.

| Property       | Value            |
| -------------- | ---------------- |
| font-family    | Inter, system-ui |
| font-size      | 12               |
| color          | var(--fg-muted)  |
| letter-spacing | -0.005em         |

Price span (pending=false):

| Property | Value     |
| -------- | --------- |
| color    | var(--fg) |

### Price span (shared across both states)

| Property             | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| font-family          | Inter, system-ui                                            |
| font-weight          | 700                                                         |
| font-size            | 14                                                          |
| letter-spacing       | -0.01em                                                     |
| font-variant-numeric | tabular-nums                                                |
| color                | var(--fg-muted) if pending=true, var(--fg) if pending=false |

---

## Component: TwoPendingStack

### Outer container

| Property       | Value  |
| -------------- | ------ |
| display        | flex   |
| flex-direction | column |
| gap            | 12     |

### Composition

TwoPendingStack renders exactly two `window.PendingCardB` instances stacked vertically with `gap: 12`. No other chrome is added.

| Slot   | Props passed to PendingCardB                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card 1 | floor=40, tier="GA", vendor="AXS", kind="community", submitter={ handle: "@hugh", url: "/u/hugh" }, submittedAt="2h ago", confirms=1, needed=2, view="other", note="GA standing on AXS. $40 face, no fees on the page."        |
| Card 2 | floor=100, tier="VIP", vendor="AXS", kind="community", submitter={ handle: "@amelia", url: "/u/amelia" }, submittedAt="40m ago", confirms=0, needed=2, view="other", note="VIP — front pit + pre-show meet, $100 face on AXS." |

---

## Component: MultiTierLiveCard

### Outer container

| Property      | Value                   |
| ------------- | ----------------------- |
| border-radius | 12                      |
| background    | var(--surface-1)        |
| border        | 1px solid var(--border) |
| padding       | 14px 14px 12px          |

### Eyebrow

Renders `<window.PendingEyebrow>` with text content "Tickets". No additional inline styles.

### Headline row container

| Property    | Value    |
| ----------- | -------- |
| margin-top  | 6        |
| display     | flex     |
| align-items | baseline |
| gap         | 8        |
| flex-wrap   | wrap     |

### "from" label span

| Property       | Value            |
| -------------- | ---------------- |
| font-family    | Inter, system-ui |
| font-weight    | 600              |
| font-size      | 13               |
| color          | var(--fg-muted)  |
| letter-spacing | -0.005em         |

### Price span

| Property       | Value            |
| -------------- | ---------------- |
| font-family    | Inter, system-ui |
| font-weight    | 800              |
| font-size      | 28               |
| color          | var(--fg)        |
| letter-spacing | -0.025em         |
| line-height    | 1.05             |

### Tier label span

| Property       | Value                       |
| -------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 11                          |
| color          | var(--fg-muted)             |
| letter-spacing | 0.06em                      |
| text-transform | uppercase                   |
| font-weight    | 700                         |

### Trust pill

Renders `<window.PendingTrustPill kind={cheapestKind}/>`. No additional inline styles.

### Vendor / observation line

| Property       | Value                       |
| -------------- | --------------------------- |
| margin-top     | 6                           |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 10                          |
| color          | var(--fg-muted)             |
| letter-spacing | 0.04em                      |

Content: `"seen on {cheapestVendor} · observed {observedAt}"`

### "Other tiers" section container

Conditionally rendered only when `alternates.length > 0`.

| Property   | Value |
| ---------- | ----- |
| margin-top | 12    |

### "Other tiers" eyebrow div

| Property       | Value                       |
| -------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 9                           |
| color          | var(--fg-subtle)            |
| letter-spacing | 0.06em                      |
| text-transform | uppercase                   |
| margin-bottom  | 2                           |

### Alternate rows

Each item in `alternates` is rendered as `<TierAlternateRow key={i} {...alt}/>`. The default `alternates` prop value contains one entry: `{ tier: "VIP", floor: 100, ceiling: null, vendor: "AXS", kind: "community", confirms: 2 }`.

---

## Component: MixedTierCard

MixedTierCard uses fixed sample data (no props). It shares the same outer chrome as MultiTierLiveCard.

### Outer container

| Property      | Value                   |
| ------------- | ----------------------- |
| border-radius | 12                      |
| background    | var(--surface-1)        |
| border        | 1px solid var(--border) |
| padding       | 14px 14px 12px          |

### Eyebrow

Renders `<window.PendingEyebrow>` with text content "Tickets". No additional inline styles.

### Headline row container

| Property    | Value    |
| ----------- | -------- |
| margin-top  | 6        |
| display     | flex     |
| align-items | baseline |
| gap         | 8        |
| flex-wrap   | wrap     |

### "from" label span

| Property       | Value            |
| -------------- | ---------------- |
| font-family    | Inter, system-ui |
| font-weight    | 600              |
| font-size      | 13               |
| color          | var(--fg-muted)  |
| letter-spacing | -0.005em         |

### Price span

| Property        | Value            |
| --------------- | ---------------- |
| font-family     | Inter, system-ui |
| font-weight     | 800              |
| font-size       | 28               |
| color           | var(--fg)        |
| letter-spacing  | -0.025em         |
| line-height     | 1.05             |
| content (fixed) | "$40"            |

### Tier label span

| Property        | Value                       |
| --------------- | --------------------------- |
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 11                          |
| color           | var(--fg-muted)             |
| letter-spacing  | 0.06em                      |
| text-transform  | uppercase                   |
| font-weight     | 700                         |
| content (fixed) | "GA"                        |

### Trust pill

Renders `<window.PendingTrustPill kind="community"/>`. No additional inline styles.

### Vendor / observation line

| Property       | Value                       |
| -------------- | --------------------------- |
| margin-top     | 6                           |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 10                          |
| color          | var(--fg-muted)             |
| letter-spacing | 0.04em                      |

Content (fixed): `"seen on AXS · observed yesterday · 2 fans confirmed"`

### "Other tiers" section container

Always rendered (not conditional in MixedTierCard).

| Property   | Value |
| ---------- | ----- |
| margin-top | 12    |

### "Other tiers" eyebrow div

| Property       | Value                       |
| -------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace |
| font-size      | 9                           |
| color          | var(--fg-subtle)            |
| letter-spacing | 0.06em                      |
| text-transform | uppercase                   |
| margin-bottom  | 2                           |

### Pending alternate row

Renders a single `<TierAlternateRow>` with fixed props:

| Prop     | Value       |
| -------- | ----------- |
| tier     | "VIP"       |
| floor    | 100         |
| kind     | "community" |
| confirms | 1           |
| pending  | true        |

Note: `ceiling` and `vendor` are not passed; they take TierAlternateRow's defaults (`ceiling=null`, `vendor="AXS"`).

# Design Property Table — Phase 8.5 Consumer UI (Pass D: Report Flow)

Source file: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/report-flow.jsx`

---

## Token Bundle: reportTokens(kind)

### kind === "cancelled"

| Token    | Value                                                   |
| -------- | ------------------------------------------------------- |
| label    | `"Cancelled"`                                           |
| short    | `"cancelled"`                                           |
| color    | `var(--danger)`                                         |
| bg       | `color-mix(in oklab, var(--danger) 10%, transparent)`   |
| bgStrong | `color-mix(in oklab, var(--danger) 18%, transparent)`   |
| border   | `color-mix(in oklab, var(--danger) 42%, var(--border))` |
| Glyph    | `CancelledGlyph`                                        |

### kind === "postponed"

| Token    | Value                                                    |
| -------- | -------------------------------------------------------- |
| label    | `"Postponed"`                                            |
| short    | `"postponed"`                                            |
| color    | `var(--warning)`                                         |
| bg       | `color-mix(in oklab, var(--warning) 10%, transparent)`   |
| bgStrong | `color-mix(in oklab, var(--warning) 18%, transparent)`   |
| border   | `color-mix(in oklab, var(--warning) 42%, var(--border))` |
| Glyph    | `PostponedGlyph`                                         |

### kind === "soldout"

| Token    | Value                                                    |
| -------- | -------------------------------------------------------- |
| label    | `"Sold out"`                                             |
| short    | `"sold out"`                                             |
| color    | `var(--warning)`                                         |
| bg       | `color-mix(in oklab, var(--warning) 10%, transparent)`   |
| bgStrong | `color-mix(in oklab, var(--warning) 18%, transparent)`   |
| border   | `color-mix(in oklab, var(--warning) 42%, var(--border))` |
| Glyph    | `SoldOutGlyph`                                           |

### kind === "available" (fallthrough / default)

| Token    | Value                                                    |
| -------- | -------------------------------------------------------- |
| label    | `"Tickets available"`                                    |
| short    | `"tickets back"`                                         |
| color    | `var(--success)`                                         |
| bg       | `color-mix(in oklab, var(--success) 10%, transparent)`   |
| bgStrong | `color-mix(in oklab, var(--success) 18%, transparent)`   |
| border   | `color-mix(in oklab, var(--success) 42%, var(--border))` |
| Glyph    | `TicketsAvailGlyph`                                      |

---

## Component: ReportTypeMark

Props: `kind`, `pending = false`

### Outer `<span>` — always rendered

| Category   | Property       | Value                                              |
| ---------- | -------------- | -------------------------------------------------- |
| Layout     | display        | `inline-flex`                                      |
| Layout     | align-items    | `center`                                           |
| Spacing    | gap            | `5`                                                |
| Spacing    | padding        | `2px 7px`                                          |
| Dimensions | border-radius  | `4`                                                |
| Color      | background     | `t.bg` (resolved from reportTokens)                |
| Color      | color          | `t.color` (resolved from reportTokens)             |
| Border     | border-width   | `1px`                                              |
| Border     | border-style   | `solid`                                            |
| Border     | border-color   | `color-mix(in oklab, ${t.color} 50%, transparent)` |
| Typography | font-family    | `'JetBrains Mono', monospace`                      |
| Typography | font-size      | `9`                                                |
| Typography | letter-spacing | `0.06em`                                           |
| Typography | text-transform | `uppercase`                                        |
| Typography | font-weight    | `700`                                              |
| Typography | line-height    | `1`                                                |
| Layout     | white-space    | `nowrap`                                           |

### Glyph

| Property | Value     |
| -------- | --------- |
| size     | `9`       |
| color    | `t.color` |

### pending=false

Only the glyph and `t.label` are rendered. No additional elements.

### pending=true

After the label, renders:

- `<span>` with `opacity: 0.4` containing `·`
- `<span>` containing `"pending"`

---

## Component: ReportFooterLink

Props: `theme = "electric"`

### Outer wrapper `<div>`

| Category   | Property    | Value                          |
| ---------- | ----------- | ------------------------------ |
| Dimensions | width       | `393`                          |
| Spacing    | padding     | `24px 18px 32px`               |
| Color      | background  | `var(--bg)`                    |
| Color      | color       | `var(--fg)`                    |
| Typography | font-family | `Inter, system-ui, sans-serif` |
| Layout     | box-sizing  | `border-box`                   |
| Border     | border-top  | `1px dashed var(--border)`     |

### Eyebrow `<div>` ("Spot something off?")

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.08em`                      |
| Typography | text-transform | `uppercase`                   |
| Spacing    | margin-bottom  | `10`                          |

### Button ("Report a status change")

| Category   | Property        | Value                     |
| ---------- | --------------- | ------------------------- |
| Layout     | display         | `flex`                    |
| Layout     | align-items     | `center`                  |
| Layout     | justify-content | `space-between`           |
| Spacing    | gap             | `10`                      |
| Dimensions | width           | `100%`                    |
| Spacing    | padding         | `12px 14px`               |
| Dimensions | border-radius   | `10`                      |
| Color      | background      | `var(--surface-1)`        |
| Border     | border          | `1px solid var(--border)` |

#### Button label span — "Report a status change"

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `14`               |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.005em`         |

#### Button sub-label span — "Sold out, cancelled, postponed — or back on."

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Layout     | display        | `block`            |
| Spacing    | margin-top     | `3`                |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-size      | `12`               |
| Color      | color          | `var(--fg-muted)`  |
| Typography | letter-spacing | `-0.005em`         |

### Footer caption `<div>` ("Two confirms moves a report live…")

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | margin-top     | `10`                          |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.04em`                      |
| Typography | text-transform | `uppercase`                   |
| Typography | line-height    | `1.5`                         |

---

## Component: ReportOptionRow

Props: `kind`, `sub`, `selected`, `onClick`

### Button element

| Category   | Property       | Value (unselected)                                 | Value (selected)         |
| ---------- | -------------- | -------------------------------------------------- | ------------------------ |
| Layout     | display        | `flex`                                             | `flex`                   |
| Layout     | align-items    | `flex-start`                                       | `flex-start`             |
| Spacing    | gap            | `12`                                               | `12`                     |
| Layout     | display (also) | `block` (first declaration — overridden by `flex`) | same                     |
| Dimensions | width          | `100%`                                             | `100%`                   |
| Layout     | box-sizing     | `border-box`                                       | `border-box`             |
| Spacing    | padding        | `14px 14px`                                        | `14px 14px`              |
| Dimensions | border-radius  | `10`                                               | `10`                     |
| Color      | background     | `var(--surface-1)`                                 | `t.bg`                   |
| Border     | border         | `1px solid var(--border)`                          | `1.5px solid ${t.color}` |
| Spacing    | margin-bottom  | `8`                                                | `8`                      |

### Icon container `<span>`

| Category   | Property        | Value        |
| ---------- | --------------- | ------------ |
| Dimensions | width           | `32`         |
| Dimensions | height          | `32`         |
| Dimensions | border-radius   | `8`          |
| Layout     | flex-shrink     | `0`          |
| Color      | background      | `t.bgStrong` |
| Color      | color           | `t.color`    |
| Layout     | display         | `flex`       |
| Layout     | align-items     | `center`     |
| Layout     | justify-content | `center`     |

#### Glyph inside icon container

| Property | Value     |
| -------- | --------- |
| size     | `15`      |
| color    | `t.color` |

### Text container `<span>`

| Category | Property  | Value |
| -------- | --------- | ----- |
| Layout   | flex      | `1`   |
| Layout   | min-width | `0`   |

#### Label `<div>` (t.label)

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `14`               |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.005em`         |

#### Sub-label `<div>` (sub prop)

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Spacing    | margin-top     | `2`                |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `500`              |
| Typography | font-size      | `12.5`             |
| Color      | color          | `var(--fg-muted)`  |
| Typography | letter-spacing | `-0.005em`         |
| Typography | line-height    | `1.4`              |

---

## Component: ReportSheet

Props: `theme = "electric"`, `selected = "soldout"`, `liveStatus = null`

Rendered inside `SheetFrame` with:

- `title`: `"What changed?"`
- `eyebrow`: `"Status report"`
- `height`: `600` when `liveStatus === "cancelled"`, otherwise `760`
- `subtitle`:
  - When `liveStatus` is non-null: `"This show is currently marked as ${liveLabel}. Tell us what you saw. We'll route it to other fans to confirm."`
  - When `liveStatus === null`: `"We surface this to other fans so they can confirm. Pick the closest match. You can add detail on the next step."`

### Conditional option list by liveStatus

#### liveStatus === null

| kind          | sub text                                                         |
| ------------- | ---------------------------------------------------------------- |
| `"soldout"`   | `"Tickets are no longer available from the primary vendor."`     |
| `"postponed"` | `"Show is rescheduled to a later date. We'll keep the page up."` |
| `"cancelled"` | `"Show is off entirely. Removes it from upcoming."`              |

#### liveStatus === "soldout"

| kind          | sub text                                                   |
| ------------- | ---------------------------------------------------------- |
| `"available"` | `"Tickets are back. The sold-out flag is wrong or stale."` |
| `"postponed"` | `"Show is rescheduled to a later date."`                   |
| `"cancelled"` | `"Show is off entirely. Removes it from upcoming."`        |

#### liveStatus === "postponed"

| kind          | sub text                                              |
| ------------- | ----------------------------------------------------- |
| `"available"` | `"Show is back on the original date."`                |
| `"cancelled"` | `"Show is off entirely (escalation from postponed)."` |

#### liveStatus === "cancelled"

| kind          | sub text                                             |
| ------------- | ---------------------------------------------------- |
| `"available"` | `"Show is back on — the cancellation was reversed."` |

### "Currently live" block — rendered only when liveStatus is non-null

| Category | Property      | Value |
| -------- | ------------- | ----- |
| Spacing  | margin-bottom | `14`  |

#### "Currently live" eyebrow `<div>`

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.06em`                      |
| Typography | text-transform | `uppercase`                   |
| Spacing    | margin-bottom  | `6`                           |

#### ReportTypeMark wrapper `<div>`

| Category | Property | Value         |
| -------- | -------- | ------------- |
| Layout   | display  | `inline-flex` |

### Hint note `<div>` (bottom of options list)

| Category   | Property       | Value                                            |
| ---------- | -------------- | ------------------------------------------------ |
| Spacing    | margin-top     | `14`                                             |
| Spacing    | padding        | `10px 12px`                                      |
| Color      | background     | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| Border     | border         | `1px solid var(--border)`                        |
| Dimensions | border-radius  | `10`                                             |
| Typography | font-family    | `Inter, system-ui`                               |
| Typography | font-size      | `12`                                             |
| Color      | color          | `var(--fg-subtle)`                               |
| Typography | letter-spacing | `-0.005em`                                       |
| Typography | line-height    | `1.5`                                            |

### Footer "Continue" button

| Category   | Property        | Value                 |
| ---------- | --------------- | --------------------- |
| Layout     | display         | `flex`                |
| Layout     | align-items     | `center`              |
| Layout     | justify-content | `center`              |
| Spacing    | gap             | `8`                   |
| Dimensions | height          | `48`                  |
| Dimensions | width           | `100%`                |
| Dimensions | border-radius   | `10`                  |
| Color      | background      | `var(--signal)`       |
| Color      | color           | `var(--fg-on-accent)` |
| Typography | font-family     | `Inter, system-ui`    |
| Typography | font-weight     | `800`                 |
| Typography | font-size       | `14.5`                |
| Typography | letter-spacing  | `-0.005em`            |

---

## Component: EvidenceOption

Props: `glyph`, `label`, `sub`, `selected`

### Button element

| Category   | Property      | Value (unselected)        | Value (selected)                              |
| ---------- | ------------- | ------------------------- | --------------------------------------------- |
| Layout     | display       | `flex`                    | `flex`                                        |
| Layout     | align-items   | `flex-start`              | `flex-start`                                  |
| Spacing    | gap           | `12`                      | `12`                                          |
| Dimensions | width         | `100%`                    | `100%`                                        |
| Layout     | box-sizing    | `border-box`              | `border-box`                                  |
| Spacing    | padding       | `12px 14px`               | `12px 14px`                                   |
| Dimensions | border-radius | `10`                      | `10`                                          |
| Color      | background    | `var(--surface-1)`        | `color-mix(in oklab, ${AZ} 10%, transparent)` |
| Border     | border        | `1px solid var(--border)` | `1.5px solid ${AZ}`                           |
| Spacing    | margin-bottom | `8`                       | `8`                                           |

Note: `AZ = window.PendingAZURE \|\| "oklch(0.62 0.12 240)"`

### Radio dot `<span>`

| Category   | Property        | Value (unselected)                 | Value (selected)    |
| ---------- | --------------- | ---------------------------------- | ------------------- |
| Dimensions | width           | `16`                               | `16`                |
| Dimensions | height          | `16`                               | `16`                |
| Dimensions | border-radius   | `50%`                              | `50%`               |
| Layout     | flex-shrink     | `0`                                | `0`                 |
| Spacing    | margin-top      | `2`                                | `2`                 |
| Color      | background      | `transparent`                      | `AZ`                |
| Border     | border          | `1.5px solid var(--border-strong)` | `1.5px solid ${AZ}` |
| Layout     | display         | `flex`                             | `flex`              |
| Layout     | align-items     | `center`                           | `center`            |
| Layout     | justify-content | `center`                           | `center`            |

When selected: renders `<window.PendingCheckGlyph size={9} color="var(--fg-on-accent)"/>`. When unselected: renders nothing inside.

### Text container `<span>`

| Category | Property  | Value |
| -------- | --------- | ----- |
| Layout   | flex      | `1`   |
| Layout   | min-width | `0`   |

#### Label `<div>`

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `13.5`             |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.005em`         |

#### Sub `<div>` (only rendered when `sub` is truthy)

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Spacing    | margin-top     | `2`                |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `500`              |
| Typography | font-size      | `12`               |
| Color      | color          | `var(--fg-muted)`  |
| Typography | letter-spacing | `-0.005em`         |
| Typography | line-height    | `1.4`              |

---

## Component: EvidenceForm

Props: `kind = "cancelled"`, `selected = "email"`, `link = ""`, `theme = "electric"`, `confirmsRequired = 2`, `showDate = null`

Rendered inside `SheetFrame` with:

- `title`: `"How do you know?"`
- `subtitle`: `` `We need some proof before we tell other fans the show is ${t.short}. A link to the source is best — fans use it to confirm.` ``
- `height`: `800`

### Report-type recap card `<div>`

| Category   | Property      | Value                   |
| ---------- | ------------- | ----------------------- |
| Spacing    | padding       | `10px 12px`             |
| Color      | background    | `t.bg`                  |
| Border     | border        | `1px solid ${t.border}` |
| Dimensions | border-radius | `10`                    |
| Spacing    | margin-bottom | `14`                    |
| Layout     | display       | `flex`                  |
| Layout     | align-items   | `center`                |
| Spacing    | gap           | `10`                    |

#### Recap icon `<span>`

| Category   | Property        | Value        |
| ---------- | --------------- | ------------ |
| Dimensions | width           | `28`         |
| Dimensions | height          | `28`         |
| Dimensions | border-radius   | `7`          |
| Layout     | flex-shrink     | `0`          |
| Color      | background      | `t.bgStrong` |
| Color      | color           | `t.color`    |
| Layout     | display         | `flex`       |
| Layout     | align-items     | `center`     |
| Layout     | justify-content | `center`     |

Glyph: `<t.Glyph size={14} color={t.color}/>`

#### Recap label `<div>` ("Reporting as …")

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `13.5`             |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.005em`         |

Inner `<span>` (kind name): `color: t.color`

### Higher-threshold warning panel — rendered only when `confirmsRequired > 2`

| Category   | Property      | Value                                                              |
| ---------- | ------------- | ------------------------------------------------------------------ |
| Spacing    | padding       | `10px 12px`                                                        |
| Color      | background    | `color-mix(in oklab, var(--warning) 8%, transparent)`              |
| Border     | border        | `1px solid color-mix(in oklab, var(--warning) 36%, var(--border))` |
| Dimensions | border-radius | `10`                                                               |
| Spacing    | margin-bottom | `18`                                                               |
| Layout     | display       | `flex`                                                             |
| Layout     | align-items   | `flex-start`                                                       |
| Spacing    | gap           | `10`                                                               |

#### Warning triangle SVG (inside panel)

| Property    | Value       |
| ----------- | ----------- |
| width       | `16`        |
| height      | `16`        |
| viewBox     | `0 0 16 16` |
| fill        | `none`      |
| flex-shrink | `0`         |
| margin-top  | `1`         |

Path 1: `d="M8 2L14 13H2L8 2z"` `stroke="var(--warning)"` `strokeWidth="1.5"` `strokeLinejoin="round"`

Path 2: `d="M8 6.5V9"` `stroke="var(--warning)"` `strokeWidth="1.5"` `strokeLinecap="round"`

Circle: `cx="8"` `cy="10.8"` `r="0.7"` `fill="var(--warning)"`

#### Warning panel headline

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `13`               |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.005em`         |

Text: `` `This show is ${showDate || "close"} — we need ${confirmsRequired} confirms instead of 2.` ``

#### Warning panel body

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Spacing    | margin-top     | `3`                |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-size      | `12`               |
| Color      | color          | `var(--fg-muted)`  |
| Typography | letter-spacing | `-0.005em`         |
| Typography | line-height    | `1.45`             |

### Evidence options section

Eyebrow label: `"Where did you see it?"` (via `<Eyebrow>` / `window.PendingEyebrow`)

Eyebrow wrapper `<div>`: `margin-bottom: 10`

Five `EvidenceOption` rows (in order):

| selected value  | label                               | sub                                                            |
| --------------- | ----------------------------------- | -------------------------------------------------------------- |
| `"email"`       | `"Got an email from the venue"`     | `"An order email, an announcement, a refund notice."`          |
| `"social"`      | `"Saw it on the artist's social"`   | `"Instagram, TikTok, Twitter / X. Share the post link below."` |
| `"venue"`       | `"Venue posted an announcement"`    | `"Their site, social, or board outside the venue."`            |
| `"venue-visit"` | `"I was there or called the venue"` | `"Saw it on the door or heard it from staff."`                 |
| `"other"`       | `"Something else"`                  | `"Tell us in the notes below."`                                |

### Link field

Wrapper `<div>`: `margin-top: 18`

Eyebrow label: `"Link (optional but loved)"`

Input chrome `<div>`:

| Category   | Property      | Value                            |
| ---------- | ------------- | -------------------------------- |
| Spacing    | margin-top    | `6`                              |
| Spacing    | padding       | `10px 12px`                      |
| Color      | background    | `var(--surface-1)`               |
| Border     | border        | `1px solid var(--border-strong)` |
| Dimensions | border-radius | `10`                             |
| Layout     | display       | `flex`                           |
| Layout     | align-items   | `center`                         |
| Spacing    | gap           | `8`                              |

Link icon SVG: `width="13"` `height="13"` `viewBox="0 0 14 14"` `fill="none"`
Path: `d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"` `stroke="var(--fg-subtle)"` `strokeWidth="1.3"` `strokeLinecap="round"` `strokeLinejoin="round"`

Link text `<span>`:

| Category   | Property       | Value (link empty)            | Value (link set) |
| ---------- | -------------- | ----------------------------- | ---------------- |
| Layout     | flex           | `1`                           | `1`              |
| Typography | font-family    | `'JetBrains Mono', monospace` | same             |
| Typography | font-size      | `11.5`                        | `11.5`           |
| Color      | color          | `var(--fg-subtle)`            | `var(--fg)`      |
| Typography | letter-spacing | `0.01em`                      | `0.01em`         |

Placeholder text when empty: `"https://instagram.com/p/…"`

### Notes field

Wrapper `<div>`: `margin-top: 14`

Eyebrow label: `"Notes (optional)"`

Textarea chrome `<div>`:

| Category   | Property       | Value                            |
| ---------- | -------------- | -------------------------------- |
| Spacing    | margin-top     | `6`                              |
| Spacing    | padding        | `10px 12px`                      |
| Color      | background     | `var(--surface-1)`               |
| Border     | border         | `1px solid var(--border-strong)` |
| Dimensions | border-radius  | `10`                             |
| Typography | font-family    | `Inter, system-ui`               |
| Typography | font-size      | `13`                             |
| Color      | color          | `var(--fg-subtle)`               |
| Typography | letter-spacing | `-0.005em`                       |
| Dimensions | min-height     | `56`                             |
| Typography | line-height    | `1.45`                           |

Placeholder text: `"What did the email / post say? Anything other fans should know."`

### Footer

#### "File report" button

| Category   | Property        | Value                 |
| ---------- | --------------- | --------------------- |
| Layout     | display         | `flex`                |
| Layout     | align-items     | `center`              |
| Layout     | justify-content | `center`              |
| Spacing    | gap             | `8`                   |
| Dimensions | height          | `48`                  |
| Dimensions | width           | `100%`                |
| Dimensions | border-radius   | `10`                  |
| Color      | background      | `t.color`             |
| Color      | color           | `var(--fg-on-accent)` |
| Typography | font-family     | `Inter, system-ui`    |
| Typography | font-weight     | `800`                 |
| Typography | font-size       | `14.5`                |
| Typography | letter-spacing  | `-0.005em`            |

Button label: `"File report"`

#### Footer caption

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | margin-top     | `10`                          |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.04em`                      |
| Typography | text-transform | `uppercase`                   |
| Typography | text-align     | `center`                      |

Text: `` `Live after ${confirmsRequired} fan confirms · or admin promotion` ``

---

## Component: PendingReportBanner

Props: `kind = "cancelled"`, `reporter = { handle: "@kel" }`, `reportedAt = "3h ago"`, `confirms = 1`, `needed = 2`, `evidence = "Instagram post · @electric.callboy"`, `view = "other"`

`isReporter` = `view === "reporter" || view === "self-locked"`

### Outer wrapper `<div>`

| Category   | Property      | Value                   |
| ---------- | ------------- | ----------------------- |
| Dimensions | border-radius | `12`                    |
| Color      | background    | `t.bg`                  |
| Border     | border        | `1px solid ${t.border}` |
| Spacing    | padding       | `0`                     |
| Layout     | overflow      | `hidden`                |

### Top strip `<div>`

| Category | Property        | Value                   |
| -------- | --------------- | ----------------------- |
| Spacing  | padding         | `10px 14px`             |
| Color    | background      | `t.bgStrong`            |
| Border   | border-bottom   | `1px solid ${t.border}` |
| Layout   | display         | `flex`                  |
| Layout   | align-items     | `center`                |
| Layout   | justify-content | `space-between`         |
| Spacing  | gap             | `10`                    |
| Layout   | flex-wrap       | `wrap`                  |

#### Kind label (left side of top strip)

Wrapper `<div>`: `display: inline-flex`, `align-items: center`, `gap: 8`

Glyph: `<G size={14} color={t.color}/>`

Label `<span>`:

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `10`                          |
| Color      | color          | `t.color`                     |
| Typography | letter-spacing | `0.08em`                      |
| Typography | text-transform | `uppercase`                   |
| Typography | font-weight    | `700`                         |

Text: `` `${t.label} · pending` ``

#### Confirm dots (right side of top strip)

Wrapper `<span>`: `display: inline-flex`, `align-items: center`, `gap: 3`, `font-family: 'JetBrains Mono'`, `font-size: 9`, `color: t.color`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `font-weight: 700`

Each dot `<span>` (`needed` total):

| Property      | Value (filled, i < confirms) | Value (empty, i >= confirms) |
| ------------- | ---------------------------- | ---------------------------- |
| width         | `7`                          | `7`                          |
| height        | `7`                          | `7`                          |
| border-radius | `50%`                        | `50%`                        |
| background    | `t.color`                    | `transparent`                |
| border        | `1.1px solid ${t.color}`     | `1.1px solid ${t.color}`     |
| display       | `inline-block`               | `inline-block`               |

Count label `<span>`: `margin-left: 4`, text: `` `${confirms} of ${needed}` ``

### Body `<div>`

| Category | Property | Value       |
| -------- | -------- | ----------- |
| Spacing  | padding  | `12px 14px` |

#### Lead headline

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `700`              |
| Typography | font-size      | `14.5`             |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.01em`          |
| Typography | line-height    | `1.4`              |
| Typography | text-wrap      | `pretty`           |

Text by kind:

- `kind === "cancelled"`: `"A fan reports the show is cancelled."`
- `kind === "postponed"`: `"A fan reports the show is being rescheduled."`
- `kind === "soldout"`: `"A fan reports the show has sold out."`
- `kind === "available"`: `"A fan reports tickets are back."`

#### Evidence card `<div>`

| Category   | Property      | Value                                            |
| ---------- | ------------- | ------------------------------------------------ |
| Spacing    | margin-top    | `10`                                             |
| Spacing    | padding       | `8px 10px`                                       |
| Color      | background    | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| Border     | border        | `1px solid var(--border)`                        |
| Dimensions | border-radius | `8`                                              |
| Layout     | display       | `flex`                                           |
| Layout     | align-items   | `center`                                         |
| Spacing    | gap           | `8`                                              |

Evidence link icon SVG: `width="13"` `height="13"` `viewBox="0 0 14 14"` `fill="none"`
Path: `d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"` `stroke="var(--fg-muted)"` `strokeWidth="1.3"` `strokeLinecap="round"` `strokeLinejoin="round"`

Evidence text `<span>`: `flex: 1`, `min-width: 0`, `font-family: Inter`, `font-size: 12.5`, `color: var(--fg)`, `letter-spacing: -0.005em`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`

"view" label `<span>`: `font-family: 'JetBrains Mono'`, `font-size: 9`, `color: var(--fg-subtle)`, `letter-spacing: 0.06em`, `text-transform: uppercase`

#### Attribution row

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | margin-top     | `10`                          |
| Layout     | display        | `inline-flex`                 |
| Layout     | align-items    | `center`                      |
| Spacing    | gap            | `6`                           |
| Layout     | flex-wrap      | `wrap`                        |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-muted)`             |
| Typography | letter-spacing | `0.04em`                      |

When `isReporter === true`: renders `<span style={{ color: t.color, fontWeight: 700 }}>you</span>`

When `isReporter === false`: renders `<a>` with:

- `color: var(--fg-muted)`
- `text-decoration: underline`
- `text-decoration-color: var(--border-strong)`
- `text-underline-offset: 2`
- text: `reporter.handle`

Separator `<span>`: `opacity: 0.5`, text: `·`

Time `<span>`: `reportedAt`

#### Action row

| Category | Property        | Value                     |
| -------- | --------------- | ------------------------- |
| Spacing  | margin-top      | `12`                      |
| Spacing  | padding-top     | `10`                      |
| Border   | border-top      | `1px solid var(--border)` |
| Layout   | display         | `flex`                    |
| Layout   | align-items     | `center`                  |
| Layout   | justify-content | `space-between`           |
| Spacing  | gap             | `10`                      |
| Layout   | flex-wrap       | `wrap`                    |

### View state: "other"

Two buttons rendered:

**"Saw something different?" button**

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `10`                          |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.04em`                      |
| Typography | text-transform | `uppercase`                   |

**"Confirm" button**

| Category   | Property       | Value                 |
| ---------- | -------------- | --------------------- |
| Layout     | display        | `inline-flex`         |
| Layout     | align-items    | `center`              |
| Spacing    | gap            | `6`                   |
| Spacing    | padding        | `8px 14px`            |
| Dimensions | border-radius  | `8`                   |
| Color      | background     | `t.color`             |
| Color      | color          | `var(--fg-on-accent)` |
| Typography | font-family    | `Inter, system-ui`    |
| Typography | font-weight    | `700`                 |
| Typography | font-size      | `12.5`                |
| Typography | letter-spacing | `-0.005em`            |

Glyph: `<window.PendingCheckGlyph size={11} color="var(--fg-on-accent)"/>`, label: `"Confirm"`

### View state: "reporter"

Left: `<span>` with `font-family: 'JetBrains Mono'`, `font-size: 10`, `color: var(--fg-subtle)`, `letter-spacing: 0.04em`, `text-transform: uppercase`, text: `"Your report"`

Right: `<div style={{ display: "flex", gap: 14 }}>` containing:

**"Add evidence" button**

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `600`              |
| Typography | font-size      | `12`               |
| Color      | color          | `var(--signal)`    |
| Typography | letter-spacing | `-0.005em`         |

**"Withdraw" button**

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `600`              |
| Typography | font-size      | `12`               |
| Color      | color          | `var(--warning)`   |
| Typography | letter-spacing | `-0.005em`         |

### View state: "self-locked"

Single `<span>`:

| Category   | Property       | Value                                            |
| ---------- | -------------- | ------------------------------------------------ |
| Layout     | display        | `inline-flex`                                    |
| Layout     | align-items    | `center`                                         |
| Spacing    | gap            | `6`                                              |
| Spacing    | padding        | `7px 12px`                                       |
| Dimensions | border-radius  | `8`                                              |
| Color      | background     | `color-mix(in oklab, var(--fg) 5%, transparent)` |
| Border     | border         | `1px dashed var(--border-strong)`                |
| Typography | font-family    | `Inter, system-ui`                               |
| Typography | font-weight    | `600`                                            |
| Typography | font-size      | `12`                                             |
| Color      | color          | `var(--fg-muted)`                                |
| Typography | letter-spacing | `-0.005em`                                       |
| Spacing    | margin-left    | `auto`                                           |

Glyph: `<window.PendingLockGlyph size={10}/>`, label: `"Waiting on one more fan"`

### kind variants for PendingReportBanner

All four kind values (`"cancelled"`, `"postponed"`, `"soldout"`, `"available"`) are valid — tokens come from `reportTokens(kind)`. The lead headline text differs per kind (see Lead headline section above). All three view states work with all four kind values.

---

## Component: PendingSoldOutCard

Props: `price = 48`, `reporter = { handle: "@kel" }`, `reportedAt = "3h ago"`, `confirms = 1`, `needed = 2`, `evidence = "AXS listing · 'not available'"`, `view = "other"`

Always uses `reportTokens("soldout")`. No "self-locked" view state exists in this component — the action row only handles `view === "other"` and `view === "reporter"`.

`isReporter` = `view === "reporter" || view === "self-locked"`

### Outer wrapper `<div>`

| Category   | Property      | Value                     |
| ---------- | ------------- | ------------------------- |
| Dimensions | border-radius | `12`                      |
| Color      | background    | `var(--surface-1)`        |
| Border     | border        | `1px solid var(--border)` |
| Layout     | overflow      | `hidden`                  |

### Top strip `<div>`

| Category | Property        | Value                   |
| -------- | --------------- | ----------------------- |
| Spacing  | padding         | `8px 14px`              |
| Color    | background      | `t.bgStrong`            |
| Border   | border-bottom   | `1px solid ${t.border}` |
| Layout   | display         | `flex`                  |
| Layout   | align-items     | `center`                |
| Layout   | justify-content | `space-between`         |
| Spacing  | gap             | `10`                    |

#### Kind label (left side)

Wrapper `<div>`: `display: inline-flex`, `align-items: center`, `gap: 7`, `font-family: 'JetBrains Mono'`, `font-size: 9.5`, `color: t.color`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `font-weight: 700`

Glyph: `<t.Glyph size={11} color={t.color}/>`, then text: `"Sold out · pending"`

#### Confirm dots (right side)

Wrapper `<span>`: `display: inline-flex`, `align-items: center`, `gap: 3`, `font-family: 'JetBrains Mono'`, `font-size: 9`, `color: t.color`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `font-weight: 700`

Dot styles: identical to PendingReportBanner (width: 7, height: 7, border-radius: 50%, background: t.color or transparent, border: `1.1px solid ${t.color}`)

Count label: `margin-left: 4`

### Body `<div>`

| Category | Property | Value            |
| -------- | -------- | ---------------- |
| Spacing  | padding  | `14px 14px 12px` |

Eyebrow: `"Tickets"` (via `<window.PendingEyebrow>`)

#### Price row `<div>`

| Category | Property    | Value      |
| -------- | ----------- | ---------- |
| Spacing  | margin-top  | `6`        |
| Layout   | display     | `flex`     |
| Layout   | align-items | `baseline` |
| Spacing  | gap         | `8`        |
| Layout   | flex-wrap   | `wrap`     |

Strikethrough price `<span>`:

| Category   | Property              | Value              |
| ---------- | --------------------- | ------------------ |
| Typography | font-family           | `Inter, system-ui` |
| Typography | font-weight           | `800`              |
| Typography | font-size             | `28`               |
| Color      | color                 | `var(--fg-subtle)` |
| Typography | letter-spacing        | `-0.025em`         |
| Typography | line-height           | `1.05`             |
| Typography | text-decoration       | `line-through`     |
| Color      | text-decoration-color | `var(--fg-subtle)` |

Text: `` `$${price}` ``

"Sold out" pill `<span>`:

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | padding        | `2px 7px`                     |
| Dimensions | border-radius  | `4`                           |
| Color      | background     | `t.color`                     |
| Color      | color          | `var(--fg-on-accent)`         |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Typography | font-weight    | `700`                         |
| Typography | letter-spacing | `0.06em`                      |
| Typography | text-transform | `uppercase`                   |

Text: `"Sold out"`

#### Evidence card

Identical structure and styles to PendingReportBanner evidence card. Evidence text overflow: hidden, text-overflow: ellipsis, white-space: nowrap.

#### Attribution row

Identical structure and styles to PendingReportBanner attribution row.

#### Action row

Same outer styles as PendingReportBanner action row.

### View state: "other"

**"Tickets still available?" button**

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `10`                          |
| Color      | color          | `var(--fg-subtle)`            |
| Typography | letter-spacing | `0.04em`                      |
| Typography | text-transform | `uppercase`                   |

**"Confirm sold out" button**

| Category   | Property       | Value                 |
| ---------- | -------------- | --------------------- |
| Layout     | display        | `inline-flex`         |
| Layout     | align-items    | `center`              |
| Spacing    | gap            | `6`                   |
| Spacing    | padding        | `7px 12px`            |
| Dimensions | border-radius  | `8`                   |
| Color      | background     | `t.color`             |
| Color      | color          | `var(--fg-on-accent)` |
| Typography | font-family    | `Inter, system-ui`    |
| Typography | font-weight    | `700`                 |
| Typography | font-size      | `12.5`                |
| Typography | letter-spacing | `-0.005em`            |

Glyph: `<window.PendingCheckGlyph size={11} color="var(--fg-on-accent)"/>`, label: `"Confirm sold out"`

### View state: "reporter"

Left: `<span>` — `font-family: 'JetBrains Mono'`, `font-size: 10`, `color: var(--fg-subtle)`, `letter-spacing: 0.04em`, `text-transform: uppercase`, text: `"Your report"`

Right: `<div style={{ display: "flex", gap: 14 }}>` containing:

**"Edit" button**: `font-family: Inter`, `font-weight: 600`, `font-size: 12`, `color: var(--signal)`, `letter-spacing: -0.005em`

**"Withdraw" button**: `font-family: Inter`, `font-weight: 600`, `font-size: 12`, `color: var(--warning)`, `letter-spacing: -0.005em`

### No "self-locked" view state

`PendingSoldOutCard` does not render any content for `view === "self-locked"`. The action row conditions only match `view === "other"` and `view === "reporter"`. When `view === "self-locked"`, `isReporter` is truthy and the reporter view renders — but there is no dedicated self-locked branch in this component.

---

## Component: ConfirmReportSheet

Props: `kind = "cancelled"`, `reporter = { handle: "@kel" }`, `reportedAt = "3h ago"`, `evidence = "Instagram post · @electric.callboy"`, `selected = "saw-source"`, `theme = "electric"`

Rendered inside `SheetFrame` with:

- `title`: `` `Is this show ${t.short}?` ``
- `subtitle`: `"Confirm only if you have your own reason to believe it. Two confirms moves a report live — a wrong one reshapes the page."`
- `height`: `780`

### Recap card `<div>`

| Category   | Property      | Value                   |
| ---------- | ------------- | ----------------------- |
| Spacing    | padding       | `12px 14px`             |
| Color      | background    | `t.bg`                  |
| Border     | border        | `1px solid ${t.border}` |
| Dimensions | border-radius | `12`                    |

#### Recap header row `<div>`

| Category | Property    | Value    |
| -------- | ----------- | -------- |
| Layout   | display     | `flex`   |
| Layout   | align-items | `center` |
| Spacing  | gap         | `8`      |

Recap icon `<span>`:

| Category   | Property        | Value        |
| ---------- | --------------- | ------------ |
| Dimensions | width           | `32`         |
| Dimensions | height          | `32`         |
| Dimensions | border-radius   | `8`          |
| Layout     | flex-shrink     | `0`          |
| Color      | background      | `t.bgStrong` |
| Color      | color           | `t.color`    |
| Layout     | display         | `flex`       |
| Layout     | align-items     | `center`     |
| Layout     | justify-content | `center`     |

Glyph: `<t.Glyph size={15} color={t.color}/>`

Label `<div>` (t.label):

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `800`              |
| Typography | font-size      | `16`               |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.01em`          |

Attribution `<div>` (below label):

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | margin-top     | `2`                           |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-muted)`             |
| Typography | letter-spacing | `0.04em`                      |

Text: `` `by ${reporter.handle} · ${reportedAt}` ``

#### Evidence card (inside recap)

| Category   | Property      | Value                                            |
| ---------- | ------------- | ------------------------------------------------ |
| Spacing    | margin-top    | `10`                                             |
| Spacing    | padding       | `8px 10px`                                       |
| Color      | background    | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| Border     | border        | `1px solid var(--border)`                        |
| Dimensions | border-radius | `8`                                              |
| Layout     | display       | `flex`                                           |
| Layout     | align-items   | `center`                                         |
| Spacing    | gap           | `8`                                              |

Link icon SVG: `width="13"` `height="13"` `viewBox="0 0 14 14"` `fill="none"` — same path as in EvidenceForm and PendingReportBanner (`stroke="var(--fg-muted)"` `strokeWidth="1.3"`)

Evidence text `<span>`: `flex: 1`, `min-width: 0`, `font-family: Inter`, `font-size: 12.5`, `color: var(--fg)`, `letter-spacing: -0.005em`

"view" label `<span>`: `font-family: 'JetBrains Mono'`, `font-size: 9`, `color: var(--fg-subtle)`, `letter-spacing: 0.06em`, `text-transform: uppercase`

### "How do you know?" section

Eyebrow wrapper `<div>`: `margin-top: 16`, `margin-bottom: 10`

Three `<window.VerifyOption>` rows (in order):

| selected value    | label                                 | sub                                                                                                   |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `"saw-source"`    | `"I saw the same source"`             | `` `I also saw the ${kind === "soldout" ? "vendor listing" : "post / email"} the reporter linked.` `` |
| `"own-evidence"`  | `"I have my own evidence"`            | `"A different email, post, or announcement — I'll attach it on the next step."`                       |
| `"word-of-mouth"` | `"I heard from someone at the venue"` | `"Staff, the artist's team, or another fan who was there."`                                           |

### Caution note `<div>`

| Category   | Property       | Value                                            |
| ---------- | -------------- | ------------------------------------------------ |
| Spacing    | margin-top     | `14`                                             |
| Spacing    | padding        | `10px 12px`                                      |
| Color      | background     | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| Border     | border         | `1px solid var(--border)`                        |
| Dimensions | border-radius  | `10`                                             |
| Typography | font-family    | `Inter, system-ui`                               |
| Typography | font-size      | `12`                                             |
| Color      | color          | `var(--fg-subtle)`                               |
| Typography | letter-spacing | `-0.005em`                                       |
| Typography | line-height    | `1.45`                                           |

Text: `"Status reports reshape the event page. A wrong "cancelled" hides the show from upcoming. Vouch in good faith — fans rely on this."`

### Footer

#### "Confirm — same status" button

| Category   | Property        | Value                 |
| ---------- | --------------- | --------------------- |
| Layout     | display         | `flex`                |
| Layout     | align-items     | `center`              |
| Layout     | justify-content | `center`              |
| Spacing    | gap             | `8`                   |
| Dimensions | height          | `48`                  |
| Dimensions | width           | `100%`                |
| Dimensions | border-radius   | `10`                  |
| Color      | background      | `t.color`             |
| Color      | color           | `var(--fg-on-accent)` |
| Typography | font-family     | `Inter, system-ui`    |
| Typography | font-weight     | `800`                 |
| Typography | font-size       | `14.5`                |
| Typography | letter-spacing  | `-0.005em`            |

Glyph: `<window.PendingCheckGlyph size={13} color="var(--fg-on-accent)"/>`, label: `"Confirm — same status"`

#### Counter-report button

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Dimensions | width          | `100%`             |
| Spacing    | margin-top     | `10`               |
| Spacing    | padding        | `8px 0`            |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `600`              |
| Typography | font-size      | `13`               |
| Color      | color          | `var(--fg-muted)`  |
| Typography | letter-spacing | `-0.005em`         |
| Typography | text-align     | `center`           |
| Layout     | display        | `block`            |

Text: `"I think this is wrong → file a counter-report"`

---

## Component: LiveReportBanner

Props: `kind = "cancelled"`, `reportedBy = "@kel"`, `confirms = 2`

### Outer wrapper `<div>`

| Category   | Property      | Value                   |
| ---------- | ------------- | ----------------------- |
| Dimensions | border-radius | `12`                    |
| Color      | background    | `t.bg`                  |
| Border     | border        | `1px solid ${t.border}` |
| Spacing    | padding       | `12px 14px`             |

### Header row `<div>`

| Category | Property    | Value    |
| -------- | ----------- | -------- |
| Layout   | display     | `flex`   |
| Layout   | align-items | `center` |
| Spacing  | gap         | `10`     |

### Icon `<span>`

| Category   | Property        | Value        |
| ---------- | --------------- | ------------ |
| Dimensions | width           | `32`         |
| Dimensions | height          | `32`         |
| Dimensions | border-radius   | `8`          |
| Layout     | flex-shrink     | `0`          |
| Color      | background      | `t.bgStrong` |
| Color      | color           | `t.color`    |
| Layout     | display         | `flex`       |
| Layout     | align-items     | `center`     |
| Layout     | justify-content | `center`     |

Glyph: `<G size={15} color={t.color}/>`

### Text block `<div>`

| Category | Property | Value |
| -------- | -------- | ----- |
| Layout   | flex     | `1`   |

#### Headline `<div>`

| Category   | Property       | Value              |
| ---------- | -------------- | ------------------ |
| Typography | font-family    | `Inter, system-ui` |
| Typography | font-weight    | `800`              |
| Typography | font-size      | `15`               |
| Color      | color          | `var(--fg)`        |
| Typography | letter-spacing | `-0.01em`          |

Text by kind:

- `kind === "cancelled"`: `"This show is cancelled."`
- `kind === "postponed"`: `"This show has been postponed."`
- `kind === "soldout"`: `"This show is sold out."`

#### Sub-label `<div>`

| Category   | Property       | Value                         |
| ---------- | -------------- | ----------------------------- |
| Spacing    | margin-top     | `2`                           |
| Typography | font-family    | `'JetBrains Mono', monospace` |
| Typography | font-size      | `9`                           |
| Color      | color          | `var(--fg-muted)`             |
| Typography | letter-spacing | `0.04em`                      |

Text: `` `Confirmed by ${confirms} fans · reported by ${reportedBy}` ``

---

## SVG Icons

### SoldOutGlyph

Props: `size = 12`, `color = "currentColor"`

| Property           | Value              |
| ------------------ | ------------------ |
| width              | `size` prop        |
| height             | `size` prop        |
| viewBox            | `0 0 12 12`        |
| fill               | `none`             |
| circle cx          | `6`                |
| circle cy          | `6`                |
| circle r           | `4.5`              |
| circle stroke      | `color` prop       |
| circle strokeWidth | `1.4`              |
| path d             | `M3.5 8.5L8.5 3.5` |
| path stroke        | `color` prop       |
| path strokeWidth   | `1.4`              |
| path strokeLinecap | `round`            |

### CancelledGlyph

Props: `size = 12`, `color = "currentColor"`

| Property           | Value              |
| ------------------ | ------------------ |
| width              | `size` prop        |
| height             | `size` prop        |
| viewBox            | `0 0 12 12`        |
| fill               | `none`             |
| path d             | `M3 3l6 6M9 3L3 9` |
| path stroke        | `color` prop       |
| path strokeWidth   | `1.6`              |
| path strokeLinecap | `round`            |

### PostponedGlyph

Props: `size = 12`, `color = "currentColor"`

| Property            | Value            |
| ------------------- | ---------------- |
| width               | `size` prop      |
| height              | `size` prop      |
| viewBox             | `0 0 12 12`      |
| fill                | `none`           |
| circle cx           | `6`              |
| circle cy           | `6`              |
| circle r            | `4.5`            |
| circle stroke       | `color` prop     |
| circle strokeWidth  | `1.3`            |
| path d              | `M6 3.5V6l2 1.4` |
| path stroke         | `color` prop     |
| path strokeWidth    | `1.4`            |
| path strokeLinecap  | `round`          |
| path strokeLinejoin | `round`          |

### TicketsAvailGlyph

Props: `size = 12`, `color = "currentColor"`

| Property               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| width                  | `size` prop                                         |
| height                 | `size` prop                                         |
| viewBox                | `0 0 12 12`                                         |
| fill                   | `none`                                              |
| path 1 d               | `M2 5a1.5 1.5 0 010 3v2h8V8a1.5 1.5 0 010-3V3H2v2z` |
| path 1 stroke          | `color` prop                                        |
| path 1 strokeWidth     | `1.3`                                               |
| path 1 strokeLinejoin  | `round`                                             |
| path 2 d               | `M5 5v3`                                            |
| path 2 stroke          | `color` prop                                        |
| path 2 strokeWidth     | `1.3`                                               |
| path 2 strokeLinecap   | `round`                                             |
| path 2 strokeDasharray | `1.2 1.6`                                           |
