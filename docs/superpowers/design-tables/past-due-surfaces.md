# Design Property Table — PR 4.3 Past-Due Surfaces

**Sources read:** `past-due.jsx`, `lifecycle-plan-cards.jsx` (past-due branch only), `microcopy.jsx`, `monetization-shared.jsx`, `README.md`, `READINESS.md` — all in `design/design_handoff_monetization_failure_a11y_microcopy/`.

**Breakpoint note:** the design uses a `variant` prop (`"mobile"` | `"desktop"`); implementation maps this to Tailwind `sm:` (640px). Mobile = base, Desktop = `sm:` and up. "Inline" is a second banner mode orthogonal to the breakpoint.

**READINESS verdicts/caveats relevant to past-due (from READINESS.md, 🟢 Green, audited 2026-06-26):**

- Banner's `Update card` has no `href`/`onClick` in the prototype — eng wires the Stripe customer portal redirect (#775 owns the endpoint). Not a design gap.
- All customer-facing copy must externalize to `definitions/copy.ts` at integration (~80 slots handoff-wide).
- `ctaAccent` is deliberately separate from `accent`: card tone is `--warning`, action button stays `--signal` (CTA-token rule — never a verb on a red/warning button).
- Past-due Plan card must ship in lockstep with or before #780's implementation so `past_due` users never see a stale "Active" card.
- No analytics events spec'd for banner show/dismiss/CTA — owned by #775 / plan PR.
- R2 fixed tier-name hardcoding: card body + statusRail use `tierName` (Supporter/Founder/Premium), mirroring the `price` ternary.

---

## Component: PastDueBanner (`past-due.jsx`)

Two modes: **pinned strip** (default, `inline=false` — full-bleed top-of-app) and **inline** (`inline=true` — rounded inset card). Both modes have mobile + desktop variants.

### Root container

Semantics: `role="region"`, `aria-label="Payment notice"`, `aria-live="polite"`.

| Property               | Mobile                                                                    | Desktop          |
| ---------------------- | ------------------------------------------------------------------------- | ---------------- |
| box-sizing             | border-box                                                                | border-box       |
| width                  | 100%                                                                      | 100%             |
| display                | flex                                                                      | flex             |
| align-items            | center                                                                    | center           |
| gap                    | 10                                                                        | 14               |
| padding (pinned)       | 9px 13px                                                                  | 10px 20px        |
| padding (inline)       | 10px 13px                                                                 | 11px 16px        |
| border-radius (pinned) | 0                                                                         | 0                |
| border-radius (inline) | 12                                                                        | 12               |
| background (pinned)    | `color-mix(in oklch, var(--warning) 18%, var(--bg-elevated))`             | same             |
| background (inline)    | `color-mix(in oklch, var(--warning) 12%, var(--surface-1))`               | same             |
| border (pinned)        | none                                                                      | none             |
| border (inline)        | `1px solid color-mix(in oklch, var(--warning) 36%, var(--border))`        | same             |
| border-bottom (pinned) | `1px solid color-mix(in oklch, var(--warning) 34%, var(--border-strong))` | same             |
| border-bottom (inline) | `1px solid color-mix(in oklch, var(--warning) 36%, var(--border))`        | same             |
| color                  | `var(--fg)`                                                               | `var(--fg)`      |
| font-family            | Inter, system-ui                                                          | Inter, system-ui |

### Card-alert icon (SVG)

`aria-hidden="true"`.

| Property          | Mobile                                                                                             | Desktop          |
| ----------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| width             | 16                                                                                                 | 18               |
| height            | 16                                                                                                 | 18               |
| viewBox           | 0 0 16 16                                                                                          | 0 0 16 16        |
| flex-shrink       | 0                                                                                                  | 0                |
| color             | `var(--warning)`                                                                                   | `var(--warning)` |
| rect (card body)  | x=1.5 y=3.5 width=13 height=9 rx=1.6, fill=none, stroke=currentColor, stroke-width=1.4             | same             |
| path (mag stripe) | `d="M1.5 6 H14.5"`, stroke=currentColor, stroke-width=1.4                                          | same             |
| path (alert !)    | `d="M11.4 8.4 V10.2 M11.4 11.6 v0.2"`, stroke=currentColor, stroke-width=1.5, stroke-linecap=round | same             |

### Text wrapper

| Property    | Mobile   | Desktop  |
| ----------- | -------- | -------- |
| flex        | 1        | 1        |
| min-width   | 0        | 0        |
| display     | flex     | flex     |
| align-items | baseline | baseline |
| gap         | 8        | 8        |
| flex-wrap   | wrap     | wrap     |
| row-gap     | 0        | 0        |

### Headline span ("Your card got declined")

| Property       | Mobile      | Desktop     |
| -------------- | ----------- | ----------- |
| font-weight    | 800         | 800         |
| font-size      | 13          | 14          |
| letter-spacing | -0.01em     | -0.01em     |
| color          | `var(--fg)` | `var(--fg)` |

### Sub span ("— give it a refresh?")

| Property       | Mobile            | Desktop           |
| -------------- | ----------------- | ----------------- |
| font-weight    | 500               | 500               |
| font-size      | 12.5              | 13.5              |
| color          | `var(--fg-muted)` | `var(--fg-muted)` |
| letter-spacing | -0.005em          | -0.005em          |

### "Update card" CTA button

Portal-bound (Stripe customer portal; eng wires redirect — #775). No `type`/`aria` beyond default button.

| Property       | Mobile                | Desktop               |
| -------------- | --------------------- | --------------------- |
| all            | unset                 | unset                 |
| cursor         | pointer               | pointer               |
| flex-shrink    | 0                     | 0                     |
| display        | flex                  | flex                  |
| align-items    | center                | center                |
| gap            | 6                     | 6                     |
| padding        | 6px 12px              | 7px 14px              |
| border-radius  | 8                     | 8                     |
| background     | `var(--signal)`       | `var(--signal)`       |
| color          | `var(--fg-on-accent)` | `var(--fg-on-accent)` |
| font-family    | Inter, system-ui      | Inter, system-ui      |
| font-weight    | 800                   | 800                   |
| font-size      | 12                    | 12.5                  |
| letter-spacing | -0.005em              | -0.005em              |

Label span: `white-space: nowrap`.

#### Hover state

— (none defined in design source)

### Portal arrow icon inside CTA (SVG)

`aria-hidden="true"`.

| Property | Mobile                                                                                                                        | Desktop   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- |
| width    | 11                                                                                                                            | 11        |
| height   | 11                                                                                                                            | 11        |
| viewBox  | 0 0 12 12                                                                                                                     | 0 0 12 12 |
| path     | `d="M3 9 L9 3 M4.5 3 H9 V7.5"`, fill=none, stroke=currentColor, stroke-width=1.5, stroke-linecap=round, stroke-linejoin=round | same      |

### Dismiss button

`aria-label="Dismiss payment notice"`; onClick sets dismissed (per-session — see State Coverage).

| Property        | Mobile             | Desktop            |
| --------------- | ------------------ | ------------------ |
| all             | unset              | unset              |
| cursor          | pointer            | pointer            |
| flex-shrink     | 0                  | 0                  |
| width           | 26                 | 26                 |
| height          | 26                 | 26                 |
| border-radius   | 7                  | 7                  |
| display         | flex               | flex               |
| align-items     | center             | center             |
| justify-content | center             | center             |
| color           | `var(--fg-subtle)` | `var(--fg-subtle)` |

#### Hover state

— (none defined in design source)

### Dismiss X icon (SVG)

`aria-hidden="true"`.

| Property | Mobile                                                                                     | Desktop   |
| -------- | ------------------------------------------------------------------------------------------ | --------- |
| width    | 13                                                                                         | 13        |
| height   | 13                                                                                         | 13        |
| viewBox  | 0 0 16 16                                                                                  | 0 0 16 16 |
| path     | `d="M3 3 L13 13 M13 3 L3 13"`, stroke=currentColor, stroke-width=1.7, stroke-linecap=round | same      |

## State Coverage — PastDueBanner

| State                         | Triggering condition                                                                                                                                                          | Component rendered                       | Key props required                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Shown (pinned strip, primary) | `subscription.status = "past_due"` AND (`past_due_banner_dismissed_at IS NULL` OR `past_due_banner_dismissed_at < session_started_at`) AND user NOT in an active payment flow | `PastDueBanner` full-bleed at top of app | `inline=false`, `variant` per breakpoint |
| Shown (inline inset)          | Same predicate, inset placement (drops under app bar)                                                                                                                         | `PastDueBanner` rounded card             | `inline=true`                            |
| Dismissed (this session)      | User clicks dismiss → set `past_due_banner_dismissed_at = now`; predicate false for rest of session                                                                           | nothing (`return null`)                  | —                                        |
| Re-shown (next session)       | New session: `session_started_at` advances past dismissal timestamp → predicate true again. Single-fire **per session**, not per dunning window                               | `PastDueBanner`                          | —                                        |
| Suppressed (payment flow)     | User inside an active payment flow (fixing the card) — don't double-stack the alert                                                                                           | nothing                                  | —                                        |
| Dunning window expires        | User rolls to Free → #780's existing post-cancel-grace Free state; banner predicate no longer matches (`status ≠ past_due`)                                                   | — (out of this component)                | —                                        |

**Stacking/interrupt notes:** no takeover during the 7-day dunning window — past-due is a quiet-but-persistent signal, not an interrupt. `aria-live="polite"` (appears between sessions, never mid-interaction). Eng owns predicate eval, `past_due_banner_dismissed_at` schema, and session-start check (#775).

---

## Component: LifecyclePlanCard — past-due variant (`lifecycle-plan-cards.jsx`, `lifecycle === "past-due"` branch)

Content resolution (`getLifecycleContent`): `pdTier = tier === "free" ? "premium" : tier` (defensive fallback); `tierName` = Supporter / Founder / Premium; `price` = $2 / $3 / $5. Returns `accent: var(--warning)`, `ctaAccent: var(--signal)`, `pastDue: true`. No `emphasis`, no `founder`, no `winding` flags → no emphasis top rail, no card box-shadow.

### Card shell

| Property       | Mobile                                                                                                                             | Desktop                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| position       | relative                                                                                                                           | relative                                                                  |
| border-radius  | 14                                                                                                                                 | 14                                                                        |
| padding        | 16px 16px 18px                                                                                                                     | 20px 22px 22px                                                            |
| background     | `radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--warning) 14%, transparent) 0%, transparent 60%), var(--bg-elevated)` | same but gradient stop `55%`                                              |
| border         | `1px solid color-mix(in oklch, var(--warning) 40%, var(--border-strong))`                                                          | `1px solid color-mix(in oklch, var(--warning) 45%, var(--border-strong))` |
| box-shadow     | none                                                                                                                               | none                                                                      |
| color          | `var(--fg)`                                                                                                                        | `var(--fg)`                                                               |
| font-family    | Inter, system-ui                                                                                                                   | Inter, system-ui                                                          |
| display        | flex                                                                                                                               | flex                                                                      |
| flex-direction | column                                                                                                                             | column                                                                    |
| gap            | 11                                                                                                                                 | 14                                                                        |
| max-width      | none                                                                                                                               | 620                                                                       |
| overflow       | hidden                                                                                                                             | hidden                                                                    |

### Eyebrow row

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 8      | 10      |
| flex-wrap   | wrap   | wrap    |

Contains: `TierBadge` (size `sm` mobile / `md` desktop — see shared primitives), the PAYMENT FAILED chip, and the MonoEyebrow rest.

### Chip ("PAYMENT FAILED")

| Property       | Mobile                                                             | Desktop          |
| -------------- | ------------------------------------------------------------------ | ---------------- |
| display        | inline-flex                                                        | inline-flex      |
| align-items    | center                                                             | center           |
| gap            | 5                                                                  | 5                |
| padding        | 3px 7px                                                            | 4px 8px          |
| border-radius  | 4                                                                  | 5                |
| background     | `color-mix(in oklch, var(--warning) 14%, transparent)`             | same             |
| border         | `1px solid color-mix(in oklch, var(--warning) 40%, var(--border))` | same             |
| font-family    | 'JetBrains Mono', monospace                                        | same             |
| font-weight    | 800                                                                | 800              |
| font-size      | 8.5                                                                | 9                |
| letter-spacing | 0.14em                                                             | 0.14em           |
| text-transform | uppercase                                                          | uppercase        |
| color          | `var(--warning)`                                                   | `var(--warning)` |

### Eyebrow rest (MonoEyebrow — "$5 / MONTH · RETRYING" etc.)

| Property       | Mobile                      | Desktop            |
| -------------- | --------------------------- | ------------------ |
| font-family    | 'JetBrains Mono', monospace | same               |
| font-size      | 9                           | 10                 |
| font-weight    | 700                         | 700                |
| text-transform | uppercase                   | uppercase          |
| letter-spacing | 0.14em                      | 0.14em             |
| color          | `var(--fg-subtle)`          | `var(--fg-subtle)` |

### Headline ("Heads up. Your card got declined.")

| Property       | Mobile   | Desktop |
| -------------- | -------- | ------- |
| font-weight    | 900      | 900     |
| font-size      | 22       | 30      |
| letter-spacing | -0.025em | -0.03em |
| line-height    | 1.05     | 1.05    |

### Body

| Property       | Mobile            | Desktop           |
| -------------- | ----------------- | ----------------- |
| font-weight    | 500               | 500               |
| font-size      | 13                | 14.5              |
| color          | `var(--fg-muted)` | `var(--fg-muted)` |
| letter-spacing | -0.005em          | -0.005em          |
| line-height    | 1.45              | 1.5               |
| max-width      | none              | 520               |

### Punchline (mono italic)

| Property       | Mobile                         | Desktop          |
| -------------- | ------------------------------ | ---------------- |
| font-family    | 'JetBrains Mono', monospace    | same             |
| font-style     | italic                         | italic           |
| font-size      | 11.5                           | 12.5             |
| color          | `var(--warning)` (card accent) | `var(--warning)` |
| letter-spacing | 0.02em                         | 0.02em           |

### Status rail wrapper

| Property   | Mobile | Desktop |
| ---------- | ------ | ------- |
| margin-top | 2      | 2       |

### CardStatusRail (tone="warning") — container

| Property      | Mobile                                                             | Desktop  |
| ------------- | ------------------------------------------------------------------ | -------- |
| display       | flex                                                               | flex     |
| align-items   | center                                                             | center   |
| gap           | 10                                                                 | 10       |
| padding       | 9px 12px                                                           | 9px 12px |
| border-radius | 10                                                                 | 10       |
| background    | `color-mix(in oklch, var(--warning) 9%, var(--surface-1))`         | same     |
| border        | `1px solid color-mix(in oklch, var(--warning) 30%, var(--border))` | same     |

### CardStatusRail — glow dot

| Property      | Mobile                   | Desktop          |
| ------------- | ------------------------ | ---------------- |
| width         | 7                        | 7                |
| height        | 7                        | 7                |
| border-radius | 7                        | 7                |
| background    | `var(--warning)`         | `var(--warning)` |
| box-shadow    | `0 0 8px var(--warning)` | same             |
| flex-shrink   | 0                        | 0                |

### CardStatusRail — text column

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| flex           | 1      | 1       |
| min-width      | 0      | 0       |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 1      | 1       |

### CardStatusRail — label ("Premium pauses Jul 15 if the card isn't fixed")

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| font-family    | Inter, system-ui | Inter, system-ui |
| font-weight    | 700              | 700              |
| font-size      | 12.5             | 12.5             |
| color          | `var(--fg)`      | `var(--fg)`      |
| letter-spacing | -0.005em         | -0.005em         |

### CardStatusRail — sub (MonoEyebrow, "STRIPE IS RETRYING THE CHARGE")

| Property       | Mobile                      | Desktop            |
| -------------- | --------------------------- | ------------------ |
| font-family    | 'JetBrains Mono', monospace | same               |
| font-size      | 9                           | 9                  |
| font-weight    | 700                         | 700                |
| text-transform | uppercase                   | uppercase          |
| letter-spacing | 0.12em                      | 0.12em             |
| color          | `var(--fg-subtle)`          | `var(--fg-subtle)` |

### CTA row

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| gap            | 10     | 10      |
| margin-top     | 6      | 6       |
| flex-direction | column | row     |
| flex-wrap      | wrap   | wrap    |

### CTA — "Update card" (primary, glow, portal)

`ctaAccent = var(--signal)` (NOT the card's `--warning`); `founder` false.

| Property                 | Mobile                                                         | Desktop               |
| ------------------------ | -------------------------------------------------------------- | --------------------- |
| all                      | unset                                                          | unset                 |
| cursor                   | pointer                                                        | pointer               |
| text-align               | center                                                         | center                |
| box-sizing               | border-box                                                     | border-box            |
| padding                  | 11px 16px                                                      | 11px 16px             |
| border-radius            | 10                                                             | 10                    |
| background               | `var(--signal)`                                                | `var(--signal)`       |
| color                    | `var(--fg-on-accent)`                                          | `var(--fg-on-accent)` |
| border                   | none                                                           | none                  |
| font-family              | Inter, system-ui                                               | same                  |
| font-weight              | 700                                                            | 700                   |
| font-size                | 13.5                                                           | 13.5                  |
| letter-spacing           | -0.005em                                                       | -0.005em              |
| box-shadow (glow)        | `0 0 22px color-mix(in oklch, var(--signal) 32%, transparent)` | same                  |
| width                    | 100%                                                           | —                     |
| display (portal)         | flex                                                           | flex                  |
| align-items (portal)     | center                                                         | center                |
| justify-content (portal) | center                                                         | center                |
| gap (portal)             | 7                                                              | 7                     |

Label span: `white-space: nowrap`.

#### Hover state

— (none defined in design source)

### CTA — portal arrow icon (SVG)

`aria-hidden="true"`.

| Property | Mobile                                                                                                                        | Desktop   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- |
| width    | 12                                                                                                                            | 12        |
| height   | 12                                                                                                                            | 12        |
| viewBox  | 0 0 12 12                                                                                                                     | 0 0 12 12 |
| opacity  | 0.9                                                                                                                           | 0.9       |
| path     | `d="M3 9 L9 3 M4.5 3 H9 V7.5"`, fill=none, stroke=currentColor, stroke-width=1.5, stroke-linecap=round, stroke-linejoin=round | same      |

### CTA — "Manage subscription" (ghost)

| Property       | Mobile                           | Desktop           |
| -------------- | -------------------------------- | ----------------- |
| all            | unset                            | unset             |
| cursor         | pointer                          | pointer           |
| text-align     | center                           | center            |
| box-sizing     | border-box                       | border-box        |
| padding        | 11px 16px                        | 11px 16px         |
| border-radius  | 10                               | 10                |
| background     | transparent                      | transparent       |
| color          | `var(--fg-muted)`                | `var(--fg-muted)` |
| border         | `1px solid var(--border-strong)` | same              |
| font-family    | Inter, system-ui                 | same              |
| font-weight    | 700                              | 700               |
| font-size      | 13.5                             | 13.5              |
| letter-spacing | -0.005em                         | -0.005em          |
| box-shadow     | none                             | none              |
| width          | 100%                             | —                 |

#### Hover state

— (none defined in design source)

## State Coverage — LifecyclePlanCard (past-due)

| State                    | Triggering condition                                                                | Component rendered                                                                                    | Key props required                                             |
| ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Past-due · Premium       | `lifecycle = "past-due"`, `tier = "premium"`                                        | Warning-toned card; chip PAYMENT FAILED; eyebrow `$5 / MONTH · RETRYING`; TierBadge Premium           | `user={{ tier: "premium", lifecycle: "past-due", periodEnd }}` |
| Past-due · Supporter     | `lifecycle = "past-due"`, `tier = "supporter"`                                      | Same shell; eyebrow `$2 / MONTH · RETRYING`; tierName "Supporter" in body + rail; TierBadge Supporter | `tier: "supporter"`                                            |
| Past-due · Founder       | `lifecycle = "past-due"`, `tier = "founder"`                                        | Same shell; eyebrow `$3 / MONTH · RETRYING`; tierName "Founder"; TierBadge Founder                    | `tier: "founder"`                                              |
| Past-due · free fallback | `lifecycle = "past-due"`, `tier = "free"` (impossible in prod, defensively handled) | Renders as Premium (`pdTier = "premium"`)                                                             | —                                                              |

Notes: `Update card` sits **alongside** `Manage subscription` (does not replace it); `Update card` is portal-bound (↗) per #780's hybrid split. Card accent `--warning`; CTAs use `ctaAccent` `--signal`. `pastDue: true` flag returned for downstream consumers. Stripe retries ~7 days; user keeps paid tier during the window.

---

## Shared primitive: TierBadge (`monetization-shared.jsx`) — as used in past-due card

Size `sm` (mobile) / `md` (desktop). Common: display inline-flex, align-items center, border `1px solid <bd>`, font-family 'JetBrains Mono', font-weight 800, letter-spacing 0.12em, text-transform uppercase, white-space nowrap, line-height 1. Returns null for tier free/absent.

| Property      | Mobile (sm) | Desktop (md) |
| ------------- | ----------- | ------------ |
| padding       | 3px 7px     | 4px 9px      |
| font-size     | 9           | 10           |
| glyph size    | 8           | 9            |
| gap           | 5           | 5            |
| border-radius | 4           | 5            |

Per-tier colors:

| Tier      | background                                                                                                                          | border-color                                          | color           | Glyph                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| supporter | `color-mix(in oklch, var(--accent) 14%, transparent)`                                                                               | `color-mix(in oklch, var(--accent) 36%, transparent)` | `var(--accent)` | mono `+` (JetBrains Mono, weight 800)                                                                                                                             |
| premium   | `color-mix(in oklch, var(--signal) 14%, transparent)`                                                                               | `color-mix(in oklch, var(--signal) 38%, transparent)` | `var(--signal)` | star SVG viewBox `0 0 10 10`, polygon points `5,0 6.3,3.4 10,3.7 7.1,6 8.1,9.7 5,7.6 1.9,9.7 2.9,6 0,3.7 3.7,3.4`, fill=currentColor                              |
| founder   | `linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, transparent), color-mix(in oklch, var(--signal) 18%, transparent))` | `color-mix(in oklch, var(--signal) 50%, transparent)` | `var(--fg)`     | crown SVG viewBox `0 0 10 10`, path `M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z`, fill=`var(--signal)`, stroke=`var(--accent)`, stroke-width=0.7, stroke-linejoin=round |

## Shared primitive: MonoEyebrow — defaults

font-family `'JetBrains Mono', monospace`, text-transform uppercase; defaults size 10 / weight 700 / letter-spacing 0.14em / color `var(--fg-subtle)` (past-due usages override size/letter-spacing per element tables above).

---

## Copy — verbatim strings (past-due only; externalize to `definitions/copy.ts`)

**PastDueBanner:**

- Headline: `Your card got declined`
- Sub: `— give it a refresh?`
- CTA label: `Update card`
- Dismiss aria-label: `Dismiss payment notice`
- Region aria-label: `Payment notice`

**Plan card past-due variant** (`${tierName}` ∈ Supporter | Founder | Premium; `${price}` ∈ $2 | $3 | $5; `${periodEnd}` e.g. "Jul 15"):

- Chip: `PAYMENT FAILED`
- Eyebrow rest: `${price} / MONTH · RETRYING`
- Headline: `Heads up. Your card got declined.`
- Body: `${tierName}'s still on. We'll keep retrying for about a week. Pop in a fresh card and nothing changes. If it can't go through by ${periodEnd}, ${tierName} pauses.`
- Punchline: `No drama. It just needs a working card.`
- Status rail label: `${tierName} pauses ${periodEnd} if the card isn't fixed`
- Status rail sub: `STRIPE IS RETRYING THE CHARGE`
- CTA primary: `Update card`
- CTA ghost: `Manage subscription`

**microcopy.jsx:** contains no past-due-specific strings — `LegalBlock`, `BottomMonoRail`, `PricePromiseLine` belong to the payment-surface/tier-card microcopy scope, not PR 4.3's past-due surfaces.

---

## Global omissions confirmed

- **No hover/focus styles** are defined anywhere in the past-due design source (buttons are `all: unset` + `cursor: pointer` only).
- **No transitions or transforms** are defined on any past-due element.
- **No z-index** values are specified; the pinned banner's stacking is by document order (top of app), and the README states past-due never takes over the screen.
- README's state coverage lives in prose (§ "State coverage" of READINESS + banner predicate section) rather than a table; every past-due row is captured in the State Coverage sections above.
