# Monetization — Failure States, A11y, and Required Microcopy (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (`type: design, priority: high, phase: beta`)
**Authored:** 2026-06-26
**Authors:** Hugh Hartigan, Claude (lighter brainstorming-skill session — 6 questions)
**Related:**

- **Readiness Review:** `design/design_handoff_monetization/READINESS.md` (🔴 Red verdict, 2026-06-24) — items 2, 7, 10
- **Eng infra prerequisite:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (Stripe wiring, decline_code mapping, customer portal endpoint, webhook events for failure cases, region detection for SCA disclosure)
- **Sister addenda:** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (tier picker + entitlements matrix — ✅ done), [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle + management — ✅ done), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email touchpoints)
- **Adjacent:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (Track 2 — logged-out broader UX)
- **Source visual baseline:** `design/design_handoff_monetization/` (original) + `design/design_handoff_monetization_tier_states/` (R6) + `design/design_handoff_monetization_lifecycle/` (R2)
- **Source briefs:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (#781) + `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md` (#780)
- **Beta-to-Launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This brief locks the pre-Design decisions for the #782 failure states + a11y + microcopy addendum: past-due UX (deferred from #780), payment failure category granularity, retry flow shape, price-change policy, the scope of the a11y annotation pass, and the placement of required legal microcopy.

This is a **design brief**, not an eng spec. Stripe wiring, `decline_code` → category mapping, region-detection for SCA disclosure, webhook handling for failure events, and the customer portal endpoint all belong to #775. Email touchpoints (including payment-failure-N emails and dunning sequence) belong to #783. Subscription lifecycle (cancel / downgrade / upgrade / past-due grace period mechanics) is locked in #780. Tier picker, entitlements matrix, and scarcity rail visuals are locked in #781.

## What Design will produce from this brief

Per #782's "Deliverables we expect" + this brief's amendments:

1. Hi-fi mockups for 5 payment failure surfaces (insufficient funds, expired/incorrect card, issuer declined, fraud block, network/timeout) + 2 challenge-mount surfaces (3DS, SCA) — mobile sheet + desktop modal each.
2. Past-due Plan card variant + dismissible per-session top-of-app banner.
3. Full a11y annotation pass across every monetization surface (per the matrix in §5 below).
4. Required microcopy regions on the payment surface (above-CTA legal block + bottom mono rail) and tier cards (price-promise line).
5. Mobile + desktop parity throughout.

## Locked decisions

### 1. Past-due UX

Stripe handles dunning automatically over a 7-day window after the renewal charge fails. During that window the user keeps their paid tier; if all retries fail, Stripe cancels the subscription and our webhook downgrades the user to Free. The in-app surface for this window:

- **Plan card past-due variant** — warning-toned eyebrow ("Heads up — your card got declined"), body explains the 7-day window in plain terms ("You've got a week before Premium pauses"), primary CTA `Update card` opens the Stripe portal (matches #780 hybrid management split where "Change payment method" is portal-bound). Tier badge + price stay in their normal locations.
- **Top-of-app banner** — thin strip across consumer surfaces (browse, event detail, settings — Design judges placement), same chrome pattern as #780's day-13 banner but warning-toned. Direction: "Your card got declined — give it a refresh?" + CTA `Update card` (→ Stripe portal) + dismiss X.
- **State:** `past_due_banner_dismissed_at` (timestamp, nullable). Per-session scope — dismissed banner re-renders on the next session open (unlike day-13 banner's per-trial-expiry persistence). Rationale: past-due is a recurring active alert during dunning; gentler nudge cadence than the trial-end's one-shot moment.
- **No takeover during the dunning window.** Past-due is a quiet-but-persistent signal, not an interrupt. If the 7 days expire and the user rolls to Free, that's the existing post-cancel-grace Free state from #780.

### 2. Decline reason granularity — 5 user-facing categories

Stripe gives us 20+ `decline_code` values per failed charge. We collapse them into **5 user-actionable categories**, each with bespoke copy + a next-action affordance. Eng infra (#775) owns the `decline_code` → category mapping.

| Category | When it fires (examples) | Next action affordance |
|---|---|---|
| **Insufficient funds** | `insufficient_funds` | Retry in place |
| **Expired or incorrect card details** | `expired_card`, `incorrect_cvc`, `incorrect_number`, `invalid_expiry_month`, `invalid_expiry_year` | Retry in place (Stripe Elements re-renders empty) |
| **Issuer declined** | `do_not_honor`, `generic_decline`, `card_velocity_exceeded`, `currency_not_supported`, most catch-all declines | Try a different card (reset in place) |
| **Fraud block** | `fraudulent`, `stolen_card`, `lost_card`, `pickup_card`, `restricted_card` | Try a different card — **no retry on same card affordance**. One-line contact-bank guidance ("It's worth a quick call to your bank") — not a CTA. |
| **Network / timeout** | network failure, Stripe-side timeout, request_timeout | `Try again` (in-place retry) + auto-retry-suggestion microcopy ("If this keeps happening, give it a minute and try again") |

**Voice rule across all 5:** Sour Patch — honest, not whiny, not blamey. Never surface the literal `decline_code` value. **Never use the word "fraud" in user-facing copy** for the fraud-block category — that's hostile to legit users whose bank flagged something they don't know about. Frame as "Card flagged for review" or similar.

### 3. Retry-with-different-card flow shape — hybrid

The right surface for retry depends on the user's context.

- **Active payment flow** (upgrade / trial conversion / first-time signup) → **reset PaymentSurface in place.** Same sheet/modal, decline state replaced by fresh PaymentElement, Stripe Elements re-renders empty. User stays in the payment flow without context switch.
- **Past-due context** (renewal failed; user is in the Plan card past-due variant or hit the banner) → **Stripe portal** (`Update card` CTA opens portal in new tab). Matches #780's hybrid management rule where "Change payment method" was already portal-bound. User is in "manage" mode mentally; voice break is justified.
- **Fraud block category** → no retry-same-card path. The only forward action is "try a different card" — which routes per the same rules above (in-place reset for active flow; portal for past-due).

### 4. Price-change policy — grandfather everyone forever

**Whatever price a user signs up at is locked for that user. Forever.** No price increases on existing tiers, ever.

Rationale (Hugh's framing, 2026-06-26 brainstorm): *"I don't plan on making a living on this project, it's a side project. If I cover my costs, that's great, if I can pay for my own concert tickets, that's an amazing bonus. I could see us charging individually for some sort of super premium feature or partnership something-something, but that seems so far away. I'm inclined to just keep the price where it is forever. If people want to pay more at some point, great, but I'm not really asking for it."*

**Implications:**

- **Founder's locked $3** (already locked in #781) is consistent with this policy, not an exception.
- **Future revenue** for new operational pressure comes from new paid features, partnerships, or higher tiers — **not** from price hikes on existing Supporter / Premium / Founder users.
- **Tier card microcopy** adds a price-promise line on all paid tier cards (Supporter, Premium, Founder). Direction: "Whatever you pay, you pay. We won't raise it." Design owns final wording in Sour Patch register.
- **No "subject to change with 30 days notice" legal disclaimer** on the tier cards or above-CTA legal block. Doing so would undermine the grandfather promise.

### 5. A11y annotation scope — full sweep

Design produces a per-surface annotation pass covering **every monetization surface across #781, #780, and #782**. Single comprehensive audit so eng can integrate WCAG AA correctly the first time.

Surfaces in scope + the key a11y concerns per:

| Surface | Owner round | Key annotations |
|---|---|---|
| **Tier picker — desktop matrix** | #781 | Reading order: tier name → price → tagline → features → CTA, column-by-column LTR. Render as semantic `<table>` with proper row/column headers (not a CSS grid of divs). `aria-current="page"` on the current-plan column. |
| **Tier picker — mobile accordion** | #781 R6 | `aria-expanded` + `aria-controls` already shipped. Add: `role="group"` on the accordion container, `aria-label` per row, focus moves to expanded content on open. |
| **Scarcity rail (Founder countdown)** | #781 | `aria-live="polite"` on seat count (NOT assertive — count updates shouldn't interrupt). Visually-hidden sentence pattern: "Founder seats remaining: 47 of 100. Window closes in 3 days." |
| **Mini paywall sheet** (Free→Premium upsell) | #781 R6 | `role="dialog"` + `aria-modal="true"` + focus trap. Focus returns to the locked affordance that opened it on close. |
| **Payment surface** | #780/#781 | `role="dialog"` + `aria-modal="true"`. Focus trap. Escape-to-dismiss with focus return. Stripe Elements owns its iframe's internal a11y; we annotate around it. Form labels associated with inputs. |
| **Settings Plan card** (all variants) | #780 | Inline — no trap. `aria-label` on each variant naming the current state (e.g., "Premium subscription, renews Jul 15"). Status rail uses `aria-live="polite"` for trial countdown updates. |
| **Cancel / downgrade / upgrade flows** | #780 | `role="dialog"` + focus trap on each sheet/modal. The `ChangesDisclosure` accordion gets `aria-expanded` + `aria-controls`. Proration math rows use semantic `<dl><dt><dd>` so screen readers read "Supporter, from today: two dollars per month" / "Credit toward next bill: two dollars fifty". |
| **Account-deletion sheet 1** (warning) | #780 | `role="dialog"` + focus trap. The "Gone for good" list uses `<ul>` with semantic items. |
| **Account-deletion sheet 2** (confirm-twice) | #780 | `role="alertdialog"` (destructive). Email input: `aria-label` + `aria-invalid` when not matching + `aria-describedby` pointing at the match-state line. Destructive button: `aria-disabled="true"` until match. |
| **Trial-ended takeover** | #780 | `role="alertdialog"` + `aria-modal="true"`. `aria-live="assertive"` announces "Your Premium trial has ended" on mount (this is the one place assertive is correct — it's a state transition the user needs to know about). Focus trap with Escape closing. The tier picker beneath inherits picker a11y. |
| **Day-13 banner** | #780 | `role="region"` + `aria-label="Trial ending nudge"`. Dismiss has `aria-label="Dismiss trial-end notice"`. `aria-live="polite"` (banner appears between sessions, not mid-session). |
| **Past-due banner** | #782 (this round) | Same pattern as Day-13: `role="region"` + `aria-label`. Dismiss `aria-label="Dismiss payment notice"`. `aria-live="polite"`. |
| **5 failure surfaces** + **2 challenge mounts** | #782 (this round) | Each: `role="alertdialog"` + `aria-modal="true"` + `aria-live="assertive"` for the error headline (it's an interrupt by definition). Focus moves to the primary action button (`Try again` / `Try a different card`). Escape dismisses to the picker. Network-timeout: an additional `aria-live="polite"` for the auto-retry-suggestion line. |

**Screen-reader walkthrough scripts** — Design ships short numbered scripts ("how a screen reader user navigates this surface") for three high-complexity surfaces:

1. **Tier comparison matrix** (desktop) — the reading order through a wide table is the most complex a11y surface in the monetization flow.
2. **Payment surface** — multiple form fields + the legal block + the bottom rail + the CTA + Stripe Elements iframe.
3. **Trial-ended takeover** — the announcement + the tier picker beneath + the dismiss path.

Other surfaces follow standard sheet/modal/banner patterns and don't need bespoke walkthroughs.

### 6. Required microcopy placement

Two regions on the PaymentSurface, plus a price-promise line on tier cards.

#### 6.1 Above-CTA legal block

Sits immediately above the primary CTA (`Go Premium`, `Pay`, etc.) on the PaymentSurface. Compact mono-eyebrow weight, low-density visual treatment (Design owns final styling).

**Structure:**

- (a) **ToS / Privacy / refund-policy links** — direction: "By going Premium, you agree to our [Terms](#) & [Privacy](#)." Refund policy linked separately or appended.
- (b) **Auto-renew disclosure** — required in CA, NY, and several EU jurisdictions per the original spec. Direction: "Auto-renews monthly. Cancel anytime."
- (c) **SCA-region notice** — conditional. Only renders for users in EU/UK/relevant regions. Direction: "Your bank may ask to confirm this." Region detection owned by #775.

Visual goal: legally sufficient, not visually loud.

#### 6.2 Bottom mono rail

The existing fine-print rail at the bottom of PaymentSurface stays where it lives. Carries **trust signaling**, not legal disclosures.

Current content: `Stripe handles cards · we never see them` + `Cancel any time`. Design may refine wording; placement and visual treatment stay.

#### 6.3 Tier card price-promise line

Added to all paid tier cards (Supporter, Premium, Founder) at launch. Reflects the grandfather-everyone-forever policy.

Direction: "Whatever you pay, you pay. We won't raise it." Design owns final wording in Sour Patch register. Could live in the rationale rail, the punchline slot, or a new microcopy line — Design's call. Founder card already has "$3/mo locked forever" as a stronger version of this same promise; Design judges whether the price-promise line duplicates that or replaces the locked-forever stamp.

## New surfaces — summary

| Surface | Mobile | Desktop | Round owner |
|---|---|---|---|
| Insufficient funds failure | sheet | modal | #782 |
| Expired/incorrect card failure | sheet | modal | #782 |
| Issuer declined failure | sheet | modal | #782 |
| Fraud block failure | sheet | modal | #782 |
| Network/timeout failure | sheet | modal | #782 |
| 3DS challenge mount | sheet | modal | #782 |
| SCA challenge mount | sheet | modal | #782 |
| Past-due Plan card variant | inline | inline | #782 |
| Past-due top-of-app banner | strip | strip | #782 |
| Above-CTA legal block | inline | inline | #782 |
| Tier card price-promise line | inline | inline | #782 |

## Locked from prior rounds — do not redesign

- **#781 R5/R6** — tier picker (all 6 states), founder race-loser + post-claim takeover, gifted thank-you panel + Plan card, entitlements matrix, mini paywall sheet, mobile accordion picker.
- **#780 R2** — all 9 Plan card lifecycle variants, Manage sheet, Cancel / Downgrade / Upgrade flows, account-deletion two-sheet, trial-ended takeover, day-13 banner.
- **R6 amendments** — Watching is Free for signed-in users, Supporter is badge-only, hybrid management split, immediate-switch proration, 90-day preserve-then-purge, etc.

#782's surfaces sit on top of these. They don't change the tier picker, don't change the matrix, don't redesign any locked surface. They add failure variants, past-due variants, a11y annotations, and microcopy regions.

## Open for Design to call (not locked)

- Exact decline copy in all 5 categories (Sour Patch register; Design owns final wording).
- Past-due banner exact wording + dismiss icon treatment.
- Tier card price-promise line exact wording (e.g., "Whatever you pay, you pay" vs "Your price never goes up" vs something else).
- 3DS / SCA chrome visual treatment around Stripe's iframe (Stripe owns the iframe internals; Design owns the surrounding container chrome, header copy, dismiss path).
- Auto-renew disclosure exact phrasing.
- SCA-region disclosure exact phrasing + which regions trigger it (#775 owns the region-detection eng; Design owns the trigger list and the per-region copy).
- Above-CTA legal block visual treatment (font, weight, color, link styling, line breaks).
- Whether the past-due Plan card replaces the standard "Manage subscription" CTA or sits alongside it.
- Screen-reader walkthrough script wording (Design provides the scripts; eng integrates the patterns).
- Whether to additionally surface the past-due banner copy on certain high-friction screens (e.g., the trial-ended takeover) or only on standard consumer surfaces.

## Deliberate exclusions (owned elsewhere)

These were considered and explicitly scoped to other tickets. Future iterations should not pull them back into #782 without a coordinated re-scope:

| Concern | Owner |
|---|---|
| Subscription lifecycle, cancel / downgrade / upgrade flows | #780 (✅ done) |
| Tier vocabulary, entitlements matrix, tier picker visuals, Founder seat counter, gifted comp mechanic | #781 (✅ done) |
| Email touchpoints (welcome / renewal-receipt / dunning sequence / payment-failed-N / cancel-ack / win-back / day-13 email / pre-purge) | #783 |
| Stripe wiring (Elements, customer portal endpoint, webhook handler) | #775 |
| `decline_code` → 5-category mapping logic | #775 |
| Region detection for SCA-region disclosure (which countries trigger the conditional notice) | #775 |
| Schema for `past_due_banner_dismissed_at` (per-session timestamp) + the past-due check at session start | #775 |
| Logged-out broader UX | #794 |
| Admin refund / dispute tooling | Separate ticket (different audience) |
| Internationalization beyond required disclosures (full translations) | Out of scope entirely |
| Refund flows | Separate ticket |
| Direct support / contact-us routing referenced in fraud-block surface | Existing project support channel (no new design needed; copy direction lives in the failure surface) |

## Decisions inherited

These remain locked from prior briefs and apply to #782's surfaces:

- **Voice = Sour Patch Kids.** Slight cheek + honesty rail. Failure surfaces lean on the honesty side ("Your bank said no" not "Oops! Try again!").
- **Token-only colors** across all 9 themes. Failure surfaces use `var(--danger)` / `var(--warning)` (warning for past-due, danger for fraud).
- **Mobile + desktop parity** for every surface.
- **Reuse existing atoms** from `monetization-shared.jsx` (`TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`, `DragHandle`, etc.).
- **Definitions / copy.ts convention** — all customer-facing strings externalize at integration. Plan-PR-stage workstream grows with the ~80 new copy slots from failure / past-due / microcopy surfaces.

## Decisions logged for the handoff

The handoff README's "Decisions log" section should record these calls — they're the inputs Design works from:

- Past-due UX = Plan card variant + dismissible per-session top-of-app banner (`past_due_banner_dismissed_at`).
- Decline reason granularity = 5 user-facing categories (insufficient-funds / expired-or-incorrect-card / issuer-declined / fraud-block / network-timeout). Stripe `decline_code` → category mapping owned by #775.
- Retry shape = hybrid (in-place reset for active payment flow, Stripe portal for past-due context, fraud-block has no retry-same-card path).
- Price-change policy = grandfather everyone forever. No price increases on existing Supporter / Premium / Founder users, ever. Tier cards add a price-promise microcopy line.
- A11y scope = full sweep across every monetization surface from #781, #780, and #782.
- Microcopy placement = above-CTA legal block (ToS / Privacy / refund / auto-renew / SCA-region) + bottom mono rail (trust signaling) + tier card price-promise line.

## Cross-references

- **Source brief #781:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (with R6 amendment)
- **Source brief #780:** `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md`
- **R5/R6 visual baseline:** `design/design_handoff_monetization_tier_states/`
- **#780 R2 visual baseline:** `design/design_handoff_monetization_lifecycle/`
- **Original visual handoff:** `design/design_handoff_monetization/`
- **Original Readiness Review:** `design/design_handoff_monetization/READINESS.md` (items 2, 7, 10 → addressed here)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
