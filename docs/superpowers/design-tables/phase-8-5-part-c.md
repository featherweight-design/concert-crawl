# Design Property Table — Phase 8.5 Consumer UI (Pass C: Multi-Tier)

Source: `design/design_handoff_phase8_5_corroboration/design_handoff_phase8_5_corroboration/multi-tier.jsx`

---

## Component: TierAlternateRow

### Outer container

| Property        | Value                         |
|-----------------|-------------------------------|
| display         | flex                          |
| align-items     | center                        |
| gap             | 10                            |
| padding         | 10px 0                        |
| border-top      | 1px dashed var(--border)      |

### Tier label span

| Property        | Value                         |
|-----------------|-------------------------------|
| font-family     | 'JetBrains Mono', monospace   |
| font-size       | 10.5                          |
| color           | var(--fg)                     |
| letter-spacing  | 0.08em                        |
| text-transform  | uppercase                     |
| font-weight     | 700                           |
| min-width       | 56                            |

### Tier dot span

| Property        | Value                         |
|-----------------|-------------------------------|
| width           | 5                             |
| height          | 5                             |
| border-radius   | 2.5                           |
| flex-shrink     | 0                             |
| background      | dotColor (see dotColor logic) |
| align-self      | center                        |
| opacity         | 0.85                          |

### dotColor logic

| kind value    | color                          |
|---------------|--------------------------------|
| "boxoffice"   | GOLD_M (`window.PendingGOLD` or `oklch(0.66 0.14 78)`)  |
| "community"   | AZ_M (`window.PendingAZURE` or `oklch(0.62 0.12 240)`)  |
| anything else | var(--fg-muted)                |

### Spacer span

| Property | Value |
|----------|-------|
| flex     | 1     |

### Pending state (pending=true)

Renders a `<span>` in place of the vendor span.

| Property        | Value                                |
|-----------------|--------------------------------------|
| font-family     | 'JetBrains Mono', monospace          |
| font-size       | 9.5                                  |
| color           | AZ_M (`oklch(0.62 0.12 240)`)        |
| letter-spacing  | 0.06em                               |
| text-transform  | uppercase                            |
| font-weight     | 700                                  |
| content         | "pending · {confirms}/2"             |

Price span (pending=true):

| Property            | Value           |
|---------------------|-----------------|
| color               | var(--fg-muted) |

### Live state (pending=false)

Renders a `<span>` showing the vendor string.

| Property        | Value                    |
|-----------------|--------------------------|
| font-family     | Inter, system-ui         |
| font-size       | 12                       |
| color           | var(--fg-muted)          |
| letter-spacing  | -0.005em                 |

Price span (pending=false):

| Property            | Value       |
|---------------------|-------------|
| color               | var(--fg)   |

### Price span (shared across both states)

| Property            | Value                          |
|---------------------|--------------------------------|
| font-family         | Inter, system-ui               |
| font-weight         | 700                            |
| font-size           | 14                             |
| letter-spacing      | -0.01em                        |
| font-variant-numeric| tabular-nums                   |
| color               | var(--fg-muted) if pending=true, var(--fg) if pending=false |

---

## Component: TwoPendingStack

### Outer container

| Property        | Value   |
|-----------------|---------|
| display         | flex    |
| flex-direction  | column  |
| gap             | 12      |

### Composition

TwoPendingStack renders exactly two `window.PendingCardB` instances stacked vertically with `gap: 12`. No other chrome is added.

| Slot  | Props passed to PendingCardB                                                                                                                  |
|-------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| Card 1 | floor=40, tier="GA", vendor="AXS", kind="community", submitter={ handle: "@hugh", url: "/u/hugh" }, submittedAt="2h ago", confirms=1, needed=2, view="other", note="GA standing on AXS. $40 face, no fees on the page." |
| Card 2 | floor=100, tier="VIP", vendor="AXS", kind="community", submitter={ handle: "@amelia", url: "/u/amelia" }, submittedAt="40m ago", confirms=0, needed=2, view="other", note="VIP — front pit + pre-show meet, $100 face on AXS." |

---

## Component: MultiTierLiveCard

### Outer container

| Property        | Value                   |
|-----------------|-------------------------|
| border-radius   | 12                      |
| background      | var(--surface-1)        |
| border          | 1px solid var(--border) |
| padding         | 14px 14px 12px          |

### Eyebrow

Renders `<window.PendingEyebrow>` with text content "Tickets". No additional inline styles.

### Headline row container

| Property        | Value    |
|-----------------|----------|
| margin-top      | 6        |
| display         | flex     |
| align-items     | baseline |
| gap             | 8        |
| flex-wrap       | wrap     |

### "from" label span

| Property        | Value            |
|-----------------|------------------|
| font-family     | Inter, system-ui |
| font-weight     | 600              |
| font-size       | 13               |
| color           | var(--fg-muted)  |
| letter-spacing  | -0.005em         |

### Price span

| Property        | Value            |
|-----------------|------------------|
| font-family     | Inter, system-ui |
| font-weight     | 800              |
| font-size       | 28               |
| color           | var(--fg)        |
| letter-spacing  | -0.025em         |
| line-height     | 1.05             |

### Tier label span

| Property        | Value                       |
|-----------------|-----------------------------|
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 11                          |
| color           | var(--fg-muted)             |
| letter-spacing  | 0.06em                      |
| text-transform  | uppercase                   |
| font-weight     | 700                         |

### Trust pill

Renders `<window.PendingTrustPill kind={cheapestKind}/>`. No additional inline styles.

### Vendor / observation line

| Property        | Value                       |
|-----------------|-----------------------------|
| margin-top      | 6                           |
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 10                          |
| color           | var(--fg-muted)             |
| letter-spacing  | 0.04em                      |

Content: `"seen on {cheapestVendor} · observed {observedAt}"`

### "Other tiers" section container

Conditionally rendered only when `alternates.length > 0`.

| Property        | Value |
|-----------------|-------|
| margin-top      | 12    |

### "Other tiers" eyebrow div

| Property        | Value                       |
|-----------------|-----------------------------|
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 9                           |
| color           | var(--fg-subtle)            |
| letter-spacing  | 0.06em                      |
| text-transform  | uppercase                   |
| margin-bottom   | 2                           |

### Alternate rows

Each item in `alternates` is rendered as `<TierAlternateRow key={i} {...alt}/>`. The default `alternates` prop value contains one entry: `{ tier: "VIP", floor: 100, ceiling: null, vendor: "AXS", kind: "community", confirms: 2 }`.

---

## Component: MixedTierCard

MixedTierCard uses fixed sample data (no props). It shares the same outer chrome as MultiTierLiveCard.

### Outer container

| Property        | Value                   |
|-----------------|-------------------------|
| border-radius   | 12                      |
| background      | var(--surface-1)        |
| border          | 1px solid var(--border) |
| padding         | 14px 14px 12px          |

### Eyebrow

Renders `<window.PendingEyebrow>` with text content "Tickets". No additional inline styles.

### Headline row container

| Property        | Value    |
|-----------------|----------|
| margin-top      | 6        |
| display         | flex     |
| align-items     | baseline |
| gap             | 8        |
| flex-wrap       | wrap     |

### "from" label span

| Property        | Value            |
|-----------------|------------------|
| font-family     | Inter, system-ui |
| font-weight     | 600              |
| font-size       | 13               |
| color           | var(--fg-muted)  |
| letter-spacing  | -0.005em         |

### Price span

| Property        | Value            |
|-----------------|------------------|
| font-family     | Inter, system-ui |
| font-weight     | 800              |
| font-size       | 28               |
| color           | var(--fg)        |
| letter-spacing  | -0.025em         |
| line-height     | 1.05             |
| content (fixed) | "$40"            |

### Tier label span

| Property        | Value                       |
|-----------------|-----------------------------|
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

| Property        | Value                       |
|-----------------|-----------------------------|
| margin-top      | 6                           |
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 10                          |
| color           | var(--fg-muted)             |
| letter-spacing  | 0.04em                      |

Content (fixed): `"seen on AXS · observed yesterday · 2 fans confirmed"`

### "Other tiers" section container

Always rendered (not conditional in MixedTierCard).

| Property        | Value |
|-----------------|-------|
| margin-top      | 12    |

### "Other tiers" eyebrow div

| Property        | Value                       |
|-----------------|-----------------------------|
| font-family     | 'JetBrains Mono', monospace |
| font-size       | 9                           |
| color           | var(--fg-subtle)            |
| letter-spacing  | 0.06em                      |
| text-transform  | uppercase                   |
| margin-bottom   | 2                           |

### Pending alternate row

Renders a single `<TierAlternateRow>` with fixed props:

| Prop      | Value       |
|-----------|-------------|
| tier      | "VIP"       |
| floor     | 100         |
| kind      | "community" |
| confirms  | 1           |
| pending   | true        |

Note: `ceiling` and `vendor` are not passed; they take TierAlternateRow's defaults (`ceiling=null`, `vendor="AXS"`).
