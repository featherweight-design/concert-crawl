# Design Property Table — Phase 8.5 Consumer UI (Pass A: PendingCardB)

Source file: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/pending-card.jsx`

---

## Constants

| Name | Value |
|------|-------|
| `AZURE` | `oklch(0.62 0.12 240)` |
| `GOLD` | `oklch(0.66 0.14 78)` |

---

## Token Bundle: `pendingTokens(kind)`

### kind === "community" (default)

| Token | Value |
|-------|-------|
| `color` | `oklch(0.62 0.12 240)` (AZURE) |
| `label` | `"Community"` |
| `bg` | `color-mix(in oklab, oklch(0.62 0.12 240) 6%, var(--surface-1))` |
| `border` | `color-mix(in oklab, oklch(0.62 0.12 240) 32%, var(--border))` |
| `strip` | `color-mix(in oklab, oklch(0.62 0.12 240) 12%, transparent)` |
| `stripBorder` | `color-mix(in oklab, oklch(0.62 0.12 240) 26%, var(--border))` |
| `pill` | `color-mix(in oklab, oklch(0.62 0.12 240) 16%, transparent)` |

### kind === "boxoffice"

| Token | Value |
|-------|-------|
| `color` | `oklch(0.66 0.14 78)` (GOLD) |
| `label` | `"Box office"` |
| `bg` | `color-mix(in oklab, oklch(0.66 0.14 78) 8%, var(--surface-1))` |
| `border` | `color-mix(in oklab, oklch(0.66 0.14 78) 38%, var(--border))` |
| `strip` | `color-mix(in oklab, oklch(0.66 0.14 78) 14%, transparent)` |
| `stripBorder` | `color-mix(in oklab, oklch(0.66 0.14 78) 30%, var(--border))` |
| `pill` | `color-mix(in oklab, oklch(0.66 0.14 78) 22%, transparent)` |

---

## Component: `PendingDot`

### Props

| Prop | Default |
|------|---------|
| `size` | `7` |
| `filled` | `false` |
| `color` | `oklch(0.62 0.12 240)` (AZURE) |

### SVG

| Property | Value |
|----------|-------|
| `width` | `size` (prop) |
| `height` | `size` (prop) |
| `viewBox` | `"0 0 7 7"` |
| `flexShrink` | `0` |

### circle

| Property | Value |
|----------|-------|
| `cx` | `3.5` |
| `cy` | `3.5` |
| `r` | `2.6` |
| `fill` | `color` (prop) when `filled === true`; `"transparent"` when `filled === false` |
| `stroke` | `color` (prop) |
| `strokeWidth` | `1.1` |

---

## Component: `LockGlyph`

### Props

| Prop | Default |
|------|---------|
| `size` | `10` |

### SVG

| Property | Value |
|----------|-------|
| `width` | `size` (prop) |
| `height` | `size` (prop) |
| `viewBox` | `"0 0 10 10"` |
| `fill` | `"none"` |

### rect

| Property | Value |
|----------|-------|
| `x` | `2` |
| `y` | `4.5` |
| `width` | `6` |
| `height` | `4` |
| `rx` | `0.8` |
| `stroke` | `currentColor` |
| `strokeWidth` | `1.1` |

### path (shackle)

| Property | Value |
|----------|-------|
| `d` | `"M3.4 4.5V3.2A1.6 1.6 0 015 1.6a1.6 1.6 0 011.6 1.6V4.5"` |
| `stroke` | `currentColor` |
| `strokeWidth` | `1.1` |
| `fill` | `"none"` |
| `strokeLinecap` | `"round"` |

---

## Component: `CheckGlyph`

### Props

| Prop | Default |
|------|---------|
| `size` | `10` |
| `color` | `"currentColor"` |

### SVG

| Property | Value |
|----------|-------|
| `width` | `size` (prop) |
| `height` | `size` (prop) |
| `viewBox` | `"0 0 10 10"` |
| `fill` | `"none"` |

### path

| Property | Value |
|----------|-------|
| `d` | `"M1.8 5.2L4 7.4 8.4 2.6"` |
| `stroke` | `color` (prop) |
| `strokeWidth` | `1.6` |
| `strokeLinecap` | `"round"` |
| `strokeLinejoin` | `"round"` |

---

## Component: `ArrowGlyph`

### Props

| Prop | Default |
|------|---------|
| `size` | `13` |
| `dir` | `"right"` |

### SVG

| Property | Value |
|----------|-------|
| `width` | `size` (prop) |
| `height` | `size` (prop) |
| `viewBox` | `"0 0 12 12"` |
| `fill` | `"none"` |
| `transform` | `rotate(0deg)` when `dir === "right"`; `rotate(180deg)` when `dir === "left"` |

### path

| Property | Value |
|----------|-------|
| `d` | `"M2.5 6h7M6 2.5l3.5 3.5L6 9.5"` |
| `stroke` | `currentColor` |
| `strokeWidth` | `1.8` |
| `strokeLinecap` | `"round"` |
| `strokeLinejoin` | `"round"` |

---

## Component: `StarGlyph`

### Props

| Prop | Default |
|------|---------|
| `size` | `10` |
| `color` | `oklch(0.66 0.14 78)` (GOLD) |

### SVG

| Property | Value |
|----------|-------|
| `width` | `size` (prop) |
| `height` | `size` (prop) |
| `viewBox` | `"0 0 10 10"` |
| `flexShrink` | `0` |

### path

| Property | Value |
|----------|-------|
| `d` | `"M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"` |
| `fill` | `color` (prop) |

---

## Component: `Eyebrow`

### Props

| Prop | Default |
|------|---------|
| `children` | — |
| `color` | `"var(--fg-subtle)"` |

### Container div

| Property | Value |
|----------|-------|
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9px` |
| `color` | `color` (prop) |
| `letter-spacing` | `0.06em` |
| `text-transform` | `uppercase` |

---

## Component: `PendingTrustPill`

### Props

| Prop | Default |
|------|---------|
| `kind` | — |

### Container span

| Property | Value |
|----------|-------|
| `display` | `inline-flex` |
| `align-items` | `center` |
| `gap` | `4px` |
| `padding` | `2px 6px` |
| `border-radius` | `4px` |
| `background` | `t.pill` (from `pendingTokens(kind)`) |
| `color` | `t.color` (from `pendingTokens(kind)`) |
| `border` | `1px solid color-mix(in oklab, oklch(0.66 0.14 78) 60%, transparent)` when `kind === "boxoffice"`; `none` otherwise |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9px` |
| `letter-spacing` | `0.06em` |
| `text-transform` | `uppercase` |
| `font-weight` | `700` |
| `line-height` | `1` |
| `white-space` | `nowrap` |

### Conditional rendering

| Condition | Behavior |
|-----------|----------|
| `kind === "boxoffice"` | Renders `<StarGlyph size={8}/>` before label text |
| `kind !== "boxoffice"` | No icon; label text only |

### Label text

| kind | Text rendered |
|------|--------------|
| `"community"` | `"Community"` |
| `"boxoffice"` | `"Box office"` |

---

## Component: `PendingCardB`

### Props

| Prop | Type / Default |
|------|----------------|
| `floor` | number, default `48` |
| `ceiling` | number or null, default `null` |
| `tier` | string, default `"GA"` |
| `vendor` | string, default `"AXS"` |
| `kind` | `"community"` \| `"boxoffice"`, default `"community"` |
| `action` | string or null, default `null` |
| `method` | string or null, default `null` |
| `submitter` | `{ handle, url }` or omit/null, default `{ handle: "@hugh", url: "/u/hugh" }` |
| `submittedAt` | string, default `"2h ago"` |
| `confirms` | number, default `1` |
| `needed` | number, default `2` |
| `view` | `"other"` \| `"submitter"` \| `"self-locked"`, default `"other"` |
| `note` | string or null, default `null` |

### Derived values

| Variable | Expression |
|----------|-----------|
| `t` | `pendingTokens(kind)` |
| `isSubmitter` | `view === "submitter" \|\| view === "self-locked"` |
| `isBox` | `kind === "boxoffice"` |
| `boSubtier` | `boxOfficeAction(action, method)` when `isBox`; `null` otherwise |

---

### Outer container

| Property | Value |
|----------|-------|
| `padding` | `0` |
| `border-radius` | `12px` |
| `background` | `t.bg` when `isBox`; `var(--surface-1)` otherwise |
| `border` | `1px solid ${t.border}` when `isBox`; `1px solid var(--border)` otherwise |
| `box-shadow` | `inset 0 1px 0 color-mix(in oklab, oklch(0.66 0.14 78) 40%, transparent)` when `isBox`; `none` otherwise |
| `overflow` | `hidden` |

---

### Pending strip

| Property | Value |
|----------|-------|
| `padding` | `8px 14px` |
| `background` | `t.strip` |
| `border-bottom` | `1px solid ${t.stripBorder}` |
| `display` | `flex` |
| `align-items` | `center` |
| `justify-content` | `space-between` |
| `gap` | `10px` |
| `flex-wrap` | `wrap` |

#### Strip left group (inline-flex)

| Property | Value |
|----------|-------|
| `display` | `inline-flex` |
| `align-items` | `center` |
| `gap` | `8px` |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9.5px` |
| `color` | `t.color` |
| `letter-spacing` | `0.08em` |
| `text-transform` | `uppercase` |
| `font-weight` | `700` |

#### Strip left group — contents

| Element | Value |
|---------|-------|
| "Pending" span | literal text `"Pending"` |
| Separator span | `"·"` at `opacity: 0.4` |
| Dots span | `display: inline-flex; gap: 3px`; renders `needed` `<PendingDot>` elements; dots where `i < confirms` get `filled={true}`, rest `filled={false}`; all use `color={t.color}` |
| Count span | `"{confirms} of {needed} confirmed"` |

#### Strip right span ("N to go")

| Property | Value |
|----------|-------|
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9px` |
| `color` | `var(--fg-subtle)` |
| `letter-spacing` | `0.04em` |
| `text-transform` | `uppercase` |
| Content | `"{needed - confirms} to go"` |

---

### Body container

| Property | Value |
|----------|-------|
| `padding` | `14px 14px 12px` |

---

### Top row (Eyebrow row)

| Property | Value |
|----------|-------|
| `display` | `flex` |
| `align-items` | `center` |
| `justify-content` | `space-between` |

#### Eyebrow text

| Condition | `color` prop | `children` |
|-----------|-------------|------------|
| `isBox === true` | `t.color` | `"Box office"` |
| `isBox === false` | `"var(--fg-subtle)"` (Eyebrow default) | `"Tickets"` |

---

### Headline row

| Property | Value |
|----------|-------|
| `margin-top` | `6px` |
| `display` | `flex` |
| `align-items` | `baseline` |
| `gap` | `10px` |
| `flex-wrap` | `wrap` |

#### Price span

| Property | Value |
|----------|-------|
| `font-family` | `Inter, system-ui` |
| `font-weight` | `800` |
| `font-size` | `28px` |
| `color` | `var(--fg)` |
| `letter-spacing` | `-0.025em` |
| `line-height` | `1.05` |
| Content | `formatRange(floor, ceiling)` → `"$floor–$ceiling"` when `ceiling && ceiling > floor`; `"$floor"` otherwise |

#### Tier span

| Property | Value |
|----------|-------|
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `11px` |
| `color` | `var(--fg-muted)` |
| `letter-spacing` | `0.06em` |
| `text-transform` | `uppercase` |
| `font-weight` | `700` |
| Content | `tier` prop value |

#### "face value · no fees" span (conditional)

| Condition | Renders |
|-----------|---------|
| `isBox === true` | Renders this span |
| `isBox === false` | Does not render |

| Property | Value |
|----------|-------|
| `font-family` | `Inter, system-ui` |
| `font-weight` | `600` |
| `font-size` | `12px` |
| `color` | `t.color` |
| `letter-spacing` | `-0.005em` |
| Content | `"face value · no fees"` |

#### PendingTrustPill

Always renders; receives `kind` prop.

---

### Vendor line

| Property | Value |
|----------|-------|
| `margin-top` | `6px` |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `10px` |
| `color` | `var(--fg-muted)` |
| `letter-spacing` | `0.04em` |
| Content | `"seen on {vendor}"` |

---

### Box-office subtier line (conditional)

| Condition | Renders |
|-----------|---------|
| `boSubtier` is truthy | Renders this div |
| `boSubtier` is null/falsy | Does not render |

| Property | Value |
|----------|-------|
| `margin-top` | `4px` |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9px` |
| `color` | `oklch(0.66 0.14 78)` (GOLD) |
| `letter-spacing` | `0.04em` |

#### Inner span

| Property | Value |
|----------|-------|
| `font-weight` | `700` |
| Content | `boSubtier` value (result of `boxOfficeAction(action, method)`) |

#### `boxOfficeAction` mapping

| action | method | Output string |
|--------|--------|---------------|
| `"bought"` | `"in-person"` | `"Bought in person at the venue"` |
| `"bought"` | `"phone"` | `"Bought by phone from the venue"` |
| `"saw"` | `"in-person"` | `"Saw at the box office in person"` |
| `"saw"` | `"phone"` | `"Called the box office"` |
| any other combo | — | `null` (subtier line does not render) |

---

### Attribution line

| Property | Value |
|----------|-------|
| `margin-top` | `8px` |
| `display` | `inline-flex` |
| `align-items` | `center` |
| `gap` | `6px` |
| `flex-wrap` | `wrap` |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `9px` |
| `color` | `var(--fg-muted)` |
| `letter-spacing` | `0.04em` |

#### "Submitted by" prefix

Static text `"Submitted by"`.

#### Submitter element (conditional)

| Condition | Element | Styles |
|-----------|---------|--------|
| `isSubmitter === true` | `<span>you</span>` | `color: t.color; font-weight: 700` |
| `isSubmitter === false` AND `submitter` is truthy | `<a href={submitter.url}>` with `{submitter.handle}` | `color: var(--fg-muted); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 2px` |
| `isSubmitter === false` AND `submitter` is falsy | `<span>an anonymous fan</span>` | `font-style: italic; opacity: 0.85` |

#### Separator + timestamp

| Element | Value |
|---------|-------|
| `"·"` separator span | `opacity: 0.5` |
| Timestamp span | `{submittedAt}` prop value |

---

### Note block (conditional)

| Condition | Renders |
|-----------|---------|
| `note` is truthy | Renders this div |
| `note` is null/falsy | Does not render |

| Property | Value |
|----------|-------|
| `margin-top` | `10px` |
| `padding` | `8px 10px` |
| `background` | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| `border` | `1px solid var(--border)` |
| `border-radius` | `8px` |
| `font-family` | `Inter, system-ui` |
| `font-size` | `12.5px` |
| `color` | `var(--fg-muted)` |
| `letter-spacing` | `-0.005em` |
| `line-height` | `1.45` |
| `font-style` | `italic` |
| Content | `"{note}"` (note value wrapped in curly quotes) |

---

### Footer

| Property | Value |
|----------|-------|
| `margin-top` | `12px` |
| `padding-top` | `10px` |
| `border-top` | `1px solid var(--border)` |
| `display` | `flex` |
| `align-items` | `center` |
| `justify-content` | `space-between` |
| `gap` | `10px` |
| `flex-wrap` | `wrap` |

---

#### Footer view: `"other"`

Both elements render when `view === "other"`.

##### "Saw a different number?" button

| Property | Value |
|----------|-------|
| `all` | `unset` |
| `cursor` | `pointer` |
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `10px` |
| `color` | `var(--fg-subtle)` |
| `letter-spacing` | `0.04em` |
| `text-transform` | `uppercase` |
| Content | `"Saw a different number?"` |

##### "Confirm price" button

| Property | Value |
|----------|-------|
| `all` | `unset` |
| `cursor` | `pointer` |
| `display` | `inline-flex` |
| `align-items` | `center` |
| `gap` | `6px` |
| `padding` | `7px 12px` |
| `border-radius` | `8px` |
| `background` | `t.color` |
| `color` | `var(--fg-on-accent)` |
| `font-family` | `Inter, system-ui` |
| `font-weight` | `700` |
| `font-size` | `12.5px` |
| `letter-spacing` | `-0.005em` |
| Content | `<CheckGlyph size={11} color="var(--fg-on-accent)"/>` + `"Confirm price"` |

---

#### Footer view: `"self-locked"`

Both elements render when `view === "self-locked"`.

##### "Your submission" label

| Property | Value |
|----------|-------|
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `10px` |
| `color` | `var(--fg-subtle)` |
| `letter-spacing` | `0.04em` |
| `text-transform` | `uppercase` |
| Content | `"Your submission"` |

##### "Waiting on one more fan" span

| Property | Value |
|----------|-------|
| `display` | `inline-flex` |
| `align-items` | `center` |
| `gap` | `6px` |
| `padding` | `7px 12px` |
| `border-radius` | `8px` |
| `background` | `color-mix(in oklab, var(--fg) 5%, transparent)` |
| `border` | `1px dashed var(--border-strong)` |
| `font-family` | `Inter, system-ui` |
| `font-weight` | `600` |
| `font-size` | `12px` |
| `color` | `var(--fg-muted)` |
| `letter-spacing` | `-0.005em` |
| Content | `<LockGlyph size={10}/>` + `"Waiting on one more fan"` |

---

#### Footer view: `"submitter"`

Both elements render when `view === "submitter"`.

##### "Your submission" label

| Property | Value |
|----------|-------|
| `font-family` | `'JetBrains Mono', monospace` |
| `font-size` | `10px` |
| `color` | `var(--fg-subtle)` |
| `letter-spacing` | `0.04em` |
| `text-transform` | `uppercase` |
| Content | `"Your submission"` |

##### Action buttons container

| Property | Value |
|----------|-------|
| `display` | `flex` |
| `gap` | `14px` |

##### "Edit" button

| Property | Value |
|----------|-------|
| `all` | `unset` |
| `cursor` | `pointer` |
| `font-family` | `Inter, system-ui` |
| `font-weight` | `600` |
| `font-size` | `12px` |
| `color` | `var(--signal)` |
| `letter-spacing` | `-0.005em` |
| Content | `"Edit"` |

##### "Withdraw" button

| Property | Value |
|----------|-------|
| `all` | `unset` |
| `cursor` | `pointer` |
| `font-family` | `Inter, system-ui` |
| `font-weight` | `600` |
| `font-size` | `12px` |
| `color` | `var(--warning)` |
| `letter-spacing` | `-0.005em` |
| Content | `"Withdraw"` |

---

## Hover / Interactive States

No hover or focus styles are defined in the source. All interactive elements use `all: "unset"` with `cursor: "pointer"` only.

---

## Conditional Rendering Summary

| Element | Condition |
|---------|-----------|
| Outer `box-shadow` | Only when `isBox === true` |
| Outer `background` | `t.bg` when `isBox`; `var(--surface-1)` otherwise |
| Outer `border` | `t.border` when `isBox`; `var(--border)` otherwise |
| Eyebrow text | `"Box office"` + `color: t.color` when `isBox`; `"Tickets"` + default color otherwise |
| `PendingDot` filled state | `filled={true}` for dots where `i < confirms`; `filled={false}` otherwise |
| `"face value · no fees"` span | Only when `isBox === true` |
| `PendingTrustPill` | Always renders |
| `StarGlyph` inside pill | Only when `kind === "boxoffice"` |
| Box-office subtier line | Only when `boSubtier` is truthy (requires `isBox` AND `boxOfficeAction` returns a string) |
| Attribution "you" | When `isSubmitter === true` (`view === "submitter"` or `"self-locked"`) |
| Attribution handle link | When `isSubmitter === false` AND `submitter` is truthy |
| Attribution "an anonymous fan" | When `isSubmitter === false` AND `submitter` is falsy |
| Note block | Only when `note` prop is truthy |
| Footer "other" state | Only when `view === "other"` |
| Footer "self-locked" state | Only when `view === "self-locked"` |
| Footer "submitter" state | Only when `view === "submitter"` |
