# Design Property Table — Failure Surfaces (PR 4.4)

Sources: `design/design_handoff_monetization_failure_a11y_microcopy/{failure-surfaces.jsx, monetization-shared.jsx, a11y.jsx, microcopy.jsx, README.md, READINESS.md}` (READINESS verdict: 🟢 Green, R2).

**Shared components composed by failure surfaces** (from `monetization-shared.jsx` unless noted): `MMark`, `MonoEyebrow`, `RailHeader`, `DragHandle`, `SheetChrome`, `ModalChrome`, `TIERS`. From `monetization-payment.jsx` (locked, prior PR — reused, not redefined): `TierSummaryRail`, `TotalsBlock`, `StripeElementsSlot`.

**Locked decisions (README/READINESS):**

- `--danger` carries the failure _message_ only; the forward-action button stays `--signal` — never a verb on a red button.
- `fraud_block`: never the word "fraud" in copy; NO retry-on-same-card affordance.
- `network_timeout`: keeps the entered card (no fresh Stripe slot); ships a `polite` live-region note.
- Focus MUST move to the primary action on mount in production (design canvas hardwires `autoFocusPrimary={false}` only to avoid stealing reviewer focus).
- Escape dismisses to the picker. Token-only colors across all 9 themes. Copy externalizes to `definitions/copy.ts`.
- No "subject to change" disclaimer anywhere.
- Retry shape (hybrid): active payment flow → reset PaymentSurface in place (Stripe Elements re-renders); past-due context → Stripe portal (`Update card`).
- SCA notice is server-set (`scaRegion` prop, #775 owns detection) — shipped in PR 4.1.

---

## Component: FailureSurface (top-level)

Props: `category` (default `"insufficient_funds"`), `variant` (default `"mobile"`), `tierKey` (default `"premium"`), `trial` (default `false`). Unknown category falls back to `insufficient_funds`. `trialEligible = trial && tier.key === "premium"`.

### Dialog wrapper

| Property         | Mobile                                      | Desktop                   |
| ---------------- | ------------------------------------------- | ------------------------- |
| role             | `alertdialog`                               | `alertdialog`             |
| aria-modal       | `"true"`                                    | `"true"`                  |
| aria-labelledby  | `fail-h-{category}-{variant}` (headline id) | same                      |
| aria-describedby | `fail-d-{category}-{variant}` (body id)     | same                      |
| display          | flex                                        | flex                      |
| flex-direction   | column                                      | column                    |
| height           | 100%                                        | —                         |
| max-height       | —                                           | inherit                   |
| Container chrome | `SheetChrome height="86%"`                  | `ModalChrome width={520}` |
| DragHandle       | rendered (first child)                      | not rendered              |

### Scroll region (wraps FailureBody)

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| flex     | 1      | 1       |
| overflow | auto   | auto    |

Child order — Mobile: DragHandle → FailureHeader → scroll region (FailureBody) → FailureActions. Desktop: same minus DragHandle.

---

## Component: SheetChrome (shared, mobile container)

| Property                 | Mobile                                          | Desktop |
| ------------------------ | ----------------------------------------------- | ------- |
| position                 | absolute                                        | n/a     |
| left / right / bottom    | 0 / 0 / 0                                       | n/a     |
| height                   | `86%` (FailureSurface) / `80%` (ChallengeMount) | n/a     |
| background               | var(--bg)                                       | n/a     |
| border-top-left-radius   | 24                                              | n/a     |
| border-top-right-radius  | 24                                              | n/a     |
| border                   | 1px solid var(--border)                         | n/a     |
| border-bottom            | none                                            | n/a     |
| box-shadow               | 0 -20px 50px rgba(0,0,0,0.4)                    | n/a     |
| display / flex-direction | flex / column                                   | n/a     |
| overflow                 | hidden                                          | n/a     |
| color                    | var(--fg)                                       | n/a     |

## Component: ModalChrome (shared, desktop container)

| Property                 | Mobile | Desktop                                     |
| ------------------------ | ------ | ------------------------------------------- |
| width                    | n/a    | 520 (FailureSurface) / 500 (ChallengeMount) |
| max-height               | n/a    | min(86vh, 820px)                            |
| border-radius            | n/a    | 18                                          |
| background               | n/a    | var(--bg-elevated)                          |
| border                   | n/a    | 1px solid var(--border-strong)              |
| box-shadow               | n/a    | 0 30px 80px rgba(0,0,0,0.5)                 |
| display / flex-direction | n/a    | flex / column                               |
| overflow                 | n/a    | hidden                                      |
| color                    | n/a    | var(--fg)                                   |

## Component: DragHandle (shared, mobile only)

### Outer wrapper

| Property        | Mobile    | Desktop |
| --------------- | --------- | ------- |
| display         | flex      | n/a     |
| justify-content | center    | n/a     |
| padding         | 8px 0 4px | n/a     |

### Handle bar

| Property      | Mobile               | Desktop |
| ------------- | -------------------- | ------- |
| width         | 36                   | n/a     |
| height        | 4                    | n/a     |
| border-radius | 4                    | n/a     |
| background    | var(--border-strong) | n/a     |
| opacity       | 0.6                  | n/a     |

---

## Component: FailureHeader

### Outer column

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| display        | flex          | flex          |
| flex-direction | column        | column        |
| gap            | 10            | 10            |
| padding        | 16px 16px 4px | 16px 16px 4px |

### Brand row

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 10     | 10      |

### MMark (logo)

| Property                | Mobile                                                                                                                        | Desktop   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- |
| size (svg width/height) | 22                                                                                                                            | 22        |
| viewBox                 | 0 0 96 96                                                                                                                     | 0 0 96 96 |
| aria-hidden             | true                                                                                                                          | true      |
| bg rect                 | 96×96, fill var(--bg), rx 16                                                                                                  | same      |
| circle 1                | cx 72, cy 24, r 20, fill var(--accent), opacity 0.22                                                                          | same      |
| circle 2                | cx 72, cy 24, r 12, fill var(--accent), opacity 0.42                                                                          | same      |
| circle 3                | cx 72, cy 24, r 7, fill var(--signal)                                                                                         | same      |
| trail circles (7)       | (14,76,r1.5) (24,70,r2) (34,64,r2.5) (42,58,r3) (50,50,r4) (58,42,r5) (66,32,r6), fill var(--signal), opacity `0.35 + i*0.09` | same      |

### Wordmark

| Property       | Mobile                                 | Desktop |
| -------------- | -------------------------------------- | ------- |
| copy           | `concert` + `crawl.`                   | same    |
| font-family    | Inter, system-ui                       | same    |
| font-weight    | 800                                    | 800     |
| font-size      | 14                                     | 14      |
| letter-spacing | -0.02em                                | -0.02em |
| color          | var(--fg); `crawl.` span var(--accent) | same    |

### Spacer

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| flex     | 1      | 1       |

### Close button

| Property      | Mobile                      | Desktop         |
| ------------- | --------------------------- | --------------- |
| aria-label    | `Close and return to plans` | same            |
| all           | unset                       | unset           |
| cursor        | pointer                     | pointer         |
| padding       | 8                           | 8               |
| border-radius | 8                           | 8               |
| color         | var(--fg-muted)             | var(--fg-muted) |
| onClick       | dismiss (returns to picker) | same            |

### Close button — X icon (svg)

| Property       | Mobile                    | Desktop      |
| -------------- | ------------------------- | ------------ |
| width / height | 16 / 16                   | 16 / 16      |
| viewBox        | 0 0 16 16                 | same         |
| aria-hidden    | true                      | true         |
| path d         | `M3 3 L13 13 M13 3 L3 13` | same         |
| stroke         | currentColor              | currentColor |
| stroke-width   | 1.7                       | 1.7          |
| stroke-linecap | round                     | round        |

### RailHeader (shared) — props: `tone="muted"`, `eyebrow="Payment · declined"`, `code={cfg.code}`

| Property                         | Mobile                                                                                                               | Desktop |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| display / align-items / gap      | flex / center / 10                                                                                                   | same    |
| width                            | 100%                                                                                                                 | 100%    |
| tone color (`muted`)             | var(--fg-subtle)                                                                                                     | same    |
| dot: width/height/border-radius  | 6 / 6 / 6                                                                                                            | same    |
| dot: background                  | var(--fg-subtle)                                                                                                     | same    |
| dot: box-shadow                  | `0 0 8px var(--fg-subtle)`                                                                                           | same    |
| dot: flex-shrink                 | 0                                                                                                                    | 0       |
| eyebrow (MonoEyebrow)            | color var(--fg-subtle), letter-spacing 0.16em, font-size 10, font-weight 700, uppercase, 'JetBrains Mono', monospace | same    |
| eyebrow copy                     | `Payment · declined`                                                                                                 | same    |
| hairline: flex/height/background | 1 / 1 / var(--border)                                                                                                | same    |
| code (MonoEyebrow)               | letter-spacing 0.14em, color var(--fg-subtle), size 10, weight 700, uppercase, mono                                  | same    |
| code copy per category           | `01` \| `02` \| `03` \| `04` \| `05`                                                                                 | same    |

---

## Component: FailureBody

### Outer column

| Property                 | Mobile        | Desktop      |
| ------------------------ | ------------- | ------------ |
| display / flex-direction | flex / column | same         |
| gap                      | 13            | 13           |
| padding                  | 8px 16px 4px  | 8px 16px 4px |

Child order: FailureStatus → TierSummaryRail → (StripeElementsSlot **or** card-kept note) → TotalsBlock.

### Composed: TierSummaryRail

| Property   | Mobile                                                             | Desktop |
| ---------- | ------------------------------------------------------------------ | ------- |
| props      | `tier={tier} trial={trialEligible}`                                | same    |
| definition | locked in monetization-payment.jsx (prior PR) — not redefined here | same    |

### Composed: StripeElementsSlot (rendered only when `cfg.freshCard === true`)

| Property   | Mobile                                                                                                                                                                             | Desktop |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| props      | `error={!cfg.freshEmpty}` → error state shown for `insufficient_funds` only (freshEmpty absent); empty re-render for `expired_or_incorrect_card`, `issuer_declined`, `fraud_block` | same    |
| definition | locked in monetization-payment.jsx (prior PR)                                                                                                                                      | same    |

### Card-kept note (rendered only when `cfg.freshCard === false`, i.e. `network_timeout`)

| Property                    | Mobile                  | Desktop   |
| --------------------------- | ----------------------- | --------- |
| display / align-items / gap | flex / center / 9       | same      |
| padding                     | 11px 13px               | 11px 13px |
| border-radius               | 11                      | 11        |
| background                  | var(--surface-1)        | same      |
| border                      | 1px solid var(--border) | same      |

### Card-kept note — card icon (svg)

| Property                 | Mobile                                                                                 | Desktop |
| ------------------------ | -------------------------------------------------------------------------------------- | ------- |
| width / height / viewBox | 14 / 14 / 0 0 16 16                                                                    | same    |
| aria-hidden              | true                                                                                   | true    |
| color / flex-shrink      | var(--fg-muted) / 0                                                                    | same    |
| rect                     | x 2, y 5, width 12, height 8, rx 1.4, fill none, stroke currentColor, stroke-width 1.3 | same    |
| path d                   | `M2 7.5 H14`, stroke currentColor, stroke-width 1.3                                    | same    |

### Card-kept note — text (MonoEyebrow)

| Property                                   | Mobile                                        | Desktop |
| ------------------------------------------ | --------------------------------------------- | ------- |
| copy                                       | `Card on file kept — we'll reuse it on retry` | same    |
| font-size / color / letter-spacing         | 10 / var(--fg-muted) / 0.06em                 | same    |
| font-weight / text-transform / font-family | 700 / uppercase / 'JetBrains Mono', monospace | same    |

### Composed: TotalsBlock

| Property   | Mobile                                        | Desktop |
| ---------- | --------------------------------------------- | ------- |
| props      | `tier={tier} trial={trialEligible}`           | same    |
| definition | locked in monetization-payment.jsx (prior PR) | same    |

---

## Component: FailureStatus (the danger block)

### Container

| Property                 | Mobile                                                            | Desktop        |
| ------------------------ | ----------------------------------------------------------------- | -------------- |
| display / flex-direction | flex / column                                                     | same           |
| gap                      | 11                                                                | 11             |
| padding                  | 15px 15px 16px                                                    | 15px 15px 16px |
| border-radius            | 13                                                                | 13             |
| background               | `color-mix(in oklch, var(--danger) 9%, var(--surface-1))`         | same           |
| border                   | `1px solid color-mix(in oklch, var(--danger) 34%, var(--border))` | same           |

### Eyebrow row

| Property                    | Mobile            | Desktop |
| --------------------------- | ----------------- | ------- |
| display / align-items / gap | flex / center / 9 | same    |

### Eyebrow dot

| Property                       | Mobile                | Desktop |
| ------------------------------ | --------------------- | ------- |
| width / height / border-radius | 6 / 6 / 6             | same    |
| background                     | var(--danger)         | same    |
| box-shadow                     | 0 0 8px var(--danger) | same    |
| flex-shrink                    | 0                     | 0       |

### Eyebrow text (MonoEyebrow)

| Property                                   | Mobile                                                                        | Desktop |
| ------------------------------------------ | ----------------------------------------------------------------------------- | ------- |
| color                                      | var(--danger)                                                                 | same    |
| font-size                                  | 10                                                                            | 10      |
| letter-spacing                             | 0.16em                                                                        | 0.16em  |
| font-weight / text-transform / font-family | 700 / uppercase / 'JetBrains Mono', monospace                                 | same    |
| copy per category                          | `CARD DECLINED` (01,02,03) \| `CARD FLAGGED` (04) \| `CONNECTION HICCUP` (05) | same    |

### Headline

| Property       | Mobile                        | Desktop   |
| -------------- | ----------------------------- | --------- |
| id             | `fail-h-{category}-{variant}` | same      |
| aria-live      | assertive                     | assertive |
| font-family    | Inter, system-ui              | same      |
| font-weight    | 900                           | 900       |
| font-size      | 22                            | 22        |
| letter-spacing | -0.03em                       | -0.03em   |
| line-height    | 1.1                           | 1.1       |
| color          | var(--fg)                     | var(--fg) |
| text-wrap      | balance                       | balance   |

### Body

| Property    | Mobile                        | Desktop |
| ----------- | ----------------------------- | ------- |
| id          | `fail-d-{category}-{variant}` | same    |
| font-family | Inter, system-ui              | same    |
| font-weight | 500                           | 500     |
| font-size   | 13                            | 13      |
| color       | var(--fg-muted)               | same    |
| line-height | 1.5                           | 1.5     |

### Note row (conditional — rendered only when `cfg.note` set: fraud_block, network_timeout)

| Property                    | Mobile                                                                                                          | Desktop |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| aria-live                   | `polite` when `noteTone === "polite"` (network_timeout); undefined otherwise (fraud_block: `noteTone: "muted"`) | same    |
| display / align-items / gap | flex / flex-start / 7                                                                                           | same    |
| padding-top                 | 3                                                                                                               | 3       |
| font-family                 | Inter, system-ui                                                                                                | same    |
| font-weight                 | 600                                                                                                             | 600     |
| font-size                   | 12                                                                                                              | 12      |
| color                       | var(--fg-subtle)                                                                                                | same    |
| line-height                 | 1.45                                                                                                            | 1.45    |

### Note info icon (svg)

| Property                         | Mobile                                                                                 | Desktop |
| -------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| width / height / viewBox         | 13 / 13 / 0 0 14 14                                                                    | same    |
| aria-hidden                      | true                                                                                   | true    |
| flex-shrink / margin-top / color | 0 / 1 / var(--fg-subtle)                                                               | same    |
| circle                           | cx 7, cy 7, r 5.6, fill none, stroke currentColor, stroke-width 1.2                    | same    |
| path d                           | `M7 4.2 v0.2 M7 6.4 v3.4`, stroke currentColor, stroke-width 1.3, stroke-linecap round | same    |

---

## Component: FailureActions

### Container

| Property                 | Mobile        | Desktop       |
| ------------------------ | ------------- | ------------- |
| padding                  | 8px 16px 16px | 8px 16px 16px |
| display / flex-direction | flex / column | same          |
| gap                      | 8             | 8             |

### Primary button (always rendered)

| Property                                               | Mobile                                                   | Desktop       |
| ------------------------------------------------------ | -------------------------------------------------------- | ------------- |
| focus on mount                                         | focus moves here in production                           | same          |
| all / cursor / box-sizing                              | unset / pointer / border-box                             | same          |
| display / align-items / justify-content / gap          | flex / center / center / 9                               | same          |
| width / text-align                                     | 100% / center                                            | same          |
| padding                                                | 14px 16px                                                | 14px 16px     |
| border-radius                                          | 12                                                       | 12            |
| background                                             | var(--signal)                                            | var(--signal) |
| color                                                  | var(--fg-on-accent)                                      | same          |
| font-family / font-weight / font-size / letter-spacing | Inter, system-ui / 800 / 14 / -0.005em                   | same          |
| label per category                                     | `Try again` (01,02,05) \| `Try a different card` (03,04) | same          |

### Primary button — retry icon (svg)

| Property                         | Mobile                                                  | Desktop |
| -------------------------------- | ------------------------------------------------------- | ------- |
| width / height / viewBox         | 14 / 14 / 0 0 16 16                                     | same    |
| aria-hidden                      | true                                                    | true    |
| path d                           | `M13.5 8 a5.5 5.5 0 1 1 -1.6 -3.9 M13.6 2.2 V4.6 H11.2` | same    |
| fill / stroke / stroke-width     | none / currentColor / 1.6                               | same    |
| stroke-linecap / stroke-linejoin | round / round                                           | same    |

### Secondary button (conditional — only when `cfg.secondary` set: insufficient_funds, expired_or_incorrect_card)

| Property                                               | Mobile                                 | Desktop   |
| ------------------------------------------------------ | -------------------------------------- | --------- |
| all / cursor / box-sizing                              | unset / pointer / border-box           | same      |
| width / text-align                                     | 100% / center                          | same      |
| padding                                                | 11px 16px                              | 11px 16px |
| border-radius                                          | 12                                     | 12        |
| border                                                 | 1px solid var(--border-strong)         | same      |
| color                                                  | var(--fg-muted)                        | same      |
| font-family / font-weight / font-size / letter-spacing | Inter, system-ui / 700 / 13 / -0.005em | same      |
| label                                                  | `Use a different card`                 | same      |

### Tertiary link button (always rendered)

| Property                | Mobile                                | Desktop   |
| ----------------------- | ------------------------------------- | --------- |
| all / cursor            | unset / pointer                       | same      |
| align-self              | center                                | center    |
| font-family             | 'JetBrains Mono', monospace           | same      |
| font-size / font-weight | 10 / 700                              | same      |
| letter-spacing          | 0.14em                                | 0.14em    |
| text-transform          | uppercase                             | uppercase |
| color                   | var(--fg-subtle)                      | same      |
| padding                 | 6px 8px                               | 6px 8px   |
| label                   | `Save it for later · email me a link` | same      |

### Hover/focus states

No hover/focus styles are defined in the design source. (Production focus behavior: focus moves to the primary action on mount; Escape dismisses.)

### Transitions/transforms

None on FailureSurface. The only animation in scope is the ChallengeMount spinner (below).

---

## Component: ChallengeMount (3DS / SCA)

Props: `kind` (`"3ds"` | `"sca"`, default `"3ds"`), `variant` (default `"mobile"`), `tierKey` (default `"premium"`). Unknown kind falls back to `3ds`.

### Dialog wrapper

| Property                 | Mobile                     | Desktop                   |
| ------------------------ | -------------------------- | ------------------------- |
| role                     | `dialog` (NOT alertdialog) | `dialog`                  |
| aria-modal               | `"true"`                   | `"true"`                  |
| aria-labelledby          | `chal-h-{kind}-{variant}`  | same                      |
| aria-describedby         | `chal-d-{kind}-{variant}`  | same                      |
| display / flex-direction | flex / column              | same                      |
| height                   | 100%                       | —                         |
| max-height               | —                          | inherit                   |
| Container chrome         | `SheetChrome height="80%"` | `ModalChrome width={500}` |
| DragHandle               | rendered                   | not rendered              |

### Header — outer column

| Property                       | Mobile             | Desktop |
| ------------------------------ | ------------------ | ------- |
| display / flex-direction / gap | flex / column / 10 | same    |
| padding                        | 16px 16px 4px      | same    |

Brand row, MMark (size 22), wordmark, spacer, close button, X icon: identical property-for-property to FailureHeader above, **except** close button aria-label = `Cancel verification and return`.

### RailHeader — props: `tone="signal"`, `eyebrow={cfg.eyebrow}`, `code={cfg.code}`

| Property         | Mobile                                                                          | Desktop |
| ---------------- | ------------------------------------------------------------------------------- | ------- |
| tone color       | var(--signal) (dot bg + eyebrow color + dot box-shadow `0 0 8px var(--signal)`) | same    |
| eyebrow copy     | `SECURE CHECK · 3DS` \| `SECURE CHECK · SCA`                                    | same    |
| code copy        | `3DS` \| `SCA`                                                                  | same    |
| other properties | as RailHeader table above                                                       | same    |

### Headline (in header, below rail)

| Property                  | Mobile                                                                       | Desktop |
| ------------------------- | ---------------------------------------------------------------------------- | ------- |
| id                        | `chal-h-{kind}-{variant}`                                                    | same    |
| font-family / font-weight | Inter, system-ui / 900                                                       | same    |
| font-size                 | 23                                                                           | 23      |
| letter-spacing            | -0.03em                                                                      | -0.03em |
| color                     | var(--fg)                                                                    | same    |
| margin-top                | 2                                                                            | 2       |
| line-height               | 1.1                                                                          | 1.1     |
| text-wrap                 | balance                                                                      | balance |
| copy                      | 3ds: `One quick step from your bank.` \| sca: `Your bank needs a thumbs-up.` | same    |

### Body — outer column

| Property                       | Mobile             | Desktop      |
| ------------------------------ | ------------------ | ------------ |
| display / flex-direction / gap | flex / column / 13 | same         |
| padding                        | 6px 16px 4px       | 6px 16px 4px |

### Body copy

| Property                              | Mobile                                                                                                                                                                                                                                     | Desktop |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| id                                    | `chal-d-{kind}-{variant}`                                                                                                                                                                                                                  | same    |
| font-family / font-weight / font-size | Inter, system-ui / 500 / 13                                                                                                                                                                                                                | same    |
| color / line-height                   | var(--fg-muted) / 1.5                                                                                                                                                                                                                      | same    |
| copy                                  | 3ds: `Your bank wants to confirm it's really you. It happens in their secure window below — we never see any of it.` \| sca: `EU rules mean your bank confirms this one directly. Approve it in their secure window below and you're set.` | same    |

### Composed: TierSummaryRail (after StripeChallengeFrame)

| Property | Mobile                        | Desktop |
| -------- | ----------------------------- | ------- |
| props    | `tier={tier}` (no trial prop) | same    |

### Scroll region

| Property        | Mobile   | Desktop |
| --------------- | -------- | ------- |
| flex / overflow | 1 / auto | same    |

### Footer

| Property                       | Mobile            | Desktop |
| ------------------------------ | ----------------- | ------- |
| padding                        | 8px 16px 16px     | same    |
| display / flex-direction / gap | flex / column / 8 | same    |
| align-items                    | center            | center  |

### Footer note (MonoEyebrow)

| Property                                   | Mobile                                              | Desktop |
| ------------------------------------------ | --------------------------------------------------- | ------- |
| copy                                       | `Don't close this window — it'll finish on its own` | same    |
| font-size / color / letter-spacing         | 10 / var(--fg-subtle) / 0.12em                      | same    |
| font-weight / text-transform / font-family | 700 / uppercase / 'JetBrains Mono', monospace       | same    |

### Cancel button

| Property                              | Mobile                                 | Desktop |
| ------------------------------------- | -------------------------------------- | ------- |
| all / cursor                          | unset / pointer                        | same    |
| font-family / font-size / font-weight | 'JetBrains Mono', monospace / 10 / 700 | same    |
| letter-spacing / text-transform       | 0.14em / uppercase                     | same    |
| color / padding                       | var(--fg-subtle) / 6px 8px             | same    |
| label                                 | `Cancel payment`                       | same    |

---

## Component: StripeChallengeFrame (dashed iframe stand-in)

### Container

| Property                                     | Mobile                                         | Desktop  |
| -------------------------------------------- | ---------------------------------------------- | -------- |
| role                                         | group                                          | group    |
| aria-label                                   | `Secure bank verification (handled by Stripe)` | same     |
| position                                     | relative                                       | relative |
| border-radius                                | 12                                             | 12       |
| background                                   | var(--surface-1)                               | same     |
| border                                       | 1px dashed var(--border-strong)                | same     |
| padding                                      | 26px 18px 22px                                 | same     |
| display / flex-direction / align-items / gap | flex / column / center / 13                    | same     |
| min-height                                   | 196                                            | 196      |

### Top label row

| Property                                | Mobile                                                                              | Desktop |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| display / align-items / justify-content | flex / center / space-between                                                       | same    |
| width                                   | 100%                                                                                | 100%    |
| position / top / left                   | absolute / 11 / 0                                                                   | same    |
| padding                                 | 0 13px                                                                              | 0 13px  |
| left label (MonoEyebrow)                | size 9, letter-spacing 0.16em, color var(--fg-subtle) — copy: `Stripe · 3-D Secure` | same    |
| right label (MonoEyebrow)               | size 9, letter-spacing 0.16em, color var(--fg-subtle) — copy: `your bank's window`  | same    |

### Lock + spinner wrapper

| Property       | Mobile   | Desktop  |
| -------------- | -------- | -------- |
| position       | relative | relative |
| width / height | 54 / 54  | same     |
| margin-top     | 6        | 6        |

### Spinner svg

| Property                 | Mobile                                                                                           | Desktop |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------- |
| width / height / viewBox | 54 / 54 / 0 0 54 54                                                                              | same    |
| aria-hidden              | true                                                                                             | true    |
| position / inset         | absolute / 0                                                                                     | same    |
| animation                | `mPaySpin 1.1s linear infinite`                                                                  | same    |
| color                    | var(--signal)                                                                                    | same    |
| track circle             | cx 27, cy 27, r 23, fill none, stroke currentColor, stroke-width 3, opacity 0.18                 | same    |
| arc path d               | `M50 27 A23 23 0 0 0 27 4`, fill none, stroke currentColor, stroke-width 3, stroke-linecap round | same    |

### Lock icon wrapper

| Property                                | Mobile                 | Desktop |
| --------------------------------------- | ---------------------- | ------- |
| position / inset                        | absolute / 0           | same    |
| display / align-items / justify-content | flex / center / center | same    |
| color                                   | var(--signal)          | same    |

### Lock icon svg

| Property                 | Mobile                                                                                     | Desktop |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------- |
| width / height / viewBox | 22 / 22 / 0 0 22 22                                                                        | same    |
| aria-hidden              | true                                                                                       | true    |
| rect                     | x 5, y 9.5, width 12, height 8.5, rx 1.6, fill none, stroke currentColor, stroke-width 1.6 | same    |
| path d                   | `M7.4 9.5 V7 a3.6 3.6 0 0 1 7.2 0 V9.5`, fill none, stroke currentColor, stroke-width 1.6  | same    |

### "Waiting" line

| Property                  | Mobile                   | Desktop |
| ------------------------- | ------------------------ | ------- |
| font-family / font-weight | Inter, system-ui / 700   | same    |
| font-size                 | 13.5                     | 13.5    |
| color                     | var(--fg)                | same    |
| copy                      | `Waiting for your bank…` | same    |

### Bottom line (MonoEyebrow)

| Property                           | Mobile                                              | Desktop |
| ---------------------------------- | --------------------------------------------------- | ------- |
| font-size / color / letter-spacing | 9 / var(--fg-subtle) / 0.12em                       | same    |
| copy                               | `Stripe renders this · Concert Crawl never sees it` | same    |

**Keyframe dependency:** `mPaySpin` (1.1s linear infinite rotation) must exist — referenced by the challenge spinner; defined in the locked payment chrome, not in these files.

---

## Verbatim Copy Contract (FAILURE_CONFIG)

| Category                  | eyebrow             | code | headline                                           | body                                                                                                                        | primary                | secondary              | note (tone)                                                                            |
| ------------------------- | ------------------- | ---- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| insufficient_funds        | `CARD DECLINED`     | `01` | `Your bank said no.`                               | `It came back as insufficient funds — nothing was charged. Try again, or drop in a different card.`                         | `Try again`            | `Use a different card` | —                                                                                      |
| expired_or_incorrect_card | `CARD DECLINED`     | `02` | `That card won't go through.`                      | `The number, expiry, or security code didn't check out — or the card's expired. Give it another look. Nothing was charged.` | `Try again`            | `Use a different card` | —                                                                                      |
| issuer_declined           | `CARD DECLINED`     | `03` | `Your bank declined it.`                           | `They don't tell us why — banks keep that to themselves. A different card usually does the trick. Nothing was charged.`     | `Try a different card` | —                      | —                                                                                      |
| fraud_block               | `CARD FLAGGED`      | `04` | `Your card got flagged for review.`                | `Your bank put a hold on this one — it happens, often for no real reason. Nothing was charged.`                             | `Try a different card` | —                      | `It's worth a quick call to your bank, too.` (muted — no aria-live)                    |
| network_timeout           | `CONNECTION HICCUP` | `05` | `That didn't go through — but it's not your card.` | `Something dropped between us and the payment network. Your card's fine and nothing was charged.`                           | `Try again`            | —                      | `If it keeps happening, give it a minute and try again.` (polite — aria-live="polite") |

Additional fixed strings: `Save it for later · email me a link` (tertiary, all categories) · `Card on file kept — we'll reuse it on retry` (network_timeout only) · `Payment · declined` (rail eyebrow, all categories) · close aria-label `Close and return to plans`.

## Verbatim Copy Contract (CHALLENGE_CONFIG)

| Kind | eyebrow              | code  | headline                         | body                                                                                                            |
| ---- | -------------------- | ----- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 3ds  | `SECURE CHECK · 3DS` | `3DS` | `One quick step from your bank.` | `Your bank wants to confirm it's really you. It happens in their secure window below — we never see any of it.` |
| sca  | `SECURE CHECK · SCA` | `SCA` | `Your bank needs a thumbs-up.`   | `EU rules mean your bank confirms this one directly. Approve it in their secure window below and you're set.`   |

Fixed strings: `Stripe · 3-D Secure` · `your bank's window` · `Waiting for your bank…` · `Stripe renders this · Concert Crawl never sees it` · `Don't close this window — it'll finish on its own` · `Cancel payment` · close aria-label `Cancel verification and return` · frame aria-label `Secure bank verification (handled by Stripe)`.

---

## A11y Requirements Table

Sources: `a11y.jsx` (AnnotatedFailure, AnnotatedChallenge, SR_SCRIPTS.payment step 6) + README §A11y sweep.

| Element/Surface                             | Requirement                                                                                                           | Exact value                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Failure surface container (all 5)           | Modal error dialog — interrupts with an error, so alertdialog (not dialog); focus trapped until resolved or dismissed | `role="alertdialog" aria-modal="true"`                                 |
| Failure surface headline                    | Assertive live region — announces immediately on mount ("an interrupt by definition")                                 | `aria-live="assertive"`                                                |
| Failure surface body copy                   | Description associated to the dialog                                                                                  | `aria-describedby`                                                     |
| Stripe Elements slot inside failure surface | Label the surrounding region; Stripe owns its iframe a11y; retry re-renders Elements in place                         | `aria-label` (group)                                                   |
| Failure surface — focus on mount            | Focus moves to the primary action                                                                                     | focus() → primary CTA                                                  |
| Failure surface — dismiss                   | Escape dismisses to the picker and returns focus to the affordance that opened payment                                | Esc → focus return                                                     |
| SR sequence on decline                      | Alertdialog replaces the payment surface; headline announces assertively; focus jumps to primary CTA                  | e.g. announces "Your bank declined it"; focus → "Try a different card" |
| 3DS/SCA challenge container                 | Modal step, not an error — dialog (not alertdialog); focus trapped                                                    | `role="dialog" aria-modal="true"`                                      |
| 3DS/SCA accessible name/description         | Chrome headline + body                                                                                                | `aria-labelledby` / `aria-describedby`                                 |
| 3DS/SCA Stripe iframe                       | Separate a11y context — annotate around the iframe only                                                               | Stripe-owned; no interception                                          |
| 3DS/SCA cancel path                         | "Cancel payment" closes the mount and returns focus to the payment surface; no dead-end                               | Esc / Cancel → focus return                                            |
| network_timeout note                        | Polite live region                                                                                                    | `aria-live="polite"`                                                   |
| Assertive-use budget                        | Only failure headline + trial-ended takeover mount are assertive in the whole flow; everything else polite            | —                                                                      |

## Voice Rules

- Sour Patch, honesty side: failures blunt, not blamey or whiny.
- The word "fraud" NEVER appears in user-facing copy.
- fraud_block has no retry-same-card path; "call your bank" is a non-CTA line, never a button.
- Never a verb on a red button — `--danger` carries the message; forward action stays `--signal`.
- No "subject to change" disclaimer anywhere.
- Token-only styling across all 9 themes.
- All copy externalizes to `definitions/copy.ts`.

---

## State Coverage

decline_code → category mapping is **owned by eng (#775 / this PR)**; README example codes are guidance only. Categories 1–4 map from `decline_code`; category 5 maps from non-decline error sources.

| State                     | Triggering condition                                                                             | Component rendered                                       | Key props required                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| insufficient_funds        | `decline_code = insufficient_funds`                                                              | FailureSurface                                           | `category="insufficient_funds"`; freshCard=true (Stripe slot re-renders **with error state**, not empty); secondary CTA present                  |
| expired_or_incorrect_card | `decline_code ∈ {expired_card, incorrect_cvc, incorrect_number, invalid_expiry_*}`               | FailureSurface                                           | `category="expired_or_incorrect_card"`; freshCard=true + freshEmpty=true (Elements re-renders **empty**); secondary CTA present                  |
| issuer_declined           | `decline_code ∈ {do_not_honor, generic_decline, card_velocity_exceeded, currency_not_supported}` | FailureSurface                                           | `category="issuer_declined"`; freshCard=true + freshEmpty=true; no secondary CTA                                                                 |
| fraud_block               | `decline_code ∈ {fraudulent, stolen_card, lost_card, pickup_card, restricted_card}`              | FailureSurface                                           | `category="fraud_block"`; freshCard=true + freshEmpty=true; no secondary CTA; muted note line; NO retry-same-card path; never the word "fraud"   |
| network_timeout           | network failure / request timeout / Stripe API 5xx (**no** `decline_code`)                       | FailureSurface                                           | `category="network_timeout"`; freshCard=false → card-kept note instead of Stripe slot; polite aria-live note; retry re-submits with entered card |
| 3DS challenge             | Stripe requires 3-D Secure verification                                                          | ChallengeMount                                           | `kind="3ds"`; role="dialog"; Stripe owns iframe internals                                                                                        |
| SCA challenge             | Stripe requires SCA (EU) verification                                                            | ChallengeMount                                           | `kind="sca"`; role="dialog"                                                                                                                      |
| Unknown category fallback | category key not in FAILURE_CONFIG                                                               | FailureSurface (insufficient_funds config)               | `FAILURE_CONFIG[category]                                                                                                                        |     | FAILURE_CONFIG.insufficient_funds`; ChallengeMount falls back to `3ds` |
| Trial pricing context     | `trial=true` AND `tierKey="premium"`                                                             | TierSummaryRail + TotalsBlock receive `trial=true`       | `trialEligible = trial && tier.key === "premium"` — trial never passes for non-premium tiers                                                     |
| Mobile variant            | viewport < 640px (Tailwind `sm:`)                                                                | SheetChrome (86% failure / 80% challenge) + DragHandle   | `variant="mobile"`                                                                                                                               |
| Desktop variant           | viewport ≥ 640px                                                                                 | ModalChrome (520 failure / 500 challenge), no DragHandle | `variant="desktop"`                                                                                                                              |
