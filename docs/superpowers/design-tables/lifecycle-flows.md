# Design Property Table — Lifecycle Flows (PR 4.5, #780)

Source of truth: `design/design_handoff_monetization_lifecycle/lifecycle-flows.jsx` (primary), `monetization-shared.jsx` (primitives), `README.md` (decisions #6/#7).

Notes on scope:

- Mobile = `variant="mobile"` → `SheetChrome` bottom sheet with `DragHandle`; Desktop = `variant="desktop"` → `ModalChrome` centered modal.
- **No hover/focus styles are defined anywhere in the design source** for these flows. Hover subsections below record `—` explicitly.
- The only transition in the design is the ChangesDisclosure chevron rotate.
- CTA hierarchy (README decision #7): "Cancel subscription" is the primary danger-toned confirm; "Never mind — keep {tier}" is the ghost back-out. Do NOT invert.
- Retention nudge (README decision #6): price-led, Premium/Founder cancel only; Supporter cancel is the thin flow (no nudge, no 90-day data note).

---

## Shared Primitives (used by all four components)

### FlowSurface — mobile (`SheetChrome height="auto"` + `DragHandle` + inner pad)

| Property                 | Mobile                                 | Desktop |
| ------------------------ | -------------------------------------- | ------- |
| position (SheetChrome)   | absolute; left: 0; right: 0; bottom: 0 | —       |
| height (SheetChrome)     | auto                                   | —       |
| background (SheetChrome) | var(--bg)                              | —       |
| border-top-left-radius   | 24                                     | —       |
| border-top-right-radius  | 24                                     | —       |
| border                   | 1px solid var(--border)                | —       |
| border-bottom            | none                                   | —       |
| box-shadow               | 0 -20px 50px rgba(0,0,0,0.4)           | —       |
| display                  | flex                                   | —       |
| flex-direction           | column                                 | —       |
| overflow                 | hidden                                 | —       |
| color                    | var(--fg)                              | —       |
| inner content padding    | 4px 16px 22px                          | —       |

### FlowSurface — desktop (`ModalChrome`)

| Property              | Mobile | Desktop                                                       |
| --------------------- | ------ | ------------------------------------------------------------- |
| width                 | —      | 460 (CancelFlow) / 440 (DowngradeFlow, UpgradeFlow)           |
| max-height            | —      | min(86vh, 820px) (ModalChrome default; no height prop passed) |
| border-radius         | —      | 18                                                            |
| background            | —      | var(--bg-elevated)                                            |
| border                | —      | 1px solid var(--border-strong)                                |
| box-shadow            | —      | 0 30px 80px rgba(0,0,0,0.5)                                   |
| display               | —      | flex                                                          |
| flex-direction        | —      | column                                                        |
| overflow              | —      | hidden                                                        |
| color                 | —      | var(--fg)                                                     |
| inner content padding | —      | 24px 26px 22px                                                |

### DragHandle (mobile only)

| Property                | Mobile               | Desktop |
| ----------------------- | -------------------- | ------- |
| wrapper display         | flex                 | —       |
| wrapper justify-content | center               | —       |
| wrapper padding         | 8px 0 4px            | —       |
| bar width               | 36                   | —       |
| bar height              | 4                    | —       |
| bar border-radius       | 4                    | —       |
| bar background          | var(--border-strong) | —       |
| bar opacity             | 0.6                  | —       |

### Flow content column (immediate child inside FlowSurface, all three flows)

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| display        | flex             | flex             |
| flex-direction | column           | column           |
| gap            | 16               | 16               |
| font-family    | Inter, system-ui | Inter, system-ui |
| color          | var(--fg)        | var(--fg)        |

### RailHeader (from monetization-shared.jsx)

Tone color `c`: `signal` → var(--signal); `warning` → var(--warning); `muted` → var(--fg-subtle); default/`accent` → var(--accent).

| Property                    | Mobile                     | Desktop          |
| --------------------------- | -------------------------- | ---------------- |
| container display           | flex                       | flex             |
| container align-items       | center                     | center           |
| container gap               | 10                         | 10               |
| container width             | 100%                       | 100%             |
| dot width                   | 6                          | 6                |
| dot height                  | 6                          | 6                |
| dot border-radius           | 6                          | 6                |
| dot background              | c (tone color)             | c                |
| dot flex-shrink             | 0                          | 0                |
| dot box-shadow              | 0 0 8px c                  | 0 0 8px c        |
| eyebrow (MonoEyebrow) color | c                          | c                |
| eyebrow letter-spacing      | 0.16em                     | 0.16em           |
| hairline flex               | 1                          | 1                |
| hairline height             | 1                          | 1                |
| hairline background         | var(--border)              | var(--border)    |
| code (MonoEyebrow) color    | var(--fg-subtle) (default) | var(--fg-subtle) |
| code letter-spacing         | 0.14em                     | 0.14em           |
| code rendered when          | `code` prop !== undefined  | same             |

### MonoEyebrow (defaults; per-use overrides noted at each usage)

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 10 (default)                | 10 (default)                |
| font-weight    | 700 (default)               | 700 (default)               |
| text-transform | uppercase                   | uppercase                   |
| letter-spacing | 0.14em (default)            | 0.14em (default)            |
| color          | var(--fg-subtle) (default)  | var(--fg-subtle) (default)  |

### FlowButton — primary kind

| Property                      | Mobile                                                                | Desktop             |
| ----------------------------- | --------------------------------------------------------------------- | ------------------- |
| all                           | unset                                                                 | unset               |
| cursor                        | pointer                                                               | pointer             |
| text-align                    | center                                                                | center              |
| box-sizing                    | border-box                                                            | border-box          |
| width                         | 100%                                                                  | 100%                |
| padding                       | 13px 16px                                                             | 13px 16px           |
| border-radius                 | 12                                                                    | 12                  |
| background                    | accent prop (var(--danger) / var(--accent) / var(--signal) per usage) | same                |
| color                         | var(--fg-on-accent)                                                   | var(--fg-on-accent) |
| border                        | none                                                                  | none                |
| font-family                   | Inter, system-ui                                                      | Inter, system-ui    |
| font-weight                   | 800                                                                   | 800                 |
| font-size                     | 14.5                                                                  | 14.5                |
| box-shadow (only when `glow`) | 0 0 18px color-mix(in oklch, {accent} 28%, transparent)               | same                |
| box-shadow (no glow)          | none                                                                  | none                |
| display                       | flex                                                                  | flex                |
| flex-direction                | column                                                                | column              |
| align-items                   | center                                                                | center              |
| gap                           | 2                                                                     | 2                   |

#### FlowButton `sub` line (only when `sub` prop passed — UpgradeFlow primary)

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-weight    | 600                         | 600                         |
| font-size      | 9                           | 9                           |
| letter-spacing | 0.1em                       | 0.1em                       |
| text-transform | uppercase                   | uppercase                   |
| opacity        | 0.85                        | 0.85                        |

### FlowButton — ghost kind

| Property          | Mobile                                                                                    | Desktop                        |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| background        | transparent                                                                               | transparent                    |
| color             | var(--fg-muted)                                                                           | var(--fg-muted)                |
| border            | 1px solid var(--border-strong)                                                            | 1px solid var(--border-strong) |
| font-weight       | 700                                                                                       | 700                            |
| font-size         | 14.5                                                                                      | 14.5                           |
| (all other props) | same as primary base (padding 13px 16px, radius 12, width 100%, flex column center gap 2) | same                           |

### FlowButton — danger kind (defined; not used as a rendered kind in these flows — Cancel primary uses kind="primary" with accent=var(--danger))

| Property    | Mobile                                                                 | Desktop       |
| ----------- | ---------------------------------------------------------------------- | ------------- |
| background  | transparent                                                            | transparent   |
| color       | var(--danger)                                                          | var(--danger) |
| border      | 1px solid color-mix(in oklch, var(--danger) 45%, var(--border-strong)) | same          |
| font-weight | 700                                                                    | 700           |

#### FlowButton hover/focus states

| Property     | Mobile                     | Desktop |
| ------------ | -------------------------- | ------- |
| hover styles | — (none defined in design) | —       |

### FinePrint

| Property       | Mobile                      | Desktop                     |
| -------------- | --------------------------- | --------------------------- |
| text-align     | center                      | center                      |
| font-family    | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |
| font-size      | 9                           | 9                           |
| color          | var(--fg-subtle)            | var(--fg-subtle)            |
| letter-spacing | 0.12em                      | 0.12em                      |
| text-transform | uppercase                   | uppercase                   |

### InfoCard

Tone color `c`: `signal` → var(--signal); `accent` → var(--accent); `neutral` → var(--border-strong).

| Property                   | Mobile                                                | Desktop          |
| -------------------------- | ----------------------------------------------------- | ---------------- |
| padding                    | 13px 14px                                             | 13px 14px        |
| border-radius              | 12                                                    | 12               |
| background (neutral)       | var(--surface-1)                                      | var(--surface-1) |
| background (signal/accent) | color-mix(in oklch, {c} 7%, var(--surface-1))         | same             |
| border (neutral)           | 1px solid var(--border)                               | same             |
| border (signal/accent)     | 1px solid color-mix(in oklch, {c} 30%, var(--border)) | same             |
| display                    | flex                                                  | flex             |
| flex-direction             | column                                                | column           |
| gap                        | 10                                                    | 10               |

### MathRow

| Property             | Mobile                               | Desktop          |
| -------------------- | ------------------------------------ | ---------------- |
| row display          | flex                                 | flex             |
| row align-items      | baseline                             | baseline         |
| row justify-content  | space-between                        | space-between    |
| row gap              | 12                                   | 12               |
| label font-family    | Inter, system-ui                     | Inter, system-ui |
| label font-weight    | 700 (strong) / 500                   | same             |
| label font-size      | 13                                   | 13               |
| label color          | var(--fg) (strong) / var(--fg-muted) | same             |
| label letter-spacing | -0.005em                             | -0.005em         |
| value font-family    | Inter, system-ui                     | Inter, system-ui |
| value font-weight    | 900 (strong) / 700                   | same             |
| value font-size      | 16 (strong) / 13.5                   | same             |
| value letter-spacing | -0.02em                              | -0.02em          |
| value color          | var(--fg)                            | var(--fg)        |

### TierBadge tier="supporter" size="sm" (rendered inside CancelFlow retention nudge)

| Property       | Mobile                                                                 | Desktop                     |
| -------------- | ---------------------------------------------------------------------- | --------------------------- |
| display        | inline-flex                                                            | inline-flex                 |
| align-items    | center                                                                 | center                      |
| gap            | 5                                                                      | 5                           |
| padding        | 3px 7px                                                                | 3px 7px                     |
| border-radius  | 4                                                                      | 4                           |
| background     | color-mix(in oklch, var(--accent) 14%, transparent)                    | same                        |
| border         | 1px solid color-mix(in oklch, var(--accent) 36%, transparent)          | same                        |
| color          | var(--accent)                                                          | var(--accent)               |
| font-family    | 'JetBrains Mono', monospace                                            | 'JetBrains Mono', monospace |
| font-weight    | 800                                                                    | 800                         |
| font-size      | 9                                                                      | 9                           |
| letter-spacing | 0.12em                                                                 | 0.12em                      |
| text-transform | uppercase                                                              | uppercase                   |
| white-space    | nowrap                                                                 | nowrap                      |
| line-height    | 1                                                                      | 1                           |
| glyph          | `<span>` "+", font-family 'JetBrains Mono', monospace, font-weight 800 | same                        |
| label text     | "Supporter"                                                            | "Supporter"                 |

---

## Component: CancelFlow

Props: `variant = "mobile"`, `tier = "premium"`, `periodEnd = "Jul 15"`. `isPremiumUp = tier === "premium" || tier === "founder"`. `tierName` = "Founder" | "Supporter" | "Premium". Desktop FlowSurface width = **460**.

### RailHeader (top)

| Property     | Mobile                                                                                    | Desktop |
| ------------ | ----------------------------------------------------------------------------------------- | ------- |
| tone         | muted (c = var(--fg-subtle))                                                              | muted   |
| eyebrow copy | `Cancel · {tierName}` (e.g. "Cancel · Premium", "Cancel · Founder", "Cancel · Supporter") | same    |
| code copy    | `periodEnd.toUpperCase()` (e.g. "JUL 15")                                                 | same    |

### Headline block (wrapper)

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 7      | 7       |

### Headline

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| copy           | "Stepping back?" | "Stepping back?" |
| font-weight    | 900              | 900              |
| font-size      | 24               | 28               |
| letter-spacing | -0.03em          | -0.03em          |
| line-height    | 1.05             | 1.05             |

### Subhead

| Property       | Mobile                                                      | Desktop         |
| -------------- | ----------------------------------------------------------- | --------------- |
| copy           | "No guilt trip. Here's exactly what happens if you cancel." | same            |
| font-weight    | 500                                                         | 500             |
| font-size      | 13.5                                                        | 14.5            |
| color          | var(--fg-muted)                                             | var(--fg-muted) |
| letter-spacing | -0.005em                                                    | -0.005em        |
| line-height    | 1.5                                                         | 1.5             |

### Date-breakdown InfoCard (tone="neutral")

| Property                    | Mobile                                                                                                                                                                                        | Desktop          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| card                        | InfoCard neutral (see primitives: padding 13px 14px, radius 12, bg var(--surface-1), border 1px solid var(--border), flex column gap 10)                                                      | same             |
| MathRow (strong) label      | `You keep {tierName} until`                                                                                                                                                                   | same             |
| MathRow (strong) value      | `{periodEnd}` (e.g. "Jul 15")                                                                                                                                                                 | same             |
| divider height              | 1                                                                                                                                                                                             | 1                |
| divider background          | var(--border)                                                                                                                                                                                 | var(--border)    |
| body font-family            | Inter, system-ui                                                                                                                                                                              | Inter, system-ui |
| body font-weight            | 500                                                                                                                                                                                           | 500              |
| body font-size              | 12.5                                                                                                                                                                                          | 12.5             |
| body color                  | var(--fg-muted)                                                                                                                                                                               | var(--fg-muted)  |
| body line-height            | 1.5                                                                                                                                                                                           | 1.5              |
| body copy (Premium/Founder) | "You won't be charged again. On {periodEnd} you roll to Free — and your history, follows, and alerts stay safe for 90 days in case you come back."                                            | same             |
| body copy (Supporter)       | "You won't be charged again. On {periodEnd} you roll to Free and the Supporter badge comes off. Everything you actually use — saved shows, browsing, prices — was always free and stays put." | same             |

### Retention nudge card (rendered ONLY when tier is premium or founder — README decision #6)

| Property       | Mobile                                                          | Desktop   |
| -------------- | --------------------------------------------------------------- | --------- |
| padding        | 14px 14px                                                       | 14px 14px |
| border-radius  | 12                                                              | 12        |
| background     | color-mix(in oklch, var(--accent) 7%, var(--surface-1))         | same      |
| border         | 1px solid color-mix(in oklch, var(--accent) 32%, var(--border)) | same      |
| display        | flex                                                            | flex      |
| flex-direction | column                                                          | column    |
| gap            | 10                                                              | 10        |

#### Retention nudge header row

| Property                   | Mobile                                      | Desktop       |
| -------------------------- | ------------------------------------------- | ------------- |
| display                    | flex                                        | flex          |
| align-items                | center                                      | center        |
| gap                        | 8                                           | 8             |
| MonoEyebrow copy           | "Before you go"                             | same          |
| MonoEyebrow size           | 9.5                                         | 9.5           |
| MonoEyebrow color          | var(--accent)                               | var(--accent) |
| MonoEyebrow letter-spacing | 0.16em                                      | 0.16em        |
| TierBadge                  | tier="supporter" size="sm" (see primitives) | same          |

#### Retention nudge headline

| Property            | Mobile                             | Desktop |
| ------------------- | ---------------------------------- | ------- |
| copy (tier=premium) | "If it's the $5 — Supporter's $2." | same    |
| copy (tier=founder) | "If it's the $3 — Supporter's $2." | same    |
| font-weight         | 700                                | 700     |
| font-size           | 15                                 | 16.5    |
| letter-spacing      | -0.02em                            | -0.02em |
| line-height         | 1.25                               | 1.25    |

#### Retention nudge body

| Property       | Mobile                                                                                                                                                                  | Desktop         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| copy           | "Supporter keeps you chipping in for less. You'd switch off alerts, follows, and price drops — and your history, follows, and alerts stay safe for 90 days either way." | same            |
| font-weight    | 500                                                                                                                                                                     | 500             |
| font-size      | 12.5                                                                                                                                                                    | 12.5            |
| color          | var(--fg-muted)                                                                                                                                                         | var(--fg-muted) |
| letter-spacing | -0.005em                                                                                                                                                                | -0.005em        |
| line-height    | 1.5                                                                                                                                                                     | 1.5             |

#### "Switch to Supporter instead" button (one-tap route into DowngradeFlow)

| Property        | Mobile                                                                 | Desktop          |
| --------------- | ---------------------------------------------------------------------- | ---------------- |
| copy            | "Switch to Supporter instead" (+ chevron icon)                         | same             |
| all             | unset                                                                  | unset            |
| cursor          | pointer                                                                | pointer          |
| box-sizing      | border-box                                                             | border-box       |
| width           | 100%                                                                   | 100%             |
| text-align      | center                                                                 | center           |
| padding         | 11px 14px                                                              | 11px 14px        |
| border-radius   | 10                                                                     | 10               |
| margin-top      | 2                                                                      | 2                |
| background      | transparent                                                            | transparent      |
| color           | var(--accent)                                                          | var(--accent)    |
| border          | 1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong)) | same             |
| font-family     | Inter, system-ui                                                       | Inter, system-ui |
| font-weight     | 800                                                                    | 800              |
| font-size       | 13.5                                                                   | 13.5             |
| display         | flex                                                                   | flex             |
| align-items     | center                                                                 | center           |
| justify-content | center                                                                 | center           |
| gap             | 8                                                                      | 8                |

#### Chevron SVG in Switch button

| Property        | Mobile                | Desktop      |
| --------------- | --------------------- | ------------ |
| width           | 13                    | 13           |
| height          | 13                    | 13           |
| viewBox         | 0 0 12 12             | 0 0 12 12    |
| path d          | M4.5 2 L8.5 6 L4.5 10 | same         |
| fill            | none                  | none         |
| stroke          | currentColor          | currentColor |
| stroke-width    | 1.7                   | 1.7          |
| stroke-linecap  | round                 | round        |
| stroke-linejoin | round                 | round        |

#### Switch button hover state

| Property     | Mobile                     | Desktop |
| ------------ | -------------------------- | ------- |
| hover styles | — (none defined in design) | —       |

### Button stack

| Property       | Mobile                                                                                                    | Desktop |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| display        | flex                                                                                                      | flex    |
| flex-direction | column                                                                                                    | column  |
| gap            | 9                                                                                                         | 9       |
| Button 1       | FlowButton label="Cancel subscription" kind="primary" accent="var(--danger)" (no glow → box-shadow: none) | same    |
| Button 2       | FlowButton label=`Never mind — keep {tierName}` kind="ghost"                                              | same    |

### FinePrint

| Property | Mobile                                                          | Desktop |
| -------- | --------------------------------------------------------------- | ------- |
| copy     | `No refunds · access continues to {periodEnd} · cancel anytime` | same    |
| styles   | see FinePrint primitive                                         | same    |

### State Coverage — CancelFlow

| State                            | Triggering condition (props)         | What renders                                                                                                                                                                     | Key copy                                                                                                                                                                              |
| -------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Premium cancel, mobile           | `variant="mobile" tier="premium"`    | Sheet: DragHandle → RailHeader(muted) → headline 24px → neutral date card (Premium body, 90-day note) → retention nudge ($5 math) → Cancel primary (danger) + ghost → fine print | "Cancel · Premium" / "Stepping back?" / "If it's the $5 — Supporter's $2." / "Cancel subscription" / "Never mind — keep Premium"                                                      |
| Premium cancel, desktop          | `variant="desktop" tier="premium"`   | Modal width 460, headline 28px, subhead 14.5, nudge headline 16.5; otherwise identical                                                                                           | same                                                                                                                                                                                  |
| Founder cancel, mobile           | `variant="mobile" tier="founder"`    | Full flow with retention nudge; nudge headline uses $3                                                                                                                           | "Cancel · Founder" / "If it's the $3 — Supporter's $2." / "You keep Founder until" / "Never mind — keep Founder"                                                                      |
| Founder cancel, desktop          | `variant="desktop" tier="founder"`   | Same, desktop metrics                                                                                                                                                            | same                                                                                                                                                                                  |
| Supporter cancel (thin), mobile  | `variant="mobile" tier="supporter"`  | NO retention nudge; date card uses Supporter body (no 90-day note, badge-comes-off framing); confirm + ghost + fine print                                                        | "Cancel · Supporter" / "…the Supporter badge comes off. Everything you actually use — saved shows, browsing, prices — was always free and stays put." / "Never mind — keep Supporter" |
| Supporter cancel (thin), desktop | `variant="desktop" tier="supporter"` | Same, desktop metrics                                                                                                                                                            | same                                                                                                                                                                                  |

---

## Component: DowngradeFlow (Premium → Supporter)

Props: `variant = "mobile"`, `credit = "2.50"`. Desktop FlowSurface width = **440**. No tier variants — single Premium→Supporter shape.

### RailHeader

| Property     | Mobile                         | Desktop |
| ------------ | ------------------------------ | ------- |
| tone         | accent (c = var(--accent))     | accent  |
| eyebrow copy | "Switch · Premium → Supporter" | same    |
| code copy    | "$2/MO"                        | same    |

### Headline row wrapper

| Property        | Mobile                      | Desktop       |
| --------------- | --------------------------- | ------------- |
| display         | flex                        | flex          |
| align-items     | flex-start                  | flex-start    |
| justify-content | space-between               | space-between |
| gap             | 12                          | 12            |
| inner column    | flex column, gap 7, flex: 1 | same          |

### Headline

| Property       | Mobile                   | Desktop |
| -------------- | ------------------------ | ------- |
| copy           | "Switching to Supporter" | same    |
| font-weight    | 900                      | 900     |
| font-size      | 24                       | 28      |
| letter-spacing | -0.03em                  | -0.03em |
| line-height    | 1.05                     | 1.05    |

### Subhead

| Property       | Mobile                                                           | Desktop         |
| -------------- | ---------------------------------------------------------------- | --------------- |
| copy           | "Lighter plan, same gratitude. Here's the money and what moves." | same            |
| font-weight    | 500                                                              | 500             |
| font-size      | 13.5                                                             | 14.5            |
| color          | var(--fg-muted)                                                  | var(--fg-muted) |
| letter-spacing | -0.005em                                                         | -0.005em        |
| line-height    | 1.5                                                              | 1.5             |

### Proration InfoCard (tone="accent")

| Property                       | Mobile                                                                                                                                                            | Desktop       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| card background                | color-mix(in oklch, var(--accent) 7%, var(--surface-1))                                                                                                           | same          |
| card border                    | 1px solid color-mix(in oklch, var(--accent) 30%, var(--border))                                                                                                   | same          |
| card padding / radius / layout | 13px 14px / 12 / flex column gap 10                                                                                                                               | same          |
| MonoEyebrow copy               | "The math"                                                                                                                                                        | same          |
| MonoEyebrow size               | 9.5                                                                                                                                                               | 9.5           |
| MonoEyebrow color              | var(--accent)                                                                                                                                                     | var(--accent) |
| MonoEyebrow letter-spacing     | 0.16em                                                                                                                                                            | 0.16em        |
| body copy                      | "Supporter's active the moment you confirm. The **${credit}** from your unused Premium days lands as account credit on your next bill." (`${credit}`in`<strong>`) | same          |
| body font-weight               | 600                                                                                                                                                               | 600           |
| body font-size                 | 13.5                                                                                                                                                              | 13.5          |
| body line-height               | 1.5                                                                                                                                                               | 1.5           |
| body color                     | var(--fg)                                                                                                                                                         | var(--fg)     |
| divider height                 | 1                                                                                                                                                                 | 1             |
| divider background             | color-mix(in oklch, var(--accent) 22%, var(--border))                                                                                                             | same          |
| MathRow 1                      | label "Supporter, from today", value "$2.00/mo" (not strong)                                                                                                      | same          |
| MathRow 2                      | label "Credit toward next bill", value `+$${credit}` (e.g. "+$2.50"), strong                                                                                      | same          |

### ChangesDisclosure

See dedicated Component section below — rendered between proration card and button stack.

### Button stack

| Property                       | Mobile                                                                                                                                                                                | Desktop |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| display / flex-direction / gap | flex / column / 9                                                                                                                                                                     | same    |
| Button 1                       | FlowButton label="Switch to Supporter" kind="primary" accent="var(--accent)" glow → background var(--accent), box-shadow 0 0 18px color-mix(in oklch, var(--accent) 28%, transparent) | same    |
| Button 2                       | FlowButton label="Never mind" kind="ghost"                                                                                                                                            | same    |

### FinePrint

| Property | Mobile                                                       | Desktop |
| -------- | ------------------------------------------------------------ | ------- |
| copy     | "Effective immediately · credit via Stripe · cancel anytime" | same    |

### State Coverage — DowngradeFlow

| State                | Triggering condition (props)               | What renders                                                                                                                                                                | Key copy                                                                                                                              |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Downgrade, mobile    | `variant="mobile"` (credit default "2.50") | Sheet: RailHeader(accent, "$2/MO") → headline 24px → accent proration card ($2.00/mo + +$credit) → ChangesDisclosure (collapsed) → accent glow primary + ghost → fine print | "Switching to Supporter" / "Supporter, from today $2.00/mo" / "Credit toward next bill +$2.50" / "Switch to Supporter" / "Never mind" |
| Downgrade, desktop   | `variant="desktop"`                        | Modal width 440, headline 28px, subhead 14.5; otherwise identical                                                                                                           | same                                                                                                                                  |
| Disclosure collapsed | ChangesDisclosure `open=false` (default)   | One-liner row with info icon + chevron down                                                                                                                                 | "Your history, follows, and alerts stay safe for 90 days."                                                                            |
| Disclosure expanded  | ChangesDisclosure `open=true` (tap header) | Divider + "Stays on" list (2 items, accent checks) + "Switches off · safe 90 days" list (6 items, subtle ×) + italic restore note; chevron rotated 180°                     | see ChangesDisclosure copy below                                                                                                      |

---

## Component: UpgradeFlow (Supporter → Premium)

Props: `variant = "mobile"`, `prorated = "3.25"`. Desktop FlowSurface width = **440**.

### RailHeader

| Property     | Mobile                          | Desktop |
| ------------ | ------------------------------- | ------- |
| tone         | signal (c = var(--signal))      | signal  |
| eyebrow copy | "Upgrade · Supporter → Premium" | same    |
| code copy    | "$5/MO"                         | same    |

### Headline block wrapper

| Property                       | Mobile            | Desktop |
| ------------------------------ | ----------------- | ------- |
| display / flex-direction / gap | flex / column / 7 | same    |

### Headline

| Property       | Mobile          | Desktop |
| -------------- | --------------- | ------- |
| copy           | "Going Premium" | same    |
| font-weight    | 900             | 900     |
| font-size      | 24              | 28      |
| letter-spacing | -0.03em         | -0.03em |
| line-height    | 1.05            | 1.05    |

### Subhead

| Property       | Mobile                                                                       | Desktop         |
| -------------- | ---------------------------------------------------------------------------- | --------------- |
| copy           | "The stuff that costs us money to run — switched on the second you confirm." | same            |
| font-weight    | 500                                                                          | 500             |
| font-size      | 13.5                                                                         | 14.5            |
| color          | var(--fg-muted)                                                              | var(--fg-muted) |
| letter-spacing | -0.005em                                                                     | -0.005em        |
| line-height    | 1.5                                                                          | 1.5             |

### Proration InfoCard (tone="signal")

| Property                       | Mobile                                                                                                                                       | Desktop       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| card background                | color-mix(in oklch, var(--signal) 7%, var(--surface-1))                                                                                      | same          |
| card border                    | 1px solid color-mix(in oklch, var(--signal) 30%, var(--border))                                                                              | same          |
| card padding / radius / layout | 13px 14px / 12 / flex column gap 10                                                                                                          | same          |
| MonoEyebrow copy               | "The math"                                                                                                                                   | same          |
| MonoEyebrow size               | 9.5                                                                                                                                          | 9.5           |
| MonoEyebrow color              | var(--signal)                                                                                                                                | var(--signal) |
| MonoEyebrow letter-spacing     | 0.16em                                                                                                                                       | 0.16em        |
| body copy                      | "Premium unlocks now. **${prorated}** covers the rest of this billing cycle; after that it's the usual $5/mo." (`${prorated}` in `<strong>`) | same          |
| body font-weight               | 600                                                                                                                                          | 600           |
| body font-size                 | 13.5                                                                                                                                         | 13.5          |
| body line-height               | 1.5                                                                                                                                          | 1.5           |
| body color                     | var(--fg)                                                                                                                                    | var(--fg)     |
| divider height                 | 1                                                                                                                                            | 1             |
| divider background             | color-mix(in oklch, var(--signal) 22%, var(--border))                                                                                        | same          |
| MathRow 1                      | label "Charged today (prorated)", value `$${prorated}` (e.g. "$3.25"), strong                                                                | same          |
| MathRow 2                      | label "Then monthly", value "$5.00/mo" (not strong)                                                                                          | same          |

### "Unlocks right away" section

| Property                   | Mobile                                                                   | Desktop |
| -------------------------- | ------------------------------------------------------------------------ | ------- |
| wrapper display            | flex                                                                     | flex    |
| wrapper flex-direction     | column                                                                   | column  |
| wrapper gap                | 8                                                                        | 8       |
| wrapper padding            | 0 2px                                                                    | 0 2px   |
| MonoEyebrow copy           | "Unlocks right away"                                                     | same    |
| MonoEyebrow size           | 9.5                                                                      | 9.5     |
| MonoEyebrow letter-spacing | 0.16em                                                                   | 0.16em  |
| MonoEyebrow color          | var(--fg-subtle) (default — no color prop)                               | same    |
| grid display               | grid                                                                     | grid    |
| grid-template-columns      | 1fr 1fr                                                                  | 1fr 1fr |
| grid gap                   | 8                                                                        | 8       |
| items (4, in order)        | "Follow artists", "New-show alerts", "Price-drop alerts", "Spotify sync" | same    |

#### Unlock item row

| Property    | Mobile           | Desktop          |
| ----------- | ---------------- | ---------------- |
| display     | flex             | flex             |
| align-items | center           | center           |
| gap         | 8                | 8                |
| font-family | Inter, system-ui | Inter, system-ui |
| font-weight | 500              | 500              |
| font-size   | 12.5             | 12.5             |
| color       | var(--fg)        | var(--fg)        |

#### Unlock check SVG

| Property        | Mobile          | Desktop       |
| --------------- | --------------- | ------------- |
| width           | 12              | 12            |
| height          | 12              | 12            |
| viewBox         | 0 0 12 12       | 0 0 12 12     |
| flex-shrink     | 0               | 0             |
| path d          | M2 6 L5 9 L10 3 | same          |
| fill            | none            | none          |
| stroke          | var(--signal)   | var(--signal) |
| stroke-width    | 1.9             | 1.9           |
| stroke-linecap  | round           | round         |
| stroke-linejoin | round           | round         |

### Button stack

| Property                       | Mobile                                                                                                                                                                                                                                                                                               | Desktop |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| display / flex-direction / gap | flex / column / 9                                                                                                                                                                                                                                                                                    | same    |
| Button 1                       | FlowButton label="Unlock Premium" sub=`$${prorated} today, then $5/mo` kind="primary" accent="var(--signal)" glow → background var(--signal), box-shadow 0 0 18px color-mix(in oklch, var(--signal) 28%, transparent); sub line per FlowButton sub primitive (mono 9px 0.1em uppercase opacity 0.85) | same    |
| Button 2                       | FlowButton label="Not yet" kind="ghost"                                                                                                                                                                                                                                                              | same    |

### FinePrint

| Property | Mobile                                                         | Desktop |
| -------- | -------------------------------------------------------------- | ------- |
| copy     | "Effective immediately · prorated via Stripe · cancel anytime" | same    |

### State Coverage — UpgradeFlow

| State            | Triggering condition (props)                 | What renders                                                                                                                                           | Key copy                                                                                                                                |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Upgrade, mobile  | `variant="mobile"` (prorated default "3.25") | Sheet: RailHeader(signal, "$5/MO") → headline 24px → signal proration card → 2×2 unlocks grid → signal glow primary with mono sub + ghost → fine print | "Going Premium" / "Charged today (prorated) $3.25" / "Then monthly $5.00/mo" / "Unlock Premium" / "$3.25 today, then $5/mo" / "Not yet" |
| Upgrade, desktop | `variant="desktop"`                          | Modal width 440, headline 28px, subhead 14.5; otherwise identical                                                                                      | same                                                                                                                                    |

---

## Component: ChangesDisclosure

Stateless props; internal `open` state (default `false`). Rendered by DowngradeFlow between the proration card and button stack. Identical mobile/desktop (no `variant` prop).

Data (hard-coded per #781 §6 matrix + R6 amendment):

- `stays` (4): "Watching (Free, never purged)", "Concert history: every show you've logged", "Calendar export: Apple + Google", "Supporter badge on your profile"
- `off` (4): "Following artists", "New-show alerts", "Price-drop alerts", "Spotify sync"

> Amended 2026-07-29: concert history and calendar export became Supporter unlocks, so they moved from `off` to `stays`. The R6 amendment moved Watching to Free for signed-in users. This block reflects the shipped `CHANGES_DISCLOSURE_COPY`.

### Container

| Property      | Mobile                  | Desktop                 |
| ------------- | ----------------------- | ----------------------- |
| border-radius | 12                      | 12                      |
| border        | 1px solid var(--border) | 1px solid var(--border) |
| background    | var(--surface-1)        | var(--surface-1)        |
| overflow      | hidden                  | hidden                  |

### Header button (toggle)

| Property    | Mobile     | Desktop    |
| ----------- | ---------- | ---------- |
| all         | unset      | unset      |
| cursor      | pointer    | pointer    |
| box-sizing  | border-box | border-box |
| width       | 100%       | 100%       |
| display     | flex       | flex       |
| align-items | center     | center     |
| gap         | 10         | 10         |
| padding     | 12px 14px  | 12px 14px  |

#### Info icon SVG

| Property            | Mobile                                                              | Desktop         |
| ------------------- | ------------------------------------------------------------------- | --------------- |
| width               | 15                                                                  | 15              |
| height              | 15                                                                  | 15              |
| viewBox             | 0 0 16 16                                                           | 0 0 16 16       |
| flex-shrink         | 0                                                                   | 0               |
| color               | var(--fg-muted)                                                     | var(--fg-muted) |
| circle              | cx 8, cy 8, r 6.4, fill none, stroke currentColor, stroke-width 1.4 | same            |
| path d              | M8 5.2 V8.4 M8 10.6 H8.01                                           | same            |
| path stroke         | currentColor                                                        | currentColor    |
| path stroke-width   | 1.6                                                                 | 1.6             |
| path stroke-linecap | round                                                               | round           |

#### One-liner label

| Property       | Mobile                                                     | Desktop          |
| -------------- | ---------------------------------------------------------- | ---------------- |
| copy           | "Your history, follows, and alerts stay safe for 90 days." | same             |
| flex           | 1                                                          | 1                |
| min-width      | 0                                                          | 0                |
| font-family    | Inter, system-ui                                           | Inter, system-ui |
| font-weight    | 600                                                        | 600              |
| font-size      | 13                                                         | 13               |
| color          | var(--fg)                                                  | var(--fg)        |
| letter-spacing | -0.005em                                                   | -0.005em         |

#### Chevron SVG (toggle indicator)

| Property           | Mobile           | Desktop          |
| ------------------ | ---------------- | ---------------- |
| width              | 14               | 14               |
| height             | 14               | 14               |
| viewBox            | 0 0 14 14        | 0 0 14 14        |
| flex-shrink        | 0                | 0                |
| color              | var(--fg-subtle) | var(--fg-subtle) |
| transform (closed) | none             | none             |
| transform (open)   | rotate(180deg)   | rotate(180deg)   |
| transition         | transform .18s   | transform .18s   |
| path d             | M3 5 L7 9 L11 5  | same             |
| fill               | none             | none             |
| stroke             | currentColor     | currentColor     |
| stroke-width       | 1.7              | 1.7              |
| stroke-linecap     | round            | round            |
| stroke-linejoin    | round            | round            |

#### Header button hover state

| Property     | Mobile                     | Desktop |
| ------------ | -------------------------- | ------- |
| hover styles | — (none defined in design) | —       |

### Expanded panel (rendered only when `open === true`)

| Property       | Mobile                             | Desktop       |
| -------------- | ---------------------------------- | ------------- |
| padding        | 2px 14px 14px                      | 2px 14px 14px |
| display        | flex                               | flex          |
| flex-direction | column                             | column        |
| gap            | 13                                 | 13            |
| top divider    | height 1, background var(--border) | same          |

#### "Stays on" group

| Property                   | Mobile                                                                                                                                                                          | Desktop       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| wrapper                    | flex column, gap 7                                                                                                                                                              | same          |
| MonoEyebrow copy           | "Stays on"                                                                                                                                                                      | same          |
| MonoEyebrow size           | 9                                                                                                                                                                               | 9             |
| MonoEyebrow color          | var(--accent)                                                                                                                                                                   | var(--accent) |
| MonoEyebrow letter-spacing | 0.16em                                                                                                                                                                          | 0.16em        |
| item row                   | flex, align-items flex-start, gap 8                                                                                                                                             | same          |
| item font                  | Inter, system-ui, weight 500, size 12.5                                                                                                                                         | same          |
| item color                 | var(--fg)                                                                                                                                                                       | var(--fg)     |
| check SVG                  | width 12, height 12, viewBox 0 0 12 12, flex-shrink 0, margin-top 3; path d "M2 6 L5 9 L10 3", fill none, stroke var(--accent), stroke-width 1.8, linecap round, linejoin round | same          |
| items                      | "Watching (Free, never purged)"; "Concert history: every show you've logged"; "Calendar export: Apple + Google"; "Supporter badge on your profile"                              | same          |

#### "Switches off" group

| Property                   | Mobile                                                                                                                                                                 | Desktop          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| wrapper                    | flex column, gap 7                                                                                                                                                     | same             |
| MonoEyebrow copy           | "Switches off · safe 90 days"                                                                                                                                          | same             |
| MonoEyebrow size           | 9                                                                                                                                                                      | 9                |
| MonoEyebrow color          | var(--fg-subtle)                                                                                                                                                       | var(--fg-subtle) |
| MonoEyebrow letter-spacing | 0.16em                                                                                                                                                                 | 0.16em           |
| item row                   | flex, align-items flex-start, gap 8                                                                                                                                    | same             |
| item font                  | Inter, system-ui, weight 500, size 12.5                                                                                                                                | same             |
| item color                 | var(--fg-muted)                                                                                                                                                        | var(--fg-muted)  |
| × SVG                      | width 12, height 12, viewBox 0 0 12 12, flex-shrink 0, margin-top 3; path d "M3 3 L9 9 M9 3 L3 9", fill none, stroke var(--fg-subtle), stroke-width 1.6, linecap round | same             |
| items                      | "Following artists"; "New-show alerts"; "Price-drop alerts"; "Spotify sync"                                                                                            | same             |

#### Restore note

| Property    | Mobile                                                                                                | Desktop          |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| copy        | "Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared." | same             |
| font-family | Inter, system-ui                                                                                      | Inter, system-ui |
| font-weight | 500                                                                                                   | 500              |
| font-size   | 11.5                                                                                                  | 11.5             |
| color       | var(--fg-subtle)                                                                                      | var(--fg-subtle) |
| line-height | 1.5                                                                                                   | 1.5              |
| font-style  | italic                                                                                                | italic           |

### State Coverage — ChangesDisclosure

| State               | Triggering condition (props) | What renders                                                                                                                                      | Key copy                                                                                                                                           |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapsed (default) | internal `open = false`      | Container with header row only: info icon + one-liner + down chevron                                                                              | "Your history, follows, and alerts stay safe for 90 days."                                                                                         |
| Expanded            | tap header → `open = true`   | Header (chevron rotated 180°, .18s transform transition) + divider + Stays on (2 accent checks) + Switches off (6 subtle ×) + italic restore note | "Stays on" / "Switches off · safe 90 days" / "Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared." |

---

## Verbatim copy inventory (consolidated, for copy.ts externalization)

CancelFlow:

- Eyebrow: `Cancel · {Premium|Founder|Supporter}` · code: `{PERIODEND uppercased}`
- "Stepping back?"
- "No guilt trip. Here's exactly what happens if you cancel."
- "You keep {tierName} until" → `{periodEnd}`
- Premium/Founder body: "You won't be charged again. On {periodEnd} you roll to Free — and your history, follows, and alerts stay safe for 90 days in case you come back."
- Supporter body: "You won't be charged again. On {periodEnd} you roll to Free and the Supporter badge comes off. Everything you actually use — saved shows, browsing, prices — was always free and stays put."
- "Before you go"
- "If it's the $5 — Supporter's $2." (premium) / "If it's the $3 — Supporter's $2." (founder)
- "Supporter keeps you chipping in for less. You'd switch off alerts, follows, and price drops — and your history, follows, and alerts stay safe for 90 days either way."
- "Switch to Supporter instead"
- "Cancel subscription" / "Never mind — keep {tierName}"
- "No refunds · access continues to {periodEnd} · cancel anytime"

DowngradeFlow:

- Eyebrow: "Switch · Premium → Supporter" · code: "$2/MO"
- "Switching to Supporter"
- "Lighter plan, same gratitude. Here's the money and what moves."
- "The math"
- "Supporter's active the moment you confirm. The ${credit} from your unused Premium days lands as account credit on your next bill."
- "Supporter, from today" → "$2.00/mo" · "Credit toward next bill" → "+${credit}"
- "Switch to Supporter" / "Never mind"
- "Effective immediately · credit via Stripe · cancel anytime"

UpgradeFlow:

- Eyebrow: "Upgrade · Supporter → Premium" · code: "$5/MO"
- "Going Premium"
- "The stuff that costs us money to run — switched on the second you confirm."
- "The math"
- "Premium unlocks now. ${prorated} covers the rest of this billing cycle; after that it's the usual $5/mo."
- "Charged today (prorated)" → "${prorated}" · "Then monthly" → "$5.00/mo"
- "Unlocks right away" → "Follow artists" / "New-show alerts" / "Price-drop alerts" / "Spotify sync"
- "Unlock Premium" (sub: "${prorated} today, then $5/mo") / "Not yet"
- "Effective immediately · prorated via Stripe · cancel anytime"

ChangesDisclosure:

- "Your follows and alerts stay safe for 90 days."
- "Stays on" → "Watching (Free, never purged)" / "Concert history: every show you've logged" / "Calendar export: Apple + Google" / "Supporter badge on your profile"
- "Switches off · safe 90 days" → "Following artists" / "New-show alerts" / "Price-drop alerts" / "Spotify sync"
- "Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared."
