# Monetization — Email Touchpoints (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (`type: design, priority: normal, phase: beta`)
**Authored:** 2026-06-27
**Authors:** Hugh Hartigan, Claude (direct-write — 2 scope-locking questions)
**Related:**

- **Readiness Review:** `design/design_handoff_monetization/READINESS.md` (🔴 Red verdict, 2026-06-24) — items 4, 6, 11
- **Eng infra prerequisites:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (subscription-state event triggers, dunning timer, card-expiry timer, gift-ending timer) + [#849](https://github.com/HartiganHM/concert-crawl/issues/849) (Resend infrastructure ownership — orphaned by the closed [#773](https://github.com/HartiganHM/concert-crawl/issues/773); recommended resolution is folding into #775)
- **Sister addenda:** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (tier picker + entitlements matrix — ✅ done), [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle + management — ✅ done), [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y + microcopy — ✅ done)
- **Adjacent:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (Track 2 — logged-out broader UX)
- **Source briefs:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (#781) + `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md` (#780) + `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md` (#782)
- **Beta-to-Launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This brief locks the pre-Design decisions for the #783 email touchpoint addendum: which transactional templates we design now (vs. defer), the per-tier copy variation pattern, the voice split between casual and formal-leaning templates, dunning sequence cadence, gift-flow scope, and the HTML / plain-text deliverable shape Resend requires.

This is a **design brief**, not an eng spec. Subscription-state event listeners, dunning timer wiring, card-expiry pre-warning timers, and gift-ending timers all belong to #775. Resend template registration / SDK wiring is tracked in #849 — orphaned by the closure of #773, recommended resolution is folding into #775 since it bundles naturally with the subscription-state events #775 already owns. The in-app surfaces these emails reference (past-due banner, plan card variants, failure surfaces, takeover, day-13 banner) are locked in #780 / #782. Tier vocabulary, entitlements matrix, and price points are locked in #781.

## What Design will produce from this brief

Per #783's "Deliverables we expect" + this brief's amendments:

1. Hi-fi HTML templates (with plain-text fallback) for the 10 transactional emails in §1.
2. Per-template copy lock — subject line, preheader, body, footer.
3. Voice decisions log: when casual, when formal-leaning, and how to handle the gradient inside the dunning sequence.
4. Plain-text fallback for every template.
5. Per-tier variation for paid-welcome emails (`welcome_paid`) — 3 visual variants (Premium / Supporter / Founder) within one template family. Gifted welcome (`welcome_gifted`) is a separate template with its own visual treatment.
6. Mobile-first responsive HTML email design (320px baseline → ~600px max-width).

## Locked decisions

### 1. Template inventory — 10 transactional emails

| Key | Trigger (#775 owns) | Voice tilt | Per-tier? | Notes |
|---|---|---|---|---|
| `welcome_paid` | New subscription confirmed | Casual + warm | Yes — Premium / Supporter / Founder | Acknowledges the price they paid + what's unlocked for their tier. Founder version adds the badge / seat number. |
| `welcome_gifted` | Gift redeemed by recipient | Casual + warm | Single template | Names the gifter ("from {gifter_name}"), states the gift duration end date, sets expectations for what happens when the gift wraps. |
| `renewal_receipt_monthly` | Monthly renewal charge succeeds | Formal-leaning (tax record) | Single template w/ tier var | Designed with template variables (`{period_label}`, `{amount}`, `{tier_name}`, `{period_end}`) such that an annual variant is a copy-change away. **No separate annual template ships this cycle.** |
| `dunning_1_card_declined` | Renewal charge fails (Day 0) | Casual + helpful | Single template w/ tier var | Tone matches #782's failure surfaces — honest, not blamey. Primary CTA → Stripe portal. References the 7-day window. |
| `dunning_2_still_declined` | Stripe retry fails (Day 3–4) | Casual + slightly more urgent | Single template w/ tier var | Same shape as dunning_1, escalated tone. "Heads up — we're still trying to get this through." |
| `dunning_3_final_warning` | Final retry fails (Day 7) | Honest + direct | Single template w/ tier var | "Your card hasn't cleared — `{tier_name}` pauses tomorrow if we can't get a fresh one." No false urgency, no shame. |
| `card_expiring_soon` | Stripe customer card metadata exposes expiry; fire at 30 / 14 / 7 days out | Casual + helpful | Single template w/ tier var + days-remaining var | One template, three trigger windows. Microcopy adjusts via `{days_remaining}` var. |
| `cancellation_ack` | User cancels (in-app or portal) | Warm + gracious | Single template w/ tier var | Confirms cancel date + retention period (per #780 lifecycle). No win-back hook in this email — that's a separate touchpoint. |
| `gifting_ending_notice` | Gift expires in 7 days | Casual + warm | Single template | Names the gifter, names the end date, primary CTA → convert to paid (Premium / Supporter / Founder picker). |
| `winback` | 30–90 days post-cancel (#775 picks the exact day) | Casual + lightly nostalgic | Single template w/ tier var | **Basic shape only** — single hero copy block, single CTA. Borders on marketing; if/when we want a multi-stage win-back sequence, that's a separate ticket. |

Total: **10 templates** (welcome_paid counts as 1 template w/ 3 tier visual variants; dunning is 3 templates because the cadence/copy diverges; gifted welcome + gifting-ending are 2 distinct templates).

### 2. Annual renewal receipt — extensible, not designed now

**Locked:** Design `renewal_receipt_monthly` with template variables (`{period_label}`, `{amount}`, `{tier_name}`, `{period_end}`) that already accommodate an annual variant. **Skip a dedicated annual template until annual billing is on the roadmap.** When annual billing ships, the receipt is a copy-pass away — the visual chrome carries forward unchanged.

**Rationale:** Annual billing isn't on the near-term roadmap. Designing two templates now creates rot risk (annual chrome drifts from monthly chrome across future iterations) for a surface that may never ship.

### 3. Gifted-user emails — welcome + ending notice only

**Locked:** Two gift-related templates only:

1. `welcome_gifted` — fires when the recipient redeems the gift.
2. `gifting_ending_notice` — fires 7 days before gift expiry.

**Skipped:** Periodic check-in emails ("Still enjoying your gift?"). Those border on marketing (require an opt-in, sit on a different cadence engine, and would compete with the future Denver-shows roundup). When/if we add a marketing tier of gifted-user comms, that's #794 or a separate ticket.

**Rationale:** Transactional emails answer a state change. Welcome answers redemption; ending notice answers the conversion-moment 7 days out. Periodic check-ins answer neither — they're engagement marketing.

### 4. Voice split — casual default, formal-leaning for receipts

**Locked:** Sour Patch Kids voice is the default (matches #780/#781/#782/in-app voice — slight cheek + honesty rail + warmth). **Receipts** (`renewal_receipt_monthly`) skew slightly more formal because users may forward them to accountants for tax records — preserve dollar amount, charge date, plan name, customer ID, and Stripe receipt link in a structured block at the top. Body copy below that block can stay casual ("You're locked in until {period_end}!").

**Dunning gradient:** All 3 dunning emails are casual + honest, but tone escalates linearly: dunning_1 = "give it a refresh?", dunning_2 = "we're still trying", dunning_3 = "pauses tomorrow." No shame, no false urgency, never the word "fraud" (per #782's voice rule). Sour Patch all the way down.

**Cancellation_ack** stays warm + gracious. No win-back hook in the cancellation email — that's a separate touchpoint by design (jamming a sales pitch into a cancel confirmation is hostile).

### 5. Format — HTML with plain-text fallback, mobile-first responsive

**Locked:**

- Every template ships HTML + plain-text fallback. Resend requires it; many corporate filters demand it.
- HTML layout: **inline styles for all base layout** (Gmail strips most `<style>` blocks; Outlook desktop ignores or partially supports them). Table-based structure for cross-client safety.
- HTML responsiveness: **a single small `<style>` block in `<head>` for media queries** — the standard email pattern. Clients that honor it (Apple Mail, Gmail iOS, Gmail web for the same account-domain, most modern webmail) get the responsive treatment; clients that strip it (Gmail web cross-domain in some configs, Outlook desktop) fall through to the inline single-column layout. **Design degrades gracefully** — desktop layout is also legible on narrow viewports without the media query.
- Mobile-first: 320px baseline, `max-width: 600px` container, `@media (max-width: 600px)` adjusts to single-column / larger touch targets.
- Token vocabulary does NOT apply to email (clients strip CSS vars). Use a constrained inline palette: brand primary, neutral text gray, warning amber for dunning, success green for receipts. Document the email-only palette in the handoff.
- Logo: PNG (SVG support is spotty), retina-tagged, hosted on the CDN.
- Footer block: legal address + unsubscribe link (transactional emails are exempt from CAN-SPAM unsubscribe requirements, but include a "manage emails" link that lands on `/settings/notifications` for trust).

### 6. Subject line + preheader conventions

**Locked:** Every template specifies both. The preheader extends the subject — don't waste it as filler.

- Subject lines: 35–50 chars, sentence case, no emojis (transactional). No `[Concert Crawl]` prefix — sender name + brand recognition handle that.
- Preheader: 50–100 chars, completes or extends the subject's promise.

Examples (Design refines exact copy):
- `welcome_paid` subject: `You're in — Premium's live`
- `welcome_paid` preheader: `Concert history, calendar export, the lot. Here's what's unlocked.`
- `renewal_receipt_monthly` subject: `Receipt for your June renewal`
- `dunning_1_card_declined` subject: `Your card got declined — give it a refresh?`

### 7. Per-tier visual variation for welcome emails

**Locked:** `welcome_paid` is one template family with **3 tier-coded visual variants** (Premium / Supporter / Founder). `welcome_gifted` is a separate template (different surface, different copy goals) — covered separately below. Variation surface for `welcome_paid`:

- Color accent shifts per tier (matches the tier card accents from #781 — Premium signal, Supporter warm, Founder badge).
- Headline copy acknowledges the tier name + price paid.
- Body unlock list mirrors the entitlements matrix from #781.
- Founder variant adds the seat number ("You're #N of 100") + the lifetime founder badge in the header — matches the locked "Founder #N of 100" formatting from #781 (post-claim takeover).

**`welcome_gifted`:** Names the gifter + states the gift end date. Primary CTA → "Add a card for when this wraps" (soft, not pushy — first nudge toward conversion). Distinct from `welcome_paid` because the audience is different (recipient hasn't transacted), the conversion clock is different (gift-end vs renewal-cycle), and the body unlock list points forward to the wrap-up moment.

## What's NOT in this brief

| Concern | Owner |
|---|---|
| Resend template registration, sender domain, API integration | **Currently unowned** — #775 disclaims this via the now-closed #773. Tracked in [#849](https://github.com/HartiganHM/concert-crawl/issues/849) (recommended resolution: fold into #775 since Resend triggers bundle with the subscription-state event listeners it already owns). |
| Subscription-state event triggers (which webhook fires which template) | #775 |
| Dunning timer (when dunning_2, dunning_3 fire) + card-expiry pre-warning timer + gift-ending timer | #775 |
| `decline_code` → dunning template variable mapping | #775 (mapping); brief just locks the 3-email cadence shape |
| Marketing emails (Denver show roundups, weekly digests, artist drops) | Separate ticket — different opt-in surface |
| Account notifications unrelated to billing (e.g. follow notifications, watching reminders) | #737 (consumer notification UI / channel mix) |
| Multi-stage win-back sequence beyond the basic single-email shape | Future ticket — borders on marketing |
| Annual renewal receipt template | Deferred — see §2 |
| Periodic check-in for gifted users | Out of scope — see §3 |
| Admin / dispute / refund email tooling | Separate ticket (different audience) |
| Internationalization beyond required disclosures | Out of scope entirely |

## Decisions inherited

These remain locked from prior briefs and apply to #783's templates:

- **Voice = Sour Patch Kids.** Slight cheek + honesty rail + warmth.
- **Mobile-first** responsive (different mechanism for email vs. in-app, but the principle holds).
- **Definitions / copy.ts convention** — every customer-facing string in the templates externalizes at integration. Plan-PR-stage workstream grows with the ~10 templates × ~6 copy slots each ≈ 60 new copy slots.
- **No price escalation.** The price-promise locked in #782 is the contract; receipts honor it (the dollar amount on the receipt matches what they signed up at).

## Decisions logged for the handoff

The handoff README's "Decisions log" section should record these calls — they're the inputs Design works from:

- Template inventory = 10 transactional emails per the §1 table. Annual receipt deferred to a future copy-pass; periodic gift check-in skipped as out-of-scope marketing.
- Voice split = Sour Patch default; receipts skew slightly more formal for tax-record use; dunning sequence escalates linearly without shame.
- Format = HTML + plain-text fallback, inline styles only, table-based layout, mobile-first responsive, constrained inline palette (tokens don't apply to email).
- Per-tier variation = welcome_paid is a template family with 4 visual variants (Premium / Supporter / Founder / gifted).
- Subject + preheader specified per template; no `[Concert Crawl]` prefix; no emojis; preheader extends rather than fills.
- Cancellation ack is warm + gracious with no win-back hook. Win-back is a separate template, ships in basic single-email shape only.
- Footer block = legal address + "manage emails" link → `/settings/notifications` (trust signal, not CAN-SPAM compliance).

## Open for Design to call

These are decisions Design owns inside the locked frame:

- Exact visual chrome (logo treatment, footer styling, accent placement).
- Plain-text fallback structure — pure prose vs. lightly structured headers.
- Per-template hero shape (illustration vs. text-only).
- Dunning escalation visual cue (color shift? icon? messaging only?).
- Win-back hook angle (Denver-shows-you-missed, generic "we miss you", or new-tier-or-feature framing).
- Founder variant's badge / seat-number layout in the welcome header.
- Whether to include a "what's coming" teaser in welcome_paid (carousel of upcoming Denver shows the user might want to watch).

## Cross-references

- **Source brief #781:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md`
- **Source brief #780:** `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md`
- **Source brief #782:** `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md`
- **R5/R6 visual baseline:** `design/design_handoff_monetization_tier_states/`
- **#780 R2 visual baseline:** `design/design_handoff_monetization_lifecycle/`
- **#782 R2 visual baseline:** `design/design_handoff_monetization_failure_a11y_microcopy/`
- **Original visual handoff:** `design/design_handoff_monetization/`
- **Original Readiness Review:** `design/design_handoff_monetization/READINESS.md` (items 4, 6, 11 → addressed here)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
