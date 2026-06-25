# Monetization — Subscription Lifecycle + Management (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (`type: design, priority: high, phase: beta`)
**Authored:** 2026-06-25
**Authors:** Hugh Hartigan, Claude (brainstorming-skill session)
**Related:**

- **Readiness Review:** `design/design_handoff_monetization/READINESS.md` (🔴 Red verdict, 2026-06-24) — items 1, 6, 8
- **Eng infra prerequisite:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (Stripe wiring, schema, webhooks, customer-portal endpoint, 90-day-purge job)
- **Sister addenda:** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (tier states + entitlements matrix — ✅ done, R5/R6 merged), [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y + microcopy), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email touchpoints)
- **Adjacent:** [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (Track 2 — logged-out broader UX)
- **Source visual baseline:** `design/design_handoff_monetization/` (original handoff) + `design/design_handoff_monetization_tier_states/` (R6, post-R5/R6 merge)
- **Source brief for tier vocabulary + matrix:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (PR #795 + R6 amendment in PR #813)
- **Beta-to-Launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This brief locks the pre-Design decisions for the #780 subscription lifecycle + management addendum: where management lives (in-app vs Stripe portal), trial-end timing, cancel grace, proration approach, downgrade data handling, day-13 nudge, account deletion while subscribed, and the resulting Plan card variant matrix.

This is a **design brief**, not an eng spec. Stripe wiring, schema columns, webhook handlers, and the 90-day-purge background job belong to #775. Payment-failure / 3DS / past-due UX belongs to #782. Email copy and templates belong to #783. Tier vocabulary, entitlements matrix, and tier-picker surfaces are owned by #781 (now complete).

## What Design will produce from this brief

Per #780's "Deliverables we expect" + this brief's amendments:

1. New in-app surfaces for cancel, downgrade, upgrade, manage-subscription entry, account-deletion (with cancel-only off-ramp).
2. New Plan card variants for the lifecycle states locked below (active, trial day-13/14, cancel-grace, post-cancel-grace Free, post-trial-expired Free).
3. Trial-ended takeover with the locked next-session trigger + dismissal behavior.
4. Day-13 top-app banner (one session, dismissible, doesn't re-fire that day).
5. Mobile + desktop parity throughout.

## Locked decisions

### 1. Management philosophy — hybrid

In-app for emotional moments (where Sour Patch voice matters and retention plays a role). Stripe portal for tooling (where Stripe's edge-case coverage wins). Decision: **hybrid split.**

| Action | Owner |
|---|---|
| Cancel subscription | **In-app** (with light retention prompt) |
| Downgrade Premium → Supporter | **In-app** (with proration disclosure) |
| Upgrade Supporter → Premium | **In-app** (with proration disclosure) |
| Resubscribe (Free → paid tier) | **In-app** (the tier picker, owned by #781) |
| Account deletion while subscribed | **In-app** (with cancel-sub-only off-ramp) |
| Change payment method | **Stripe portal** (new tab) |
| View invoices / receipts | **Stripe portal** (new tab) |
| Change billing email | **Stripe portal** (new tab) |
| Update tax / region | **Stripe portal** (new tab) |

The "Manage subscription" CTA in the existing Plan card opens an in-app **Manage sheet** that lists all of the above options with route hints (a `→ portal` chip on the portal-bound rows). Design's call on the visual grouping — list-with-chips vs visually separated sections.

### 2. Trial-end timing — next session

Trial expires day 15. Instead of a hard takeover the moment day 15 ticks over, the takeover triggers on the user's **next session open**, regardless of route. Once shown and dismissed, it does not re-fire for the same trial expiry.

- **State:** `lastTrialEndedShownAt` (timestamp, nullable) on the user record. On session start, evaluate `trial_ends_at < now AND (lastTrialEndedShownAt IS NULL OR lastTrialEndedShownAt < trial_ends_at)` — show the takeover if true. Setting `lastTrialEndedShownAt = now` on render makes it single-fire (the check fails on subsequent sessions for the same trial expiry).
- **Dismissal:** the takeover dismisses to wherever the user was going. They can still browse Free; gated affordances render per the §6 matrix (`paywall-on-tap` or `tier-picker-on-tap` for active affordances, `hidden` for background features).
- **Re-trigger semantics:** if the user dismisses and stays Free for weeks, the takeover does NOT re-show on every session — it's a single explicit conversion moment. Subsequent re-engagement happens via the matrix's normal gating + Plan card variants + #783's email touchpoints.

### 3. Cancel mechanic — standard SaaS grace period

- **Mechanic:** in-app cancel sets Stripe `cancel_at_period_end=true`. User keeps their paid tier until the renewal date.
- **Grace UI:** Plan card flips to a "Cancel-grace" variant showing "Premium until Jul 15 · You won't be charged again" with an optional "Resubscribe" affordance.
- **Post-grace:** at the renewal date, Stripe webhook flips the user to Free. Plan card flips to "Post-cancel-grace Free" variant.
- **No refunds.** Aligns with industry standard; keeps the state machine simple.

### 4. Proration — immediate switch + Stripe-style credit

- **Upgrade Supporter → Premium mid-cycle:** charged the prorated difference for the remaining days immediately, Premium unlocks instantly. Confirmation surface shows the math ("$3.25 charged for the rest of this billing cycle").
- **Downgrade Premium → Supporter mid-cycle:** Supporter active immediately. Unused Premium days converted to **account credit** applied to the next bill. Confirmation surface shows the math ("$2.50 from your unused Premium days applied to next bill").
- **Implementation:** rides on Stripe's prorated invoice items. Eng infra (#775) handles the Stripe-side mechanics — design surfaces the user-facing disclosure.

### 5. Data on downgrade — 90-day preserve-then-purge

When a user downgrades from a Premium-and-up tier (Premium / Founder / Gifted) to Supporter or Free (via downgrade, cancel-grace expiry, or trial-end-without-upgrade), Premium-only data is preserved for 90 days, then purged by a background job.

| Data | Behavior |
|---|---|
| **Watching** (saved shows — the heart) | NEVER purged. Free for everyone signed-in per the R6 amendment to the §6 matrix. |
| **Concert history** (attended) | Preserved 90 days. After purge, the user's attended-show records are removed. Exact storage shape (`user_events` rows, status enum value, or new table) is #775's call. |
| **Following** (artists) | Preserved 90 days. After purge, `user_artist_follows` rows removed. |
| **Alerts** (new-show + price-drop) | Preserved 90 days (subscription state, prefs). After purge, prefs deleted; user is unsubscribed. |
| **Spotify sync** state | Preserved 90 days (Clerk OAuth token, last-sync timestamp). After purge, token revoked / disconnected. |

Re-upgrade within 90 days = instant restore (data was never deleted). Re-upgrade after purge = empty-state in the relevant surface.

**User communication:**

- **At downgrade:** the in-app downgrade confirmation surface includes a one-line note (e.g., "Your history, follows, and alerts stay safe for 90 days if you change your mind."). Design owns the exact copy + whether to show as a one-liner or as a separate "Here's what changes" disclosure.
- **Pre-purge (around day 80–85):** email touchpoint covered by #783.
- **Post-purge:** Plan card / surface treatment for the now-empty state is owned by the relevant feature surfaces (History, Following, etc.); no special "your data was purged" banner.

**Trigger clock:** 90 days starts at the **effective downgrade date** — meaning the date the user actually loses Premium access (= end of cancel-grace period for cancellations, = day 15 for trial-ends, = immediate-switch date for explicit downgrades). #775 implements the schema field (`premium_data_expires_at`) and the background job.

### 6. Day-13 trial nudge — Plan card + top-of-app banner

"Day 13" throughout this brief means the **24-hour window before `trial_ends_at`** — i.e., `trial_ends_at - 24h <= now < trial_ends_at`. Defining the trigger in elapsed-time-to-expiry terms rather than calendar days sidesteps the timezone ambiguity of "what day is it for the user?" and matches the timestamp comparisons already in §2.

- **Plan card variant:** the trial Plan card gains an emphasis eyebrow on day 13 + 14 — "Trial ends tomorrow · Lock it in" (day 13, ~24h remaining) / "Trial ends today · Lock it in" (day 14, ~12h remaining). Inline CTA on the card.
- **Top-of-app banner:** on the user's **first session in the trial's final 24 hours**, a dismissible top-of-app banner shows across consumer surfaces (browse, event detail, settings — Design judges placement) reading "Trial ends tomorrow — lock it in?" with a CTA that opens the tier picker.
  - **State:** `dayThirteenBannerDismissedAt` (timestamp, nullable). Show predicate: `trial_ends_at - 24h <= now < trial_ends_at AND (dayThirteenBannerDismissedAt IS NULL OR dayThirteenBannerDismissedAt < trial_ends_at - 24h)`. Set on first dismissal so the check fails for the rest of the window. Single-fire per trial expiry. (Whether to fire once more closer to expiry is Design's call; default no — Plan card day-14 emphasis + the eventual takeover are the remaining nudges.)
- **No takeover on day 13.** The trial-end takeover only fires after the trial actually expires (next session after `trial_ends_at`).

### 7. Account deletion while subscribed — in-scope with off-ramp

- **Trigger:** user navigates Settings → Delete account while their tier is Supporter / Premium / Founder.
- **First sheet (warning):** locked headline-direction "*You're on Premium until Jul 15.*" Body explains:
  - Deleting cancels the subscription effective immediately (no grace period — this overrides §3's default).
  - Removes everything: saved shows (Watching), Concert history, Following, account record, all data.
  - Cannot be undone.
- **Two CTAs prominently:** **[Cancel subscription only]** (ghost) routes to the in-app cancel flow (§3 grace path). **[Delete account]** (danger, signal/red) advances to the second sheet.
- **Second sheet (confirm-twice):** "Type your email to confirm" — user types their email, button enables on match, single destructive action.
- **On confirm:** eng calls `DELETE /v1/users/me` which now branches on subscription state — if the user has an active subscription, the Stripe subscription is canceled immediately (no proration credit since the user is leaving), the Stripe customer is deleted, the Clerk user is deleted, and the DB user record cascades. Exact SDK calls belong to eng infra (#775).
- **Gifted users:** same warning shape but the body adjusts ("You're on lifetime Premium — deleting cancels the comp and removes everything"). No Stripe customer to delete; Clerk + DB only.

### 8. Past-due — explicitly deferred to #782

The Plan card has **no past-due variant** designed in #780. Full payment-failure UX (3DS, retry-with-different-card, dunning, multi-card) lives in #782.

**Sequencing concern:** until #782 ships, the Plan card has no defined render for users in Stripe `past_due` state. The implementation plan must address one of:

- **Recommended:** ship #782's Plan card past-due variant in lockstep with or before #780's implementation.
- **Fallback:** during the gap, past-due users see "Active" on the Plan card (best-effort) and rely on Stripe's email dunning to inform them. Not ideal — user is under-informed in-app — but not catastrophic.

This concern belongs to the plan PR scheduling, not Design's surfaces.

## Plan card variant matrix

Design produces these variants on top of #781's existing Plan card shell:

| Variant | Trigger | Key elements |
|---|---|---|
| **Active Premium** | `tier=premium, status=active` | Existing R6 card + new "Manage subscription" CTA that opens the in-app Manage sheet |
| **Active Supporter** | `tier=supporter, status=active` | Same as Premium variant, voice/copy adjusted |
| **Active Founder** | `tier=founder, status=active` | Same shape + locked-forever stamp (from #781) |
| **Premium trial — day 1–12** | `tier=premium, on_trial=true, days_remaining > 2` | Existing R6 trial card + countdown eyebrow |
| **Premium trial — day 13** | `tier=premium, on_trial=true, days_remaining == 2` | Emphasis eyebrow "Trial ends tomorrow · Lock it in" + inline CTA |
| **Premium trial — day 14** | `tier=premium, on_trial=true, days_remaining == 1` | Emphasis eyebrow "Trial ends today · Lock it in" + inline CTA |
| **Cancel-grace** | `cancel_at_period_end=true, days_until_period_end > 0` | "Premium until {date} · You won't be charged again" + "Resubscribe" affordance + still shows Manage sheet |
| **Post-cancel-grace Free** | recently rolled to Free from cancel | "You were Premium until {date}. Come back?" — context eyebrow decays after Design-chosen window |
| **Post-trial-expired Free** | trial ended without upgrade | "Your trial ended. Want to upgrade?" — context eyebrow decays after Design-chosen window |
| **Gifted** | per #781 R6 | Locked from #781, untouched by #780 |

## New in-app surfaces

Design produces these (mobile sheet + desktop modal each):

### Manage subscription sheet

- **Entry:** tap "Manage subscription" CTA on the active Plan card.
- **Content:** a list of actions — Change plan (→ in-app tier picker), Cancel subscription (→ in-app cancel flow), Change payment method (→ Stripe portal), View invoices (→ Stripe portal), Change billing email (→ Stripe portal), Update tax / region (→ Stripe portal).
- **Portal-bound rows:** carry a route hint (`→ portal` chip or similar). Design's call on the visual grouping.

### Cancel flow

- **Entry:** "Cancel subscription" from the Manage sheet, OR the cancel-sub-only off-ramp from the account-deletion warning.
- **Single-screen confirmation surface** (per Hugh: "light retention").
- **Content:**
  - Headline (Sour Patch direction: "Stepping back?")
  - Date breakdown ("You'd keep Premium until Jul 15. You won't be charged again.")
  - One retention nudge (illustrative: "Did you know Supporter is $2 if Premium's the cost?") with a one-tap "Downgrade to Supporter" path that takes them out of the cancel flow into the downgrade flow.
  - Confirm CTA ("Cancel subscription") + ghost back-out.
- **On confirm:** the user's Stripe subscription is updated so `cancel_at_period_end=true`; user redirects back to the Plan card now in cancel-grace variant. Exact SDK call belongs to eng infra (#775).
- **Note:** the retention nudge copy is illustrative; Design owns exact wording.

### Downgrade flow (Premium → Supporter)

- **Entry:** Change plan from Manage sheet → select Supporter, OR the "Downgrade to Supporter" path from the cancel flow.
- **Single-screen confirmation surface.**
- **Content:**
  - Headline (e.g., "Switching to Supporter")
  - Proration disclosure: "Supporter is active right now. $X.XX from your unused Premium days will be applied to your next bill."
  - Data handling note: one-line ("Your history, follows, and alerts stay safe for 90 days if you change your mind.") OR a separate "Here's what changes" disclosure if Design wants more space. Design's call.
  - Confirm CTA + ghost back-out.
- **On confirm:** Stripe subscription updated, Premium → Supporter immediate, credit posted.

### Upgrade flow (Supporter → Premium)

- **Entry:** Change plan from Manage sheet → select Premium.
- **Single-screen confirmation surface.**
- **Content:**
  - Headline (e.g., "Going Premium")
  - Proration disclosure: "Premium unlocks now. $X.XX charged for the rest of this billing cycle."
  - Confirm CTA + ghost back-out.
- **On confirm:** Stripe subscription updated, Supporter → Premium immediate, prorated charge posted.

### Trial-ended takeover

- **Trigger:** next session open after `trial_ends_at` passed AND `(lastTrialEndedShownAt IS NULL OR lastTrialEndedShownAt < trial_ends_at)` — same predicate as §2 above.
- **Surface:** full-bleed takeover, dismissible.
- **Content:** "Trial's done. Pick a lane." headline. Beneath: the locked tier picker from #781 — Free / Supporter / Premium / Founder (if claimable). User picks → goes through normal flow. Dismiss returns to wherever they were navigating to.
- **State:** set `lastTrialEndedShownAt = now` on render so the check fails on subsequent sessions for the same trial expiry (single-fire).
- **Voice:** Sour Patch — honest about what ended without being whiny.

### Day-13 top-app banner

- **Trigger:** same predicate as §6 above: `trial_ends_at - 24h <= now < trial_ends_at AND (dayThirteenBannerDismissedAt IS NULL OR dayThirteenBannerDismissedAt < trial_ends_at - 24h)`.
- **Surface:** thin top banner across consumer surfaces. Compact text + CTA + dismiss X.
- **Content:** "Trial ends tomorrow — lock it in?" + "Go Premium" CTA + dismiss X.
- **CTA destination:** opens the trial conversion path (existing payment surface owned by the original handoff + the locked trial → Premium flow).
- **Dismissal:** sets `dayThirteenBannerDismissedAt = today`. Banner does not re-fire that day. (Design's call on whether it re-shows once on day 14 — default: no, since day 14 has its own Plan card emphasis treatment and day 15 brings the takeover.)

### Account-deletion warning surfaces

- **First sheet:** warning + dual CTAs (Cancel-sub-only off-ramp + Delete-account danger). Per §7 above.
- **Second sheet:** confirm-twice (type-email-to-confirm). Per §7 above.

## Locked from #781 — do not redesign

- Tier picker (all 6 states, mobile + desktop).
- Founder race-loser, post-claim takeover, gifted thank-you panel, gifted Plan card variant.
- Entitlements matrix (with the R6 Watching-on-Free amendment).
- Sour Patch voice rules, token-only colors, tier copy table, success-state headlines.

The lifecycle surfaces in this brief sit on top of #781's foundation — they don't change the tier picker, don't change the matrix, don't redesign any #781 surface. They add Plan card variants and net-new lifecycle-only surfaces.

## Open for Design to call (not locked)

The brief intentionally leaves these to Design:

- **Exact retention copy** on the cancel flow ("Did you know Supporter is $2..." is illustrative).
- **Day-13 banner placement** (top-of-app, near nav, inline event-card-style, etc.).
- **Cancel-grace eyebrow decay window** on the Post-cancel-grace Free Plan card — does the "You were Premium until Jul 15" context stay forever, fade after a month, or disappear at end-of-cycle-month boundary?
- **Downgrade disclosure shape** — one-line note inside the confirmation surface vs separate "Here's what changes" sheet.
- **Resubscribe affordance shape** — re-route to picker vs one-tap restore for recently-canceled users still inside grace.
- **Manage sheet visual grouping** — list-with-chips vs visually separated in-app-vs-portal sections.
- **Account-deletion warning copy** — exact phrasing of the warning headline and the off-ramp button text.

## Deliberate exclusions (owned elsewhere)

These were considered and explicitly scoped to other tickets. Future iterations should not pull them back into #780 without coordinated re-scope:

| Concern | Owner |
|---|---|
| Past-due / payment-failure UX, 3DS / SCA challenges, retry-with-different-card, multi-card edge cases | #782 |
| A11y annotations across the new lifecycle surfaces (focus traps, ARIA, screen-reader walkthrough) | #782 |
| Required microcopy disclosures (auto-renewal, SCA-region, price-change policy) | #782 |
| Welcome / renewal-receipt / dunning / cancel-ack / win-back emails (incl. day-13 email, pre-purge email) | #783 |
| Stripe wiring (checkout, customer portal endpoint, webhook handler) | #775 |
| Schema expansion (`cancel_at_period_end`, `trial_ends_at`, `last_trial_ended_shown_at`, `day_thirteen_banner_dismissed_at`, `premium_data_expires_at`, `downgrade_credit_balance`) | #775 |
| The 90-day-purge background job + the trial-end check + the day-13 banner trigger evaluation | #775 |
| `DELETE /v1/users/me` Stripe-cleanup branch | #775 |
| Tier vocabulary + entitlements matrix + tier picker surfaces | #781 (✅ done) |
| Founder seat counter, gifted comp mechanic | #781 (✅ done) |
| Logged-out broader UX (nav, header, browse-only) | #794 |
| Admin refund tooling | Separate ticket (different audience) |

## Decisions inherited

These remain locked from the #781 brief + R5/R6 handoffs and apply to #780's surfaces:

- **Voice = Sour Patch Kids.** Slight cheek + gratitude + honesty rail.
- **Token-only colors** across all 9 themes (Electric, Jade, Light, Pulse, Forge, Blue Note, Drip, Cedar, Gloss).
- **Mobile + desktop parity** for every surface.
- **Reuse existing atoms** from `monetization-shared.jsx` (`TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`, etc.).
- **Definitions / copy.ts convention** — all customer-facing strings externalize at integration time per `feedback_definitions_copy_rule`. Not Design's job to fix; plan-PR-stage workstream that grows with each new lifecycle surface.

## Decisions logged for the handoff

The handoff README's "Decisions log" section should record these calls — they're the inputs Design works from:

- Management split = hybrid (in-app for emotional, Stripe portal for tooling).
- Trial-end timing = next-session takeover, dismissible, single-fire.
- Cancel mechanic = `cancel_at_period_end=true`, standard SaaS grace, no refunds.
- Proration = immediate switch + Stripe credit.
- Data on downgrade = 90-day preserve-then-purge (Watching exempt).
- Day-13 nudge = Plan card emphasis + one-time top-app banner.
- Account deletion in scope; cancel-sub-only off-ramp required.
- Past-due deferred to #782; sequencing risk flagged for plan PR.

## Cross-references

- **Source brief:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (with R6 amendment)
- **R5/R6 visual baseline:** `design/design_handoff_monetization_tier_states/`
- **Original visual handoff:** `design/design_handoff_monetization/`
- **Original Readiness Review:** `design/design_handoff_monetization/READINESS.md` (items 1, 6, 8 → addressed here)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
