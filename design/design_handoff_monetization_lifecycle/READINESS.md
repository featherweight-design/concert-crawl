# Readiness Review — Monetization Subscription Lifecycle + Management (#780 · Round 2)

**Verdict:** 🟢 Green — ready for plan PR (modulo sister addenda + eng infra still gating the monetization plan PR overall)
**Audited:** 2026-06-25
**Auditor:** Claude (autonomous Track 2 parity-gate Readiness Review, two-round audit)
**Audited handoff:** `design/design_handoff_monetization_lifecycle/` (Round 2)
**Source brief:** `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md` (PR #817, merged 2026-06-25)
**Related ticket(s):** [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (the source ticket — subscription lifecycle + management). Sister addenda still gating the plan PR: [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email), [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (eng infra). Already-closed sister addendum: [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (tier picker + entitlements matrix), [#800](https://github.com/HartiganHM/concert-crawl/issues/800) (R5/R6 addendum). Sister Track 2: [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (logged-out broader UX).
**Plan PR target:** TBD — blocked on #782, #783, #775 closure. Path when ready: `docs/superpowers/plans/<date>-monetization-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

## Summary

Two-round audit, both rounds run during a single chat-session feedback loop. **R1 verdict was 🟡 Yellow with two findings; R2 closed both cleanly and the handoff is now at Green.** Design's iteration was tight — both fixes shipped with code-level rigor and explicit decisions-log entries documenting the calls. Voice (Sour Patch, slight cheek + honesty rail) lands particularly well on the emotionally-loaded surfaces (cancel "Stepping back?", gifted plan card body, account-deletion sheet's one wry line). The 7→8-entry decisions log + the "Locked decisions honored" section give a clear traceability chain back to the brief.

## R1 → R2 closure

| R1 finding | Severity | R2 resolution |
|---|---|---|
| `CancelFlow` was Premium-only — hardcoded `$5 → Supporter $2` retention and Switch-to-Supporter off-ramp didn't apply to a Supporter user canceling | Medium | ✅ `CancelFlow({ variant, tier, periodEnd })` now takes a `tier` prop. `isPremiumUp = tier === "premium" \|\| tier === "founder"` gates the retention block. Supporter cancel uses a thinner flow (confirmation + date breakdown only, no down-sell because there's no cheaper paid tier, no 90-day data note because Supporter is badge-only per the §6 matrix). Founder cancel uses `$3 → Supporter's $2` instead of `$5 → Supporter's $2`. Documented in decisions log entry #6. |
| Cancel flow CTA hierarchy diverged from brief without decisions-log call-out | Low-Medium | ✅ Reverted to brief default. "Cancel subscription" = `kind="primary"` with `accent="var(--danger)"`; "Never mind — keep {tierName}" = `kind="ghost"` back-out. Code comments + decisions log entry #7 explicitly cite the brief and Design's reasoning: *"retention already lives in the nudge card above, and burying the cancel button to win retention reads as a dark pattern. Honesty rail > friction."* That's the right read of the voice. |

## Per-dimension findings (R2)

### 🗺️ Scope clarity

- ✅ All brief deliverables present and named in the R2 README's "What's here" table. Plan card variants, Manage subscription sheet, Cancel / Downgrade / Upgrade flows, Trial-ended takeover, Day-13 banner, Account-deletion two-sheet (with gifted variant).
- ✅ "Out of scope" section properly maps to the sister tickets: #782 (a11y + failure), #783 (email), #775 (eng infra), #781 (already closed). Matches the brief's deliberate-exclusions table.
- ✅ "Sequencing risk" note in Dev/handoff section explicitly carries forward the brief §8 past-due gap and flags it for the plan PR scheduling.
- ✅ Decisions log expanded from 7 → 8 entries to record the R2 calls; both calls explicitly reference the brief and explain the reasoning.

### 🎭 State coverage

- ✅ All 9 Plan card variants render (active Premium / Supporter / Founder, trial early / ends-tomorrow / ends-today, cancel-grace, post-cancel-grace Free + decayed variant, post-trial-expired Free).
- ✅ All 7 new in-app surfaces ship both variants (mobile sheet + desktop modal each): Manage subscription sheet, Cancel flow (now with Premium / Founder / Supporter variants per R2), Downgrade flow, Upgrade flow, Trial-ended takeover, Day-13 banner, Account-deletion two-sheet.
- ✅ Trial-ended takeover correctly handles the Founder-window-closed case via `r5VisibleTiers(founderState, "free")` — inherits the closed-window fix that landed in PR #813.
- ✅ Account-deletion gifted body variant renders the "You're on lifetime Premium" framing without the renewal-date language.
- ✅ Cancel-grace Plan card includes "Resubscribe" as a one-tap auto-renew restore (Design's call per decisions log #3 — user never lost access during grace, so no checkout trip needed).
- ✅ Day-13 banner ships both pinned-strip (primary) and inline (rounded-card) variants.

### 🔌 Data contract

- ✅ `LifecyclePlanCard` resolver pattern is clean: `user.lifecycle` enum (`active | trial | cancel-grace | post-cancel-grace | post-trial-expired`) + `trialPhase` (`early | ends-tomorrow | ends-today`) + `decayed` boolean. Matches brief vocabulary verbatim.
- ✅ `CancelFlow` now takes `tier` to drive the two-shape mechanic (Premium/Founder retention block vs Supporter thinner flow). Clean prop signature.
- ✅ `DeleteWarningSheet({ variant, gifted, periodEnd })` — gifted prop gates the body variant. `DeleteConfirmSheet({ variant, email })` — real input with case-insensitive exact-match gating the destructive button.
- ✅ Trial-end trigger logic explicitly deferred to eng (`last_trial_ended_shown_at` referenced in dev notes); the design surface doesn't try to own the trigger evaluation.
- 🟡 Day-13 banner doesn't expose a dismiss handler in the prop signature — purely visual. Eng will need to wire the `day_thirteen_banner_dismissed_at` write at integration. Brief covers this; not a Design gap.

### 🧱 Codebase fit

- ✅ Token-only colors verified across all new R2 files. Every accent reads from `var(--*)`. Spot-checked across `lifecycle-plan-cards.jsx`, `lifecycle-manage.jsx`, `lifecycle-flows.jsx`, `lifecycle-deletion.jsx`, `lifecycle-takeover.jsx`.
- ✅ All 9 themes inherited from #781's `theme-context.jsx` (verbatim copy). Theme parity section in the canvas (Section 10) covers Light / Pulse / Forge / Drip spot-checks.
- ✅ Atom reuse: `TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`, `DragHandle`, `MMark` all consumed from the existing `monetization-shared.jsx`. Locked #781 picker (`TierStateCard`, `TierRowMobile`) reused for the trial-ended takeover — not reskinned.
- ✅ Two new internal primitives: `CardStatusRail` (trial countdown / winding-down) in `lifecycle-plan-cards.jsx`, `ChangesDisclosure` (downgrade's expand-to-detail card) in `lifecycle-flows.jsx`, `PortalChip` (Stripe-portal-bound row marker) in `lifecycle-manage.jsx`. None reinvent existing atoms; all could be promoted into `monetization-shared.jsx` later for cross-surface reuse.
- ✅ `DeleteConfirmSheet` uses a real `<input>` with React state and case-insensitive exact-match validation — solid prototype semantics; eng can copy the pattern at integration.
- 🟡 Customer-facing copy is hardcoded in JSX (inherited convention violation). Plan PR must externalize to `apps/web/src/components/monetization/definitions/copy.ts` per `feedback_definitions_copy_rule`. Volume now significantly larger than the original handoff — probably 150+ new copy slots across the lifecycle surfaces, retention nudges, account-deletion warnings, etc. Plan-PR-stage workstream.

### ♿ Cross-cutting

- 🟡 **A11y still owned by #782 entirely.** Same gap as inherited from R5/R6: no `aria-expanded` on the `ChangesDisclosure` accordion, no focus trap docs on the new sheet/modal surfaces, no `aria-live` announcement plan for the trial-ended takeover. Not a new gap from R2; #782 covers the whole monetization a11y baseline.
- 🟡 **Day-13 banner doesn't ship analytics events.** Eng wires PostHog event (`day_thirteen_banner_shown` / `day_thirteen_banner_dismissed` / `day_thirteen_banner_cta_tapped`) at integration. Owned by #775 / plan PR.
- 🟡 **No new microcopy disclosures** added at R2 (e.g., auto-renewal disclosure on the trial-ended takeover, SCA-region notice on the upgrade flow). #782 covers required-microcopy.

### ⏰ Drift from reality

- ✅ R2 honors the merged #780 brief on every locked decision. The decisions log explicitly cites brief sections for each call.
- ✅ R6 amendments from #781 honored — Watching is rendered as Free in the cancel-grace fine print ("your history, follows, and alerts stay safe for 90 days" omits Watching because it's never purged).
- ✅ Sour Patch voice anchors preserved: "Stepping back?", "On the house", "$3 a month, never goes up", "We don't forget that".
- ✅ Sequencing concern around #782 / past-due correctly carried forward in Dev/handoff notes.

### 📝 Decision log

- ✅ 8-entry decisions log covers every "Open for Design to call" item from the brief PLUS the two R2 calls (Supporter `CancelFlow` shape + reverted CTA hierarchy). Each entry traces back to a brief section and explains the reasoning.
- ✅ Reconciliation prose for the R2 CTA-hierarchy revert is exemplary — names the brief, names the R1 inversion, names why it was reverted, and offers "Easy to flip if you'd rather lead with Keep" as the path back. That's the right level of Design-eng dialogue.

## Deliberate exclusions (unchanged from brief)

- Past-due / 3DS / SCA / retry / multi-card, a11y annotations, required microcopy disclosures → #782
- Welcome / renewal / dunning / cancel-ack / win-back / day-13 / pre-purge emails → #783
- Stripe wiring, schema, webhooks, 90-day-purge job, trial-end check, banner trigger eval, `DELETE /v1/users/me` Stripe cleanup → #775
- Tier picker visuals + entitlements matrix → #781 (✅ done)
- Logged-out broader UX → #794

## Open observations (no addendum required)

- The CancelFlow's Founder retention nudge ("$3 → Supporter's $2") is the right read of the matrix but is also a substantial value gap pitch — a Founder is losing their locked-forever $3 price, not just stepping to a cheaper plan. Optional polish: have Design consider whether the Founder cancel surface should additionally warn that the $3 lock is forfeit on cancel. Not a blocker; raise with Design only if Hugh wants the explicit callout.
- The trial-ended takeover's dismiss path uses both a top-right `×` icon AND a "Keep browsing on Free →" bottom link. Both work; the latter is semantically clearer for screen readers (when a11y lands in #782). Either is fine.

## Next step

Plan PR remains blocked on #782, #783, #775 closure. The #780 design cycle is now complete; the handoff and this verdict can both land as the canonical artifacts for this addendum.

This verdict supersedes nothing — it's the Track 2 parity gate per `docs/superpowers/design-pipeline.md`.
