# Design Property Table — Phase 8.5 Consumer UI (Pass B: Corroboration + Dispute)

Source file: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/dispute-surfaces.jsx`

---

## Component: SheetFrame

### Outer container

| Property | Value |
|----------|-------|
| width | `393` |
| height | prop `height` (default `720`) |
| display | `flex` |
| flex-direction | `column` |
| background | `var(--bg)` |
| color | `var(--fg)` |
| font-family | `Inter, system-ui, sans-serif` |
| box-sizing | `border-box` |
| border-radius | `18` |
| overflow | `hidden` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |

### Header row (drag handle + eyebrow + cancel button row)

| Property | Value |
|----------|-------|
| padding | `10px 16px 8px` |
| display | `flex` |
| align-items | `center` |
| justify-content | `space-between` |
| position | `relative` |

### Drag handle (pill)

| Property | Value |
|----------|-------|
| position | `absolute` |
| top | `8` |
| left | `50%` |
| transform | `translateX(-50%)` |
| width | `36` |
| height | `4` |
| border-radius | `999` |
| background | `var(--border-strong)` |

### Eyebrow span

| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9` |
| color | `var(--fg-subtle)` |
| letter-spacing | `0.08em` |
| text-transform | `uppercase` |
| margin-top | `10` |

### Cancel button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| margin-top | `10` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9` |
| color | `var(--fg-subtle)` |
| letter-spacing | `0.04em` |
| text-transform | `uppercase` |

### Title / subtitle block

| Property | Value |
|----------|-------|
| padding | `8px 18px 0` |

### Title (h2)

| Property | Value |
|----------|-------|
| margin | `0` |
| font-family | `Inter, system-ui` |
| font-weight | `900` |
| font-size | `24` |
| color | `var(--fg)` |
| letter-spacing | `-0.025em` |
| line-height | `1.1` |
| text-wrap | `balance` |

### Subtitle (p) — renders only when `subtitle` prop is provided

| Property | Value |
|----------|-------|
| margin | `6px 0 0` |
| font-family | `Inter, system-ui` |
| font-size | `13.5` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.45` |
| text-wrap | `pretty` |

### Scroll body

| Property | Value |
|----------|-------|
| flex | `1` |
| overflow-y | `auto` |
| padding | `16px 18px` |

### Footer — renders only when `footer` prop is provided

| Property | Value |
|----------|-------|
| padding | `12px 18px 18px` |
| background | `var(--bg)` |
| border-top | `1px solid var(--border)` |

---

## Component: SubmissionDetailCard

### Outer container

| Property | Value |
|----------|-------|
| padding | `12px 14px` |
| background | when `kind === "boxoffice"`: `tokens.bg`; otherwise: `color-mix(in oklab, ${tokens.color} 6%, var(--surface-1))` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `${tokens.border}` |
| border-radius | `12` |

### Price + tier row

| Property | Value |
|----------|-------|
| display | `flex` |
| align-items | `baseline` |
| gap | `10` |
| flex-wrap | `wrap` |

### Price span (FormatRange output)

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `30` |
| color | `var(--fg)` |
| letter-spacing | `-0.025em` |
| line-height | `1` |

### Tier span

| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `11` |
| color | `var(--fg-muted)` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |
| font-weight | `700` |

### "face value · no fees" span — renders only when `kind === "boxoffice"`

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `600` |
| font-size | `12` |
| color | `tokens.color` |
| letter-spacing | `-0.005em` |

### Metadata grid

| Property | Value |
|----------|-------|
| margin-top | `8` |
| display | `grid` |
| grid-template-columns | `auto 1fr` |
| gap | `4px 12px` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9.5` |
| letter-spacing | `0.04em` |

### Metadata label cells (Vendor / By / When)

| Property | Value |
|----------|-------|
| color | `var(--fg-subtle)` |
| text-transform | `uppercase` |

### Metadata value cells

| Property | Value |
|----------|-------|
| color | `var(--fg)` |

### "By" row — conditional rendering

Renders only when `showAttribution === true` AND `submitter` is truthy.

### Note block — renders only when `note` prop is provided

| Property | Value |
|----------|-------|
| margin-top | `10` |
| padding | `8px 10px` |
| background | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |
| border-radius | `8` |
| font-family | `Inter, system-ui` |
| font-size | `12.5` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.45` |
| font-style | `italic` |

---

## Component: VerifyOption

### Button — unselected state

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| display | `flex` |
| align-items | `flex-start` |
| gap | `12` |
| width | `100%` |
| box-sizing | `border-box` |
| padding | `12px 14px` |
| border-radius | `10` |
| background | `var(--surface-1)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |
| margin-bottom | `8` |

### Button — selected state

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| display | `flex` |
| align-items | `flex-start` |
| gap | `12` |
| width | `100%` |
| box-sizing | `border-box` |
| padding | `12px 14px` |
| border-radius | `10` |
| background | `color-mix(in oklab, ${accent} 10%, transparent)` |
| border-width | `1.5px` |
| border-style | `solid` |
| border-color | `${accent}` |
| margin-bottom | `8` |

### Radio dot — unselected state

| Property | Value |
|----------|-------|
| width | `16` |
| height | `16` |
| border-radius | `50%` |
| flex-shrink | `0` |
| margin-top | `2` |
| background | `transparent` |
| border-width | `1.5px` |
| border-style | `solid` |
| border-color | `var(--border-strong)` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |

### Radio dot — selected state

| Property | Value |
|----------|-------|
| width | `16` |
| height | `16` |
| border-radius | `50%` |
| flex-shrink | `0` |
| margin-top | `2` |
| background | `${accent}` |
| border-width | `1.5px` |
| border-style | `solid` |
| border-color | `${accent}` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |

### Check glyph inside radio dot — renders only when `selected` is true

| Property | Value |
|----------|-------|
| size | `9` |
| color | `var(--fg-on-accent)` |

### Text wrapper span

| Property | Value |
|----------|-------|
| flex | `1` |
| min-width | `0` |

### Label text div

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `13.5` |
| color | `var(--fg)` |
| letter-spacing | `-0.005em` |

### Sub text div — renders only when `sub` prop is provided

| Property | Value |
|----------|-------|
| margin-top | `2` |
| font-family | `Inter, system-ui` |
| font-weight | `500` |
| font-size | `12` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.4` |

---

## Component: ChipGroup

### Outer wrapper div

No inline styles (bare `<div>`).

### Chips flex row

| Property | Value |
|----------|-------|
| margin-top | `6` |
| display | `flex` |
| flex-wrap | `wrap` |
| gap | `6` |

### Chip button — unselected state

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| padding | `8px 14px` |
| border-radius | `999` |
| background | `var(--surface-1)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border-strong)` |
| font-family | `Inter, system-ui` |
| font-weight | `600` |
| font-size | `13.5` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |

### Chip button — selected (active) state

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| padding | `8px 14px` |
| border-radius | `999` |
| background | `color-mix(in oklab, ${accent} 14%, transparent)` |
| border-width | `1.5px` |
| border-style | `solid` |
| border-color | `${accent}` |
| font-family | `Inter, system-ui` |
| font-weight | `600` |
| font-size | `13.5` |
| color | `var(--fg)` |
| letter-spacing | `-0.005em` |

---

## Component: NumField

### Outer wrapper div

| Property | Value |
|----------|-------|
| flex | `1` |

### Optional label suffix span — renders only when `optional` prop is truthy

| Property | Value |
|----------|-------|
| margin-left | `6` |
| opacity | `0.7` |
| text-transform | `uppercase` |

### Input row div

| Property | Value |
|----------|-------|
| margin-top | `6` |
| padding | `10px 12px` |
| background | `var(--surface-1)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border-strong)` |
| border-radius | `10` |
| display | `flex` |
| align-items | `center` |
| gap | `6` |

### Dollar sign span

| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `14` |
| color | `var(--fg-muted)` |
| font-weight | `700` |

### Value / placeholder span

| Property | Value |
|----------|-------|
| flex | `1` |
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `16` |
| color | when `value` is truthy: `var(--fg)`; otherwise: `var(--fg-subtle)` |

---

## Component: CorroborationSheet

### State: `self-locked`

Renders `<SheetFrame>` with the following props:

| Prop | Value |
|------|-------|
| title | `"That's your number."` |
| subtitle | `"Submitters can't confirm their own price — we need another fan to vouch. Edit or withdraw if anything's changed."` |
| height | `620` |

#### Self-locked footer — wrapper div

| Property | Value |
|----------|-------|
| display | `flex` |
| gap | `10` |

#### "Edit submission" button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| flex | `1` |
| text-align | `center` |
| height | `44` |
| border-radius | `9` |
| background | `var(--surface-1)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border-strong)` |
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `13.5` |
| color | `var(--fg)` |
| letter-spacing | `-0.005em` |

#### "Withdraw" button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| flex | `1` |
| text-align | `center` |
| height | `44` |
| border-radius | `9` |
| background | `transparent` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--warning)` |
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `13.5` |
| color | `var(--warning)` |
| letter-spacing | `-0.005em` |

#### Waiting notice box

| Property | Value |
|----------|-------|
| margin-top | `18` |
| display | `flex` |
| align-items | `flex-start` |
| gap | `10` |
| padding | `12px 14px` |
| background | `color-mix(in oklab, var(--fg) 4%, transparent)` |
| border-width | `1px` |
| border-style | `dashed` |
| border-color | `var(--border-strong)` |
| border-radius | `10` |

#### Lock icon wrapper span (inside notice box)

| Property | Value |
|----------|-------|
| color | `var(--fg-muted)` |
| margin-top | `1` |

#### Lock icon

| Property | Value |
|----------|-------|
| size | `14` |

#### Notice body text div

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `13` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.45` |

#### Bold lead text inside notice (b element)

| Property | Value |
|----------|-------|
| color | `var(--fg)` |

---

### State: `fresh`

Accent color is determined by `kind` prop: `kind === "boxoffice"` → `GOLD_D` (`oklch(0.66 0.14 78)`); otherwise `AZ_D` (`oklch(0.62 0.12 240)`).

Renders `<SheetFrame>` with the following props:

| Prop | Value |
|------|-------|
| title | when `ceiling` is truthy: `"Did you also see ${FormatRange(floor, ceiling)}?"`; otherwise: `"Did you also see $${floor}?"` |
| subtitle | `"Two fan confirms moves a price from pending to live. Pick how you checked — we're trying to keep this honest, not fast."` |
| height | `820` |

#### Fresh footer — "Confirm" button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| box-sizing | `border-box` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |
| gap | `8` |
| height | `48` |
| width | `100%` |
| border-radius | `10` |
| background | `accentColor` |
| color | `var(--fg-on-accent)` |
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `14.5` |
| letter-spacing | `-0.005em` |

#### Check icon inside Confirm button

| Property | Value |
|----------|-------|
| size | `13` |
| color | `var(--fg-on-accent)` |

#### Fresh footer — secondary link text button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| width | `100%` |
| margin-top | `10` |
| padding | `8px 0` |
| font-family | `Inter, system-ui` |
| font-weight | `600` |
| font-size | `13` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| text-align | `center` |
| display | `block` |

#### "How did you check the price?" eyebrow wrapper

| Property | Value |
|----------|-------|
| margin-top | `16` |
| margin-bottom | `10` |

#### Four VerifyOption buttons

All four use `accent={accentColor}`. Selected state is controlled by the `selected` prop compared to these values:

| option key | selected when `selected ===` |
|---|---|
| `Same vendor (${vendor})` | `"same-vendor"` |
| `A different vendor / site` | `"other-vendor"` |
| `Saw the price at the box office` | `"box-office-saw"` |
| `Bought a ticket at the box office` | `"box-office-bought"` |

#### Honesty disclaimer box (bottom of scroll area)

| Property | Value |
|----------|-------|
| margin-top | `16` |
| padding | `10px 12px` |
| background | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |
| border-radius | `10` |
| font-family | `Inter, system-ui` |
| font-size | `12` |
| color | `var(--fg-subtle)` |
| letter-spacing | `-0.005em` |
| line-height | `1.45` |

---

## Component: DisputedPriceCard

### Outer container

| Property | Value |
|----------|-------|
| border-radius | `12` |
| background | `var(--surface-1)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |
| overflow | `hidden` |

### Update strip (top bar)

| Property | Value |
|----------|-------|
| padding | `9px 14px` |
| background | `color-mix(in oklab, var(--fg-muted) 8%, transparent)` |
| border-bottom | `1px dashed var(--border-strong)` |
| display | `flex` |
| align-items | `center` |
| gap | `10` |
| flex-wrap | `wrap` |

### "update pending" badge span

| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `5` |
| padding | `2px 6px` |
| border-radius | `4` |
| background | `color-mix(in oklab, var(--fg-muted) 14%, transparent)` |
| color | `var(--fg)` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |
| font-weight | `700` |
| line-height | `1` |

### SVG inside badge

| Property | Value |
|----------|-------|
| width | `9` |
| height | `9` |

### Dispute meta text span (in update strip)

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `12` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| flex | `1` |
| min-width | `0` |

### Bold price inside dispute meta text (b element)

| Property | Value |
|----------|-------|
| color | `var(--fg)` |

### Card body

| Property | Value |
|----------|-------|
| padding | `14px 14px 12px` |

### Price + tier row (inside card body)

| Property | Value |
|----------|-------|
| margin-top | `6` |
| display | `flex` |
| align-items | `baseline` |
| gap | `10` |
| flex-wrap | `wrap` |

### Price span (FormatRange output)

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `28` |
| color | `var(--fg)` |
| letter-spacing | `-0.025em` |
| line-height | `1.05` |

### Tier span

| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `11` |
| color | `var(--fg-muted)` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |
| font-weight | `700` |

### "seen on {vendor}" line

| Property | Value |
|----------|-------|
| margin-top | `6` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `10` |
| color | `var(--fg-muted)` |
| letter-spacing | `0.04em` |

### Attribution row

| Property | Value |
|----------|-------|
| margin-top | `8` |
| display | `inline-flex` |
| align-items | `center` |
| gap | `6` |
| flex-wrap | `wrap` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9` |
| color | `var(--fg-muted)` |
| letter-spacing | `0.04em` |

### Submitter handle anchor

| Property | Value |
|----------|-------|
| color | `var(--fg-muted)` |
| text-decoration | `underline` |
| text-decoration-color | `var(--border-strong)` |
| text-underline-offset | `2` |

### Separator dots (·)

| Property | Value |
|----------|-------|
| opacity | `0.5` |

### Bottom action row

| Property | Value |
|----------|-------|
| margin-top | `12` |
| padding-top | `10` |
| border-top | `1px solid var(--border)` |
| display | `flex` |
| align-items | `center` |
| justify-content | `space-between` |
| gap | `10` |
| flex-wrap | `wrap` |

### "Got a different number?" text span

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `12` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| flex | `1` |
| min-width | `0` |

### "Submit an update" button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| display | `inline-flex` |
| align-items | `center` |
| gap | `6` |
| padding | `7px 12px` |
| border-radius | `8` |
| background | `transparent` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border-strong)` |
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `12.5` |
| color | `var(--fg)` |
| letter-spacing | `-0.005em` |

### Arrow glyph inside button

| Property | Value |
|----------|-------|
| size | `11` |

---

## Component: CounterSubmitSheet

Wraps `<SheetFrame>` with the following props:

| Prop | Value |
|------|-------|
| title | `"Update the price."` |
| subtitle | `"Currently listed: ${FormatRange(currentFloor, currentCeiling)} on ${currentVendor}. Your update goes pending until another fan confirms."` |
| eyebrow | `"Price update"` |
| height | `820` |

### Footer — "Submit update" button

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| box-sizing | `border-box` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |
| gap | `8` |
| height | `48` |
| width | `100%` |
| border-radius | `10` |
| background | `var(--signal)` |
| color | `var(--fg-on-accent)` |
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `14.5` |
| letter-spacing | `-0.005em` |

### Arrow glyph inside Submit button

| Property | Value |
|----------|-------|
| size | `13` |

### Footer — disclaimer text div

| Property | Value |
|----------|-------|
| margin-top | `10` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9` |
| color | `var(--fg-subtle)` |
| letter-spacing | `0.04em` |
| text-transform | `uppercase` |
| text-align | `center` |

### Scroll body — Floor / Ceiling row

| Property | Value |
|----------|-------|
| display | `flex` |
| gap | `12` |

### Scroll body — Ceiling hint text div

| Property | Value |
|----------|-------|
| margin-top | `8` |
| font-family | `Inter, system-ui` |
| font-size | `11.5` |
| color | `var(--fg-subtle)` |
| letter-spacing | `-0.005em` |
| line-height | `1.4` |

### Scroll body — Tier chips wrapper

| Property | Value |
|----------|-------|
| margin-top | `18` |

### Scroll body — Vendor chips wrapper

| Property | Value |
|----------|-------|
| margin-top | `18` |

### Scroll body — Honesty disclaimer box

| Property | Value |
|----------|-------|
| margin-top | `18` |
| padding | `10px 12px` |
| background | `color-mix(in oklab, var(--fg) 3%, transparent)` |
| border-width | `1px` |
| border-style | `solid` |
| border-color | `var(--border)` |
| border-radius | `10` |
| font-family | `Inter, system-ui` |
| font-size | `12` |
| color | `var(--fg-subtle)` |
| letter-spacing | `-0.005em` |
| line-height | `1.45` |

### NumField instances

| Field | `label` | `value` prop | `placeholder` | `optional` |
|-------|---------|--------------|---------------|------------|
| Floor | `"Floor"` | `newFloor` | `"0"` | not set |
| Ceiling | `"Ceiling"` | `newCeiling` | `"0"` | `true` |

### ChipGroup instances

| Group | `label` | `options` constant | `selected` prop |
|-------|---------|--------------------|-----------------|
| Tier | `"Tier"` | `TIER_OPTIONS` (`["GA","Reserved","VIP","Pit","Lawn"]`) | `selectedTier` |
| Vendor | `"Where you saw it"` | `VENDOR_OPTIONS` (`["AXS","Ticketmaster","SeatGeek","DICE","Eventbrite","Venue box office"]`) | `selectedVendor` |
