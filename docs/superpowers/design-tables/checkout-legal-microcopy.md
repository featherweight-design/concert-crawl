# Design Property Table — #782 Checkout Microcopy (PR 4.1)

Source: `design/design_handoff_monetization_failure_a11y_microcopy/microcopy.jsx`
Scope: LegalRow, LegalLink, LegalBlock, BottomMonoRail, PRICE_PROMISE copy map.
PricePromiseLine's boxed styling is NOT in scope — the tier picker renders the
promise via TierMonoNote (#781); only the wording map applies here.

## Decisions

- Above-CTA block = stacked mono micro-rows — every legal line visible, no
  collapse. fg-subtle rows, links in --signal. Order: (a) ToS/Privacy/Refund
  links, (b) auto-renew, (c) SCA notice (conditional, server-resolved region).
- NO "subject to change" disclaimer anywhere — it would undermine the
  grandfather-everyone-forever promise.
- Price-promise line shows on Supporter + Premium; Founder keeps its stronger
  locked-$3 stamp and gets a reinforcing (not duplicating) line.
- Font family: design mock uses 'JetBrains Mono'; app convention is
  `var(--font-mono)` (equivalent — the app's mono stack).

## Component: LegalRow

### Wrapper div

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| font-family    | var(--font-mono)                                           |
| font-size      | 10                                                         |
| font-weight    | 500                                                        |
| line-height    | 1.5                                                        |
| letter-spacing | 0.02em                                                     |
| color          | var(--fg-subtle) default · var(--fg-muted) if tone="muted" |
| display        | flex                                                       |
| align-items    | baseline                                                   |
| gap            | 7                                                          |

### Bullet dot (span)

| Property      | Value                |
| ------------- | -------------------- |
| width         | 4                    |
| height        | 4                    |
| border-radius | 4                    |
| margin-top    | 6                    |
| flex-shrink   | 0                    |
| background    | var(--border-strong) |

### Text container (span)

| Property | Value |
| -------- | ----- |
| flex     | 1     |

## Component: LegalLink

| Property              | Value                                               |
| --------------------- | --------------------------------------------------- |
| color                 | var(--signal)                                       |
| text-decoration       | underline                                           |
| text-underline-offset | 2                                                   |
| text-decoration-color | color-mix(in oklch, var(--signal) 45%, transparent) |
| cursor                | pointer                                             |

## Component: LegalBlock

### Wrapper (role="group")

| Property       | Value                         |
| -------------- | ----------------------------- |
| role           | group                         |
| aria-label     | Terms and billing information |
| display        | flex                          |
| flex-direction | column                        |
| gap            | 6                             |
| padding        | 10px 0 2px                    |

### Conditional rendering

| Condition           | Content                                   |
| ------------------- | ----------------------------------------- |
| scaRegion === true  | Third LegalRow (SCA notice), tone="muted" |
| scaRegion === false | Third LegalRow does not render            |

### Copy

| Row | Exact string                                                                       |
| --- | ---------------------------------------------------------------------------------- |
| 1   | By continuing you agree to our [Terms], [Privacy] & [Refund policy]. (three links) |
| 2   | Auto-renews monthly. Cancel anytime — keeps working till the period ends.          |
| 3   | Your bank may ask to confirm this payment. (muted, conditional)                    |

## Component: BottomMonoRail

### Wrapper div

| Property        | Value     |
| --------------- | --------- |
| display         | flex      |
| align-items     | center    |
| justify-content | center    |
| flex-wrap       | wrap      |
| gap             | 4px 12px  |
| padding         | 6px 0 2px |

### Left icon span

| Property    | Value       |
| ----------- | ----------- |
| display     | inline-flex |
| align-items | center      |
| gap         | 6           |

### Lock SVG

| Property    | Value            |
| ----------- | ---------------- |
| width       | 11               |
| height      | 11               |
| viewBox     | 0 0 12 12        |
| aria-hidden | true             |
| color       | var(--fg-subtle) |

Rect: x=2.5 y=5 width=7 height=5 rx=1 fill=none stroke=currentColor stroke-width=1.1
Path: d="M4 5 V3.7 a2 2 0 0 1 4 0 V5" fill=none stroke=currentColor stroke-width=1.1

### Mono text segments (both)

| Property       | Value            |
| -------------- | ---------------- |
| font-size      | 9                |
| color          | var(--fg-subtle) |
| letter-spacing | 0.12em           |
| font-family    | var(--font-mono) |
| text-transform | uppercase        |

Segment 1: `Stripe handles your card · we never see it`
Separator: `·` (color var(--border-strong), font-size 9)
Segment 2: `Cancel anytime, lose nothing`

## Copy strings — PRICE_PROMISE map

| Tier      | Exact string                                            |
| --------- | ------------------------------------------------------- |
| supporter | Whatever you pay, you pay. We never raise it.           |
| premium   | Whatever you pay, you pay. We never raise it.           |
| founder   | $3 is $3. New folks may pay double someday — never you. |

## State coverage

| State              | Triggering condition                           | Rendered                           |
| ------------------ | ---------------------------------------------- | ---------------------------------- |
| SCA notice shown   | x-vercel-ip-country ∈ EEA+UK, or header absent | third LegalRow (muted)             |
| SCA notice hidden  | x-vercel-ip-country present and outside EEA+UK | two LegalRows only                 |
| Refund link target | always                                         | /legal/terms#refunds anchor exists |
