# Monetization — Tier States + Entitlements Matrix (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (`type: design, priority: high, phase: beta`)
**Authored:** 2026-06-24
**Authors:** Hugh Hartigan, Claude (brainstorming-skill session)
**Related:**

- **Readiness Review:** `design/design_handoff_monetization/READINESS.md` (🔴 Red verdict, 2026-06-24)
- **Eng infra prerequisite:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (Stripe wiring, schema, entitlements helper, founder counter)
- **Sister addenda:** [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle/management), [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email touchpoints)
- **Spun off:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (Track 2 — Logged-out app UX, broader nav/header treatment)
- **Source design folder:** `design/design_handoff_monetization/`
- **Beta-to-Launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This brief locks the pre-Design decisions that gate the #781 handoff: tier vocabulary, gifted/Founder mechanics, paywall surface choices, and the per-tier × per-feature entitlements matrix. Design receives a coherent problem statement with the judgment calls already resolved, so the resulting handoff doesn't need a return trip for vocabulary disagreements or matrix ambiguity.

This is a **design brief**, not an eng spec. Stripe wiring, schema migrations, entitlement-helper plumbing, and seat-counter atomicity belong to #775. Subscription lifecycle (cancel, downgrade, renewal, trial-end timing) belongs to #780. Payment-failure surfaces, a11y annotations, and required microcopy belong to #782. Email touchpoints belong to #783.

## What Design will produce from this brief

Per #781's "Deliverables we expect" section, the final handoff must include:

1. Hi-fi mockups for the tier picker in every locked state (logged-out, free, supporter, premium, founder, gifted).
2. Founder claim-race-loser surface (locked: "Just missed it" → regular Premium offer).
3. Founder post-claim confirmation moment (locked: dedicated "Founder #N of 100" takeover → settings).
4. Plan card variant for gifted users (locked: thank-you copy, no Manage subscription, no Cancel).
5. The exhaustive per-tier × per-feature visibility matrix table (locked content below; Design owns the visual rendering).
6. Mobile + desktop parity throughout.

## Locked decisions

### 1. Tier vocabulary — six states

The picker, Plan card, and entitlements helper all operate on six user states:

| Code         | Display name                                  | Notes                                                                                             |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `logged-out` | (no display — visitor)                        | No account. Different surface than `free` because the conversion ask is "pick a tier," not "pay." |
| `free`       | Free                                          | Signed-in account, no subscription.                                                               |
| `supporter`  | Supporter                                     | $2/mo. Badge + concert history + calendar export (2026-07-29 amendment — see §6).                 |
| `premium`    | Premium                                       | $5/mo. Full feature set.                                                                          |
| `founder`    | Founder                                       | $3/mo locked forever. First 100 claimed at launch. Full feature set + Founder badge.              |
| `gifted`     | (internal code; display name owned by Design) | Lifetime Premium via Clerk `publicMetadata.plan = 'premium_gifted'`. No payment relationship.     |

Each state gets a tailored picker treatment and its own Plan card variant. Most states render within the standard tier picker: `free`, `supporter`, `premium`, and `founder` (during the launch window) each render as a tier card column; `logged-out` sees the same standard picker as the paywall surface per §5.2. `gifted` is the one _picker variant_ — the entire surface is replaced with a thank-you panel per §2, no tier cards rendered — because there's no upsell to render for someone on lifetime Premium.

**Pricing locked:**

- Free: $0
- Supporter: $2/mo
- Premium: $5/mo
- Founder: $3/mo locked forever (100 seats, claimable at public launch)

### 2. Gifted user mechanics

- **Tier picker (gifted):** Thank-you state only. A single panel with Sour-Patch gratitude copy ("You're already in — lifetime Premium, on us"). No tier cards rendered. Founder is hidden — gifted users already have lifetime Premium, claiming Founder makes no sense for them.
- **Plan card (gifted):** Gratitude-voice eyebrow ("Lifetime Premium · Beta"), body explaining they're comped, no "Manage subscription" CTA, no "Cancel any time" microcopy. No payment relationship to manage.
- **Dropdown badge (gifted):** Premium badge + optional small "Beta" sub-chip per Design's call.
- **Entitlements:** Identical to `premium` for every feature.

### 3. Founder mechanics

#### 3.1 Window timing

Founder opens at **public launch (~Aug 18–22)**, not at the beta wk 3 monetization ship. Reasoning:

- Beta users are gifted Premium. They wouldn't claim Founder (decided above).
- A Founder card visible during beta with no claim-eligible audience creates dead inventory and dilutes the launch-day scarcity moment.
- The handoff's "First 100 or 30 days, whichever comes first" countdown reads as launch-week marketing, not a beta wk 3 detail.

**Implication for Design:** During beta wks 3–7, the picker has no Founder column. At launch, the Founder column appears with the locked card design and the open-window scarcity rail. No "coming soon" placeholder state in beta — the column simply isn't there.

#### 3.2 Claim race — the loser

When a user taps "Become a Founder" and seat #100 was just claimed by someone else mid-tap (server-side atomicity reserves the seat before Stripe charges):

- **Surface:** Honest "Just missed it" full-bleed surface.
- **Copy direction:** Sour-Patch acknowledgment of the moment. Locked headline pattern: _"Founder filled up. You were seconds away."_ (Design owns final copy.)
- **Card status:** No charge. Stripe customer/checkout flow exits cleanly.
- **CTA stack:** Primary "Go Premium ($5/mo)" as the natural fallback. Secondary ghost "Back to plans" returns to picker (which now shows Founder in `closed` state).
- **No consolation pricing.** The race loser is offered regular Premium at $5/mo, not the locked $3/mo Founder price. Reasoning: rewarding intent with the Founder price erodes the scarcity that makes Founder a tier in the first place. Honesty over consolation.
- **Picker after this moment:** Founder card flips to the closed state for everyone. No more attempts possible.

#### 3.3 Claim race — the winner

When the user successfully claims Founder, the payment-success path lands them in a **dedicated takeover**, not the generic `state="success"` shared with Supporter / Premium:

- **Surface:** Full-bleed "Founder. Locked in." takeover (handoff's locked headline).
- **Seat number reveal:** "#37 of 100" or similar — a moment of personalized scarcity recognition that Premium / Supporter success states don't have.
- **$3/mo locked-forever stamp** and Founder badge preview prominently rendered.
- **CTA:** Single primary "Take me in." → auto-route to `/settings/plan` (or wherever the Plan card lives).
- **No confetti** — the takeover and seat-number reveal are the moment. Tokens stay tasteful per the "personality without overdoing it" principle in the handoff voice rules.

### 4. Gating philosophy — hybrid

When a user encounters a Premium-only feature on a non-Premium tier:

- **Active affordances** (visible UI elements that exist on the page even for Free users — Following button, Calendar export button): **visible-locked**. Render with a small lock + "Premium" chip. Tap opens the paywall surface. (Watching heart is a Free affordance for signed-in users per the 2026-06-25 amendment to §6 — see Supporter rationale below.)
- **Background features** (no UI affordance discoverable without explanation — Spotify sync, Alerts, Price drop alerts): **hidden**. They don't render as locked because there's no native surface to lock; they're configuration-level features that don't belong scattered as upsell prompts across the consumer UI.

Reasoning: hybrid gating preserves Premium discovery where it's natural (the user already shows intent by tapping a Following or Calendar export affordance) without cluttering Free with lock-chips on features they have no context for.

### 5. Paywall surface types

Two surfaces, both feature-anchored.

#### 5.1 Free → Premium paywall (mini)

When a `free` or `supporter` user taps a locked active affordance:

- **Mobile:** Bottom sheet.
- **Desktop:** Centered modal.
- **Content:** Feature-anchored headline ("Save shows you don't want to miss."), one-line benefit, primary CTA "Go Premium" deep-links to `/settings/plan` (the full tier picker), secondary "Maybe later" dismisses.
- **Scope:** Single CTA path. This sheet is for _upgrade_, not _signup_ — they already have an account.

#### 5.2 Logged-out → tier picker (full picker as paywall)

When a `logged-out` visitor taps a locked active affordance:

- **Surface:** The full tier picker is the surface. Not a mini sheet.
- **Feature anchor:** Picker shows feature-anchored copy at the top — _"Save shows you don't want to miss. Pick a tier. Sign in if you're already in."_ Design owns final copy + treatment.
- **Tier set:** Free / Supporter / Premium (+ Founder during the launch window).
- **Returning user:** Inline "Already have an account? Sign in" link.
- **Flow on selection:**
  - Pick Free → Clerk signup → returns to the same screen → follow affordance still locked → next tap shows the small Free→Premium paywall sheet (matrix-consistent with §4 above).
  - Pick Supporter → Clerk signup → Stripe checkout → returns → follow affordance still locked. Supporter unlocks concert history and calendar export, not following (§6); the next tap shows the same Free→Premium paywall sheet as the Free outcome above.
  - Pick Premium / Founder → Clerk signup → Stripe checkout → returns → follow affordance now active.

**Why this mechanic:** A logged-out user has two decisions to make (do you have an account? do you want to pay?). A mini paywall sheet implies one. The full picker tells the truth about both, lets the visitor self-select, and frames every premium affordance as the natural entry point to the value ladder. Locked in this brief — see "Round 8" discussion in session notes.

### 6. Entitlements matrix (canonical)

Cell value semantics:

- **`visible-active`** — Feature renders fully. User can interact normally.
- **`paywall-on-tap`** — Active affordance renders as visible-locked (lock + "Premium" chip). Tap opens the Free→Premium mini sheet (§5.1).
- **`tier-picker-on-tap`** — Active affordance renders as visible-locked. Tap opens the full tier picker with feature-anchored copy (§5.2).
- **`hidden`** — Feature does not render. No upsell affordance present in the consumer UI.

**Entitlement vs. UX routing.** The cell values combine two concerns: whether the user can use the feature (entitlement) and how the locked state surfaces (UX routing). For the runtime `canUseFeature(plan, feature)` helper (per #775), only `visible-active` returns true. The other three values all return false; they differ only in which surface the UI renders when the user attempts the feature (mini paywall sheet, full tier picker, or nothing). Eng treats the matrix as a single source for both questions: the boolean entitlement is the cell's truth value, the UX value tells the renderer what to do on the false case.

| Feature                        | logged-out         | free           | supporter      | premium        | founder        | gifted         |
| ------------------------------ | ------------------ | -------------- | -------------- | -------------- | -------------- | -------------- |
| **Watching** (heart)           | tier-picker-on-tap | visible-active | visible-active | visible-active | visible-active | visible-active |
| **Concert history** (attended) | tier-picker-on-tap | paywall-on-tap | visible-active | visible-active | visible-active | visible-active |
| **Calendar export**            | tier-picker-on-tap | paywall-on-tap | visible-active | visible-active | visible-active | visible-active |
| **Following** (artists)        | tier-picker-on-tap | paywall-on-tap | paywall-on-tap | visible-active | visible-active | visible-active |
| **Alerts** (push/email)        | hidden             | hidden         | hidden         | visible-active | visible-active | visible-active |
| **Spotify sync**               | hidden             | hidden         | hidden         | visible-active | visible-active | visible-active |
| **Price drop alerts**          | hidden             | hidden         | hidden         | visible-active | visible-active | visible-active |

**⚠️ AMENDED 2026-07-29 — Supporter unlocks Concert history and Calendar export.** The two cells above are marked `visible-active` for supporter. This reverses the original Premium-and-up call recorded in this brief, restoring the active-vs-passive split from the Beta-to-Launch spec: Supporter covers the features that run on infrastructure we already pay for, Premium covers the four with real ongoing cost (following, alerts, price-drop alerts, Spotify sync).

The original rationale, superseded and kept for the record, was: _"Supporter is a $2/mo 'thank you for keeping us alive' gesture. The reward is the Supporter badge, the eyebrow on the Plan card, and the warm feeling of supporting the project — not premium feature unlocks. If Supporter unlocked any Premium feature, the Premium tier's $5 ask becomes harder to justify."_

It was reversed because a $2 tier that unlocks nothing has no value proposition — a prospective Supporter may as well go Premium or stay Free, so the tier would draw near-zero sign-ups. Premium's four remaining unlocks carry the $5 ask on their own. Hugh's call.

**Beta-to-Launch tier table.** The original brief claimed to update `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md` in lockstep; it never did, so that spec's _Premium Features_ table still lists concert history and calendar export under Supporter — which this amendment makes correct again. No edit needed there.

**Amendment 2026-06-25 — Watching is Free for signed-in users.** Hugh amended the matrix during the R6 review: Watching (the heart) is a Free feature for every signed-in tier (`free` / `supporter` / `premium` / `founder` / `gifted`). `logged-out` still routes to the tier picker on tap because saving requires an account. Rationale: it's just tracking a show in a DB — cheap to operate, and the framing aligns with the Sour Patch honesty rail. Premium gating remains on the rest: Concert history (attending + history), Calendar export, Following, Alerts, Spotify sync, Price drop alerts. The amendment applies in lockstep with the R6 handoff (`design/design_handoff_monetization_tier_states/`).

**Logged-out rationale.** Logged-out users see the active affordances _visible-locked_ (same as Free), but tap routes to the full picker instead of the mini sheet. This is the locked "tiered ask" mechanic — every premium affordance is also a tier-picker entry point. Background features (Spotify sync, Alerts, Price drop alerts) stay hidden — they have no on-page affordance to lock against.

### 7. "Coming soon" — deliberate non-treatment

Tier cards display the **actually-shipped** Premium feature set at any given moment. There is no "coming soon" rendering, no "Spotify sync — coming Aug" eyebrow, no greyed-out future features on the card.

Reasoning: between beta wk 3 (when Stripe goes live) and launch (when Founder opens), Premium has no Free→Premium upgrade path — beta is invite-only and all beta users are gifted Premium. The only audience for the tier picker during this window are gifted users (who see the gratitude state, not the cards). By public launch, History (wk 4), Following, Alerts, and Spotify sync (wk 7) are all shipped, so the cards reflect reality from the moment any paying customer sees them.

This is deliberate: future-Design should not re-introduce "coming soon" treatment without verifying the schedule has shifted. If beta opens to paid signups, the question reopens.

## Deliberate exclusions (owned elsewhere)

These were considered and explicitly punted to other tickets. Future iterations should not pull them back into #781 without a coordinated re-scope:

| Concern                                                                         | Owner                                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Trial-end day-15 takeover timing                                                | #780 (subscription lifecycle + management)            |
| Cancel / downgrade / upgrade flows                                              | #780                                                  |
| Payment-failure states (3DS, decline, retry)                                    | #782 (failure states + a11y + microcopy)              |
| A11y annotations across the picker                                              | #782                                                  |
| Renewal receipt / welcome / dunning emails                                      | #783 (email touchpoints)                              |
| Stripe wiring, schema, entitlements helper plumbing                             | #775 (eng infra)                                      |
| Founder seat-counter data contract (poll / SSE / cache)                         | #775                                                  |
| `derivePlan` rewrite to check Clerk gifted metadata BEFORE Stripe               | #775                                                  |
| Logged-out broader UX (nav, header, browse-only mode, persistent signup nudges) | #794 (Track 2 design ticket spun off this brainstorm) |

## Decisions log (for Design's reference)

The following inherited decisions from the original handoff README remain locked. The Design round following this brief should not re-litigate them:

- Voice = Sour Patch Kids (slight cheek + gratitude).
- Cards carry personality (no banner hero).
- Founder urgency default = Medium; Loud opt-in only.
- Scarcity = seats + time, both visible, mono meta.
- Trial CTA defaults to inline on Premium card.
- Role-holders see the picker with the "You're in already" banner; Founder hidden (only purchasable from launch); Free hidden (no downgrade story for them); Supporter recoloured as voluntary. Headline shifts to "Wanna chip in?"
- Token-only colors. Every accent reads from `var(--signal)` / `var(--accent)`. Cross-theme parity required across all 9 themes.
- Tier copy table (taglines + rationales + CTAs) locked.
- Tier badges (cosmetic) + Role badges (utility) compose via `<BadgeRow tier role/>`.
- Tier details modal opens from each card's "See what's included" button.
- Current-plan stamp on whichever tier the user is on.
- Use existing `CCMark` — do not ship the local `MMark` copy.
- All Stripe Elements internals owned by Stripe; we render the container, summary rail, totals, and result states only.

New decisions locked by this brief:

- **Tier vocabulary** = 6 states (logged-out, free, supporter, premium, founder, gifted). `gifted` is treated as a picker _variant_ — the whole picker surface is replaced with a thank-you panel rather than rendered as a column — because there's no upsell to render.
- **Pricing** = Free $0, Supporter $2/mo, Premium $5/mo, Founder $3/mo locked forever.
- **Founder window timing** = public launch (~Aug 18–22). Hidden during beta.
- **Founder race loser** = honest "Just missed it" surface → regular Premium offer at $5/mo, no charge, no consolation pricing.
- **Founder post-claim** = dedicated "Founder #N of 100" takeover with seat-number reveal → auto-route to `/settings/plan`.
- **Gating philosophy** = hybrid (active affordances visible-locked, background features hidden).
- **Free→Premium paywall surface** = bottom sheet (mobile) / centered modal (desktop), feature-anchored, deep-links to picker.
- **Logged-out paywall surface** = full tier picker with feature-anchored copy + inline sign-in link. The picker IS the paywall.
- **Supporter entitlements** = badge + concert history + calendar export (2026-07-29 amendment; originally badge-only — see §6).
- **"Coming soon" rendering** = deliberately not used; tier cards show actually-shipped features only.

## Open questions deliberately left for Design

Items the brief intentionally does NOT lock — these are visual / copy / treatment calls Design owns:

- Exact copy for the gifted thank-you state ("You're already in" is illustrative, not locked).
- Exact copy for the race-loser surface ("Just missed it" / "Founder filled up. You were seconds away." is directional).
- Exact copy and seat-number rendering on the post-claim takeover ("Founder #37 of 100" formatting, sub-headline, badge animation).
- Whether the gifted dropdown badge carries a sub-chip ("Beta") or just reads as Premium.
- Visual treatment of the picker's "feature-anchored" headline mode (for both the mini sheet and the full picker as paywall).
- Picker layout on mobile when Founder is open vs. closed (column count shifts).
- Whether the active-affordance "Premium" chip is the same chip across surfaces (heart, follow, calendar export) or per-feature variants.

## Cross-references

- **Original handoff (visual source):** `design/design_handoff_monetization/`
- **Readiness Review verdict:** `design/design_handoff_monetization/READINESS.md` (🔴 Red, 2026-06-24)
- **Sister addenda this brief coordinates with:** #780 (lifecycle), #782 (failure states + a11y), #783 (email)
- **Eng infra spec:** #775
- **Spun-off ticket from this brainstorm:** #794 (Track 2 — Logged-out broader UX)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
