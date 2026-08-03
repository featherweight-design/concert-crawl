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
