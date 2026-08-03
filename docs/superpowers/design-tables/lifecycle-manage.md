# Design Property Table — ManageSheet (PR 4.5, #780)

Source of truth: `design/design_handoff_monetization_lifecycle/lifecycle-manage.jsx` + shared primitives in `monetization-shared.jsx`. All values are exact from source. Mobile = `variant="mobile"` (SheetChrome bottom sheet); Desktop = `variant="desktop"` (ModalChrome, `wide` prop passed to body).

Props: `<ManageSheet variant tier periodEnd/>` — `variant ∈ "mobile" | "desktop"` (default `"mobile"`), `tier ∈ "premium" | "supporter" | "founder"` (default `"premium"`), `periodEnd` string (default `"Jul 15"`).

---

## Component: ManageSheet — outer chrome

### Mobile: SheetChrome (`height="auto"`)

| Property                | Mobile                                 | Desktop |
| ----------------------- | -------------------------------------- | ------- |
| position                | absolute; left: 0; right: 0; bottom: 0 | —       |
| height                  | auto                                   | —       |
| background              | var(--bg)                              | —       |
| border-top-left-radius  | 24                                     | —       |
| border-top-right-radius | 24                                     | —       |
| border                  | 1px solid var(--border)                | —       |
| border-bottom           | none                                   | —       |
| box-shadow              | 0 -20px 50px rgba(0,0,0,0.4)           | —       |
| display                 | flex                                   | —       |
| flex-direction          | column                                 | —       |
| overflow                | hidden                                 | —       |
| color                   | var(--fg)                              | —       |

### Desktop: ModalChrome (`width={460}`)

| Property       | Mobile | Desktop                        |
| -------------- | ------ | ------------------------------ |
| width          | —      | 460                            |
| max-height     | —      | min(86vh, 820px)               |
| border-radius  | —      | 18                             |
| background     | —      | var(--bg-elevated)             |
| border         | —      | 1px solid var(--border-strong) |
| box-shadow     | —      | 0 30px 80px rgba(0,0,0,0.5)    |
| display        | —      | flex                           |
| flex-direction | —      | column                         |
| overflow       | —      | hidden                         |
| color          | —      | var(--fg)                      |

### Content padding wrapper (direct child of chrome)

| Property | Mobile        | Desktop        |
| -------- | ------------- | -------------- |
| padding  | 4px 16px 22px | 24px 26px 22px |

---

## Component: DragHandle (mobile only, above padding wrapper)

### Outer wrapper

| Property        | Mobile    | Desktop      |
| --------------- | --------- | ------------ |
| display         | flex      | not rendered |
| justify-content | center    | not rendered |
| padding         | 8px 0 4px | not rendered |

### Handle bar

| Property      | Mobile               | Desktop      |
| ------------- | -------------------- | ------------ |
| width         | 36                   | not rendered |
| height        | 4                    | not rendered |
| border-radius | 4                    | not rendered |
| background    | var(--border-strong) | not rendered |
| opacity       | 0.6                  | not rendered |

---

## Component: ManageBody — root column

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| display        | flex             | flex             |
| flex-direction | column           | column           |
| gap            | 16               | 16               |
| font-family    | Inter, system-ui | Inter, system-ui |
| color          | var(--fg)        | var(--fg)        |

---

## Component: RailHeader (`tone="signal"`, eyebrow=`Manage · {tierName}`, code=`{priceText}`)

### Rail row container

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 10     | 10      |
| width       | 100%   | 100%    |

### Dot

| Property      | Mobile                | Desktop               |
| ------------- | --------------------- | --------------------- |
| width         | 6                     | 6                     |
| height        | 6                     | 6                     |
| border-radius | 6                     | 6                     |
| background    | var(--signal)         | var(--signal)         |
| flex-shrink   | 0                     | 0                     |
| box-shadow    | 0 0 8px var(--signal) | 0 0 8px var(--signal) |

### Eyebrow text (MonoEyebrow, color=var(--signal), letterSpacing="0.16em")

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 10 (MonoEyebrow default)    | 10                          |
| font-weight    | 700                         | 700                         |
| text-transform | uppercase                   | uppercase                   |
| letter-spacing | 0.16em                      | 0.16em                      |
| color          | var(--signal)               | var(--signal)               |

### Hairline

| Property   | Mobile        | Desktop       |
| ---------- | ------------- | ------------- |
| flex       | 1             | 1             |
| height     | 1             | 1             |
| background | var(--border) | var(--border) |

### Code text (MonoEyebrow, letterSpacing="0.14em")

| Property       | Mobile                                 | Desktop                     |
| -------------- | -------------------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace            | 'JetBrains Mono', monospace |
| font-size      | 10                                     | 10                          |
| font-weight    | 700                                    | 700                         |
| text-transform | uppercase                              | uppercase                   |
| letter-spacing | 0.14em                                 | 0.14em                      |
| color          | var(--fg-subtle) (MonoEyebrow default) | var(--fg-subtle)            |

Copy (per tier): eyebrow `Manage · Premium` / `Manage · Supporter` / `Manage · Founder`; code `$5/MO` / `$2/MO` / `$3/MO` (rendered uppercase from `$5/mo`-style source strings — source literals are `"$5/MO"`, `"$2/MO"`, `"$3/MO"`).

---

## Component: Header block (title + subtitle + optional badge)

### Outer row

| Property        | Mobile        | Desktop       |
| --------------- | ------------- | ------------- |
| display         | flex          | flex          |
| align-items     | center        | center        |
| justify-content | space-between | space-between |
| gap             | 12            | 12            |

### Text column

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 5      | 5       |

### Title — "Manage subscription"

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-weight    | 900     | 900     |
| font-size      | 23      | 26      |
| letter-spacing | -0.03em | -0.03em |
| line-height    | 1.05    | 1.05    |

Copy: `Manage subscription`

### Subtitle

| Property       | Mobile          | Desktop         |
| -------------- | --------------- | --------------- |
| font-weight    | 500             | 500             |
| font-size      | 13              | 13              |
| color          | var(--fg-muted) | var(--fg-muted) |
| letter-spacing | -0.005em        | -0.005em        |

Copy (per tier, `periodEnd` default `Jul 15`):

- premium: `Premium · renews Jul 15. Change it, cancel it, or grab a receipt.`
- supporter: `Supporter · renews Jul 15. Change it, cancel it, or grab a receipt.`
- founder: `Founder · renews Jul 15. Change it, cancel it, or grab a receipt.`

### TierBadge (`size="lg"`) — DESKTOP ONLY (rendered only when `wide`)

Not rendered on mobile. `tier="free"` would render null (tier is never free on this surface).

| Property                      | Mobile       | Desktop                     |
| ----------------------------- | ------------ | --------------------------- |
| display                       | not rendered | inline-flex                 |
| align-items                   | not rendered | center                      |
| gap                           | not rendered | 6                           |
| padding                       | not rendered | 5px 11px                    |
| border-radius                 | not rendered | 6                           |
| font-family                   | not rendered | 'JetBrains Mono', monospace |
| font-weight                   | not rendered | 800                         |
| font-size                     | not rendered | 11                          |
| letter-spacing                | not rendered | 0.12em                      |
| text-transform                | not rendered | uppercase                   |
| white-space                   | not rendered | nowrap                      |
| line-height                   | not rendered | 1                           |
| glyph size (svg width/height) | not rendered | 10                          |

Per-tier badge colors (desktop):

| Property   | premium                                                                                                                                | supporter                                                           | founder                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| background | color-mix(in oklch, var(--signal) 14%, transparent)                                                                                    | color-mix(in oklch, var(--accent) 14%, transparent)                 | linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, transparent), color-mix(in oklch, var(--signal) 18%, transparent))                               |
| border     | 1px solid color-mix(in oklch, var(--signal) 38%, transparent)                                                                          | 1px solid color-mix(in oklch, var(--accent) 36%, transparent)       | 1px solid color-mix(in oklch, var(--signal) 50%, transparent)                                                                                                   |
| color      | var(--signal)                                                                                                                          | var(--accent)                                                       | var(--fg)                                                                                                                                                       |
| glyph      | star svg — viewBox `0 0 10 10`, polygon points `5,0 6.3,3.4 10,3.7 7.1,6 8.1,9.7 5,7.6 1.9,9.7 2.9,6 0,3.7 3.7,3.4`, fill currentColor | `+` span — font-family 'JetBrains Mono', monospace; font-weight 800 | crown svg — viewBox `0 0 10 10`, path `M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z`, fill var(--signal), stroke var(--accent), stroke-width 0.7, stroke-linejoin round |
| label      | Premium                                                                                                                                | Supporter                                                           | Founder                                                                                                                                                         |

---

## Component: Group 1 — "On Concert Crawl"

### Group container

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 9      | 9       |

### Group eyebrow (MonoEyebrow size=9.5 letterSpacing="0.16em")

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 9.5                         | 9.5                         |
| font-weight    | 700                         | 700                         |
| text-transform | uppercase                   | uppercase                   |
| letter-spacing | 0.16em                      | 0.16em                      |
| color          | var(--fg-subtle)            | var(--fg-subtle)            |

Copy: `On Concert Crawl`

### Rows stack

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 8      | 8       |

Rows (both non-portal, non-danger):

1. label `Change plan`, sub `Upgrade, downgrade, or switch tiers`, icon `I.swap`
2. label `Cancel subscription`, sub `Keep {tierName} until {periodEnd}, then roll to Free` (e.g. `Keep Premium until Jul 15, then roll to Free`; `Keep Supporter until Jul 15, then roll to Free`; `Keep Founder until Jul 15, then roll to Free`), icon `I.leave`

Note: neither Group 1 row passes `danger` — both render in default (non-danger) colors.

---

## Component: Group 2 — "Billing & receipts"

### Group container

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 9      | 9       |

### Eyebrow row

| Property        | Mobile        | Desktop       |
| --------------- | ------------- | ------------- |
| display         | flex          | flex          |
| align-items     | center        | center        |
| justify-content | space-between | space-between |

### Left eyebrow (MonoEyebrow size=9.5 letterSpacing="0.16em")

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 9.5                         | 9.5                         |
| font-weight    | 700                         | 700                         |
| text-transform | uppercase                   | uppercase                   |
| letter-spacing | 0.16em                      | 0.16em                      |
| color          | var(--fg-subtle)            | var(--fg-subtle)            |

Copy: `Billing & receipts`

### Right eyebrow (MonoEyebrow size=9 color="var(--fg-subtle)" letterSpacing="0.12em")

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 9                           | 9                           |
| font-weight    | 700                         | 700                         |
| text-transform | uppercase                   | uppercase                   |
| letter-spacing | 0.12em                      | 0.12em                      |
| color          | var(--fg-subtle)            | var(--fg-subtle)            |

Copy: `Opens Stripe in a new tab`

### Rows stack

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 8      | 8       |

Rows (all `portal` = true, so all end with PortalChip instead of chevron):

1. label `Payment method`, sub `Update the card on file`, icon `I.card`
2. label `Invoices & receipts`, sub `Download past charges`, icon `I.receipt`
3. label `Billing email`, sub `Where receipts get sent`, icon `I.mail`
4. label `Tax & region`, sub `Country, VAT, tax ID`, icon `I.globe`

---

## Component: ManageRow (button)

### Button root

| Property      | Mobile                  | Desktop                 |
| ------------- | ----------------------- | ----------------------- |
| all           | unset                   | unset                   |
| cursor        | pointer                 | pointer                 |
| box-sizing    | border-box              | border-box              |
| width         | 100%                    | 100%                    |
| display       | flex                    | flex                    |
| align-items   | center                  | center                  |
| gap           | 12                      | 12                      |
| padding       | 12px 13px               | 12px 13px               |
| border-radius | 11                      | 11                      |
| background    | var(--surface-1)        | var(--surface-1)        |
| border        | 1px solid var(--border) | 1px solid var(--border) |

### Icon tile

| Property        | Mobile                                                | Desktop                 |
| --------------- | ----------------------------------------------------- | ----------------------- |
| width           | 34                                                    | 34                      |
| height          | 34                                                    | 34                      |
| border-radius   | 9                                                     | 9                       |
| flex-shrink     | 0                                                     | 0                       |
| background      | var(--surface-2)                                      | var(--surface-2)        |
| border          | 1px solid var(--border)                               | 1px solid var(--border) |
| display         | flex                                                  | flex                    |
| align-items     | center                                                | center                  |
| justify-content | center                                                | center                  |
| color           | var(--fg-muted) (default) / var(--danger) if `danger` | same                    |

Note: no row in ManageBody passes `danger`, so on this surface the icon tile color is always var(--fg-muted).

### Text column

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| flex           | 1      | 1       |
| min-width      | 0      | 0       |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 2      | 2       |

### Label

| Property       | Mobile                                          | Desktop          |
| -------------- | ----------------------------------------------- | ---------------- |
| font-family    | Inter, system-ui                                | Inter, system-ui |
| font-weight    | 700                                             | 700              |
| font-size      | 14                                              | 14               |
| letter-spacing | -0.01em                                         | -0.01em          |
| color          | var(--fg) (default) / var(--danger) if `danger` | same             |

### Sub line

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| font-family    | Inter, system-ui | Inter, system-ui |
| font-weight    | 500              | 500              |
| font-size      | 12               | 12               |
| color          | var(--fg-subtle) | var(--fg-subtle) |
| letter-spacing | -0.005em         | -0.005em         |

### Trailing chevron (non-portal rows only)

| Property        | Mobile           | Desktop          |
| --------------- | ---------------- | ---------------- |
| svg width       | 15               | 15               |
| svg height      | 15               | 15               |
| viewBox         | 0 0 14 14        | 0 0 14 14        |
| flex-shrink     | 0                | 0                |
| color           | var(--fg-subtle) | var(--fg-subtle) |
| path d          | M5 3 L9 7 L5 11  | M5 3 L9 7 L5 11  |
| fill            | none             | none             |
| stroke          | currentColor     | currentColor     |
| stroke-width    | 1.7              | 1.7              |
| stroke-linecap  | round            | round            |
| stroke-linejoin | round            | round            |

---

## Component: PortalChip (portal rows only)

### Chip container

| Property       | Mobile                         | Desktop                        |
| -------------- | ------------------------------ | ------------------------------ |
| display        | inline-flex                    | inline-flex                    |
| align-items    | center                         | center                         |
| gap            | 4                              | 4                              |
| padding        | 3px 7px                        | 3px 7px                        |
| border-radius  | 5                              | 5                              |
| background     | var(--surface-2)               | var(--surface-2)               |
| border         | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| font-family    | 'JetBrains Mono', monospace    | 'JetBrains Mono', monospace    |
| font-weight    | 700                            | 700                            |
| font-size      | 8.5                            | 8.5                            |
| letter-spacing | 0.12em                         | 0.12em                         |
| text-transform | uppercase                      | uppercase                      |
| color          | var(--fg-muted)                | var(--fg-muted)                |
| white-space    | nowrap                         | nowrap                         |
| flex-shrink    | 0                              | 0                              |

Copy: `Stripe` (followed by external-link arrow svg)

### External-link arrow svg

| Property        | Mobile                        | Desktop      |
| --------------- | ----------------------------- | ------------ |
| width           | 9                             | 9            |
| height          | 9                             | 9            |
| viewBox         | 0 0 12 12                     | 0 0 12 12    |
| margin-top      | -1                            | -1           |
| path d          | M4 8 L8 4 M8 4 H4.6 M8 4 V7.4 | same         |
| fill            | none                          | none         |
| stroke          | currentColor                  | currentColor |
| stroke-width    | 1.4                           | 1.4          |
| stroke-linecap  | round                         | round        |
| stroke-linejoin | round                         | round        |

---

## Component: Row icons (`I.*` — all 16×16, viewBox 0 0 16 16, stroke currentColor)

### I.swap (Change plan)

| Property                         | Mobile                                              | Desktop   |
| -------------------------------- | --------------------------------------------------- | --------- |
| width / height                   | 16 / 16                                             | 16 / 16   |
| viewBox                          | 0 0 16 16                                           | 0 0 16 16 |
| path d                           | M3 5 H11 M9 3 L11 5 L9 7 M13 11 H5 M7 9 L5 11 L7 13 | same      |
| fill / stroke                    | none / currentColor                                 | same      |
| stroke-width                     | 1.5                                                 | 1.5       |
| stroke-linecap / stroke-linejoin | round / round                                       | same      |

### I.leave (Cancel subscription)

| Property                         | Mobile                                               | Desktop   |
| -------------------------------- | ---------------------------------------------------- | --------- |
| width / height                   | 16 / 16                                              | 16 / 16   |
| viewBox                          | 0 0 16 16                                            | 0 0 16 16 |
| path d                           | M9 3 H4 V13 H9 M11 5.5 L13.5 8 L11 10.5 M13.5 8 H6.5 | same      |
| fill / stroke                    | none / currentColor                                  | same      |
| stroke-width                     | 1.5                                                  | 1.5       |
| stroke-linecap / stroke-linejoin | round / round                                        | same      |

### I.card (Payment method)

| Property       | Mobile                                                                               | Desktop   |
| -------------- | ------------------------------------------------------------------------------------ | --------- |
| width / height | 16 / 16                                                                              | 16 / 16   |
| viewBox        | 0 0 16 16                                                                            | 0 0 16 16 |
| rect           | x=2 y=4 width=12 height=8.5 rx=1.6, fill none, stroke currentColor, stroke-width 1.5 | same      |
| path d         | M2 6.8 H14, stroke currentColor, stroke-width 1.5                                    | same      |

### I.receipt (Invoices & receipts)

| Property        | Mobile                                                                    | Desktop   |
| --------------- | ------------------------------------------------------------------------- | --------- |
| width / height  | 16 / 16                                                                   | 16 / 16   |
| viewBox         | 0 0 16 16                                                                 | 0 0 16 16 |
| path d          | M4 2.5 V13.5 L6 12.5 L8 13.5 L10 12.5 L12 13.5 V2.5 Z M6 6 H10 M6 8.5 H10 | same      |
| fill / stroke   | none / currentColor                                                       | same      |
| stroke-width    | 1.4                                                                       | 1.4       |
| stroke-linejoin | round                                                                     | round     |
| stroke-linecap  | —                                                                         | —         |

### I.mail (Billing email)

| Property       | Mobile                                                                                            | Desktop   |
| -------------- | ------------------------------------------------------------------------------------------------- | --------- |
| width / height | 16 / 16                                                                                           | 16 / 16   |
| viewBox        | 0 0 16 16                                                                                         | 0 0 16 16 |
| rect           | x=2 y=3.5 width=12 height=9 rx=1.6, fill none, stroke currentColor, stroke-width 1.5              | same      |
| path d         | M2.6 4.5 L8 8.5 L13.4 4.5, fill none, stroke currentColor, stroke-width 1.5, stroke-linecap round | same      |

### I.globe (Tax & region)

| Property       | Mobile                                                                                                   | Desktop   |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| width / height | 16 / 16                                                                                                  | 16 / 16   |
| viewBox        | 0 0 16 16                                                                                                | 0 0 16 16 |
| circle         | cx=8 cy=8 r=5.5, fill none, stroke currentColor, stroke-width 1.5                                        | same      |
| path d         | M2.5 8 H13.5 M8 2.5 C10 5 10 11 8 13.5 C6 11 6 5 8 2.5, fill none, stroke currentColor, stroke-width 1.3 | same      |

---

## Component: Footer trust line

### Container

| Property        | Mobile                      | Desktop                     |
| --------------- | --------------------------- | --------------------------- |
| display         | flex                        | flex                        |
| align-items     | center                      | center                      |
| justify-content | center                      | center                      |
| gap             | 7                           | 7                           |
| font-family     | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size       | 9                           | 9                           |
| color           | var(--fg-subtle)            | var(--fg-subtle)            |
| letter-spacing  | 0.12em                      | 0.12em                      |
| text-transform  | uppercase                   | uppercase                   |

Copy: `Stripe handles cards · we never see them` (preceded by MMark)

### MMark (`size={13}`)

| Property           | Mobile                                                                                                                                   | Desktop   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| svg width / height | 13 / 13                                                                                                                                  | 13 / 13   |
| viewBox            | 0 0 96 96                                                                                                                                | 0 0 96 96 |
| aria-hidden        | true                                                                                                                                     | true      |
| rect               | width=96 height=96 rx=16 fill var(--bg)                                                                                                  | same      |
| circle 1           | cx=72 cy=24 r=20 fill var(--accent) opacity 0.22                                                                                         | same      |
| circle 2           | cx=72 cy=24 r=12 fill var(--accent) opacity 0.42                                                                                         | same      |
| circle 3           | cx=72 cy=24 r=7 fill var(--signal)                                                                                                       | same      |
| trail circles      | 7 circles, fill var(--signal), opacity 0.35 + idx×0.09: (14,76,r1.5) (24,70,r2) (34,64,r2.5) (42,58,r3) (50,50,r4) (58,42,r5) (66,32,r6) | same      |

---

## Hover / interactive states

The design source defines **no hover, focus, active, or transition styles** on any element of ManageSheet. ManageRow is a `<button>` with `all: unset; cursor: pointer` — cursor: pointer is the only interactive affordance specified. No transitions or transforms anywhere in the component. — (explicitly absent in design).

---

## Conditional rendering matrix

| Condition                             | Effect                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant === "desktop"`               | ModalChrome(460) wrapper; body padding 24px 26px 22px; `wide` → title font-size 26; `<TierBadge tier size="lg"/>` rendered right of header text |
| `variant === "mobile"` (default)      | SheetChrome(height "auto") + DragHandle; body padding 4px 16px 22px; title font-size 23; no TierBadge                                           |
| `tier === "premium"` (default)        | tierName `Premium`, priceText `$5/MO`; badge = signal star (desktop)                                                                            |
| `tier === "supporter"`                | tierName `Supporter`, priceText `$2/MO`; badge = accent `+` (desktop)                                                                           |
| `tier === "founder"`                  | tierName `Founder`, priceText `$3/MO`; badge = gradient crown (desktop)                                                                         |
| `portal` prop on ManageRow (rows 3–6) | trailing PortalChip (`Stripe ↗`) instead of chevron                                                                                             |
| `!portal` (rows 1–2)                  | trailing 15×15 chevron svg                                                                                                                      |
| `danger` prop on ManageRow            | icon tile + label color var(--danger) — **never passed on this surface**                                                                        |
| `periodEnd` prop                      | interpolated into subtitle and Cancel row sub (default `Jul 15`)                                                                                |

Row structure is identical across all tiers — only tierName/priceText copy varies.

---

## State Coverage

| State               | Triggering condition (props)         | What renders                                                                                                              | Key copy                                                                                                                                                                           |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile · Premium    | `variant="mobile" tier="premium"`    | Bottom sheet (SheetChrome auto height) + DragHandle; rail; header (fs 23, no badge); 2 in-app rows; 4 Stripe rows; footer | Eyebrow `Manage · Premium` · code `$5/MO`; subtitle `Premium · renews Jul 15. Change it, cancel it, or grab a receipt.`; cancel sub `Keep Premium until Jul 15, then roll to Free` |
| Mobile · Supporter  | `variant="mobile" tier="supporter"`  | Same sheet layout                                                                                                         | `Manage · Supporter` · `$2/MO`; `Supporter · renews Jul 15. …`; `Keep Supporter until Jul 15, then roll to Free`                                                                   |
| Mobile · Founder    | `variant="mobile" tier="founder"`    | Same sheet layout                                                                                                         | `Manage · Founder` · `$3/MO`; `Founder · renews Jul 15. …`; `Keep Founder until Jul 15, then roll to Free`                                                                         |
| Desktop · Premium   | `variant="desktop" tier="premium"`   | Modal (460w) — no DragHandle; header fs 26 + TierBadge lg (signal star, `Premium`)                                        | Same copy as Mobile · Premium                                                                                                                                                      |
| Desktop · Supporter | `variant="desktop" tier="supporter"` | Modal + TierBadge lg (accent `+`, `Supporter`)                                                                            | Same copy as Mobile · Supporter                                                                                                                                                    |
| Desktop · Founder   | `variant="desktop" tier="founder"`   | Modal + TierBadge lg (gradient crown, `Founder`)                                                                          | Same copy as Mobile · Founder                                                                                                                                                      |

Shared verbatim copy across all 6 states:

- Title: `Manage subscription`
- Group 1 eyebrow: `On Concert Crawl`
- Row 1: `Change plan` / `Upgrade, downgrade, or switch tiers`
- Row 2: `Cancel subscription` / `Keep {tierName} until {periodEnd}, then roll to Free`
- Group 2 eyebrows: `Billing & receipts` · `Opens Stripe in a new tab`
- Row 3: `Payment method` / `Update the card on file`
- Row 4: `Invoices & receipts` / `Download past charges`
- Row 5: `Billing email` / `Where receipts get sent`
- Row 6: `Tax & region` / `Country, VAT, tax ID`
- Chip: `Stripe` + ↗ arrow
- Footer: `Stripe handles cards · we never see them`

README context: the two-group split (in-app vs Stripe-portal) is Design decision #1 in the decisions log; all customer-facing strings externalize to `copy.ts` at integration (plan-PR-stage work).
