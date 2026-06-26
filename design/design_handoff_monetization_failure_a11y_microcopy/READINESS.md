# Readiness Review — Monetization Failure States, A11y, and Required Microcopy (#782 · Round 2)

**Verdict:** 🟢 Green — ready for plan PR (modulo sister tickets still gating the monetization plan PR overall)
**Audited:** 2026-06-26
**Auditor:** Claude (autonomous Track 2 parity-gate Readiness Review, two-round audit)
**Audited handoff:** `design/design_handoff_monetization_failure_a11y_microcopy/` (Round 2)
**Source brief:** `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md` (PR #823, merged 2026-06-26)
**Related ticket(s):** [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (the source ticket — failure states + a11y + required microcopy). Already-closed sister addenda: [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (tier picker + entitlements matrix), [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle + management), [#800](https://github.com/HartiganHM/concert-crawl/issues/800) (R5/R6 addendum). Sister addenda still gating the plan PR: [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email touchpoints), [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (eng infra). Sister Track 2: [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (logged-out broader UX).
**Plan PR target:** TBD — blocked on #783, #775 closure. Path when ready: `docs/superpowers/plans/<date>-monetization-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

## Summary

Two-round audit. **R1 verdict was 🟢 Green with one Low finding; R2 closed it cleanly.** Design's R1 iteration was already remarkably tight — the README explicitly addressed all 11 "Open for Design to call" items with rationale, the past-due banner predicate matched the brief verbatim, a11y wiring was real (`role="alertdialog"` + `aria-live="assertive"` on failure headlines, `polite` on guidance / banner, `aria-current="true"` not `"page"` on the current-plan column), and voice landed in the honesty-side Sour Patch register the brief locked. R2 picked up the single Low finding (tier-name hardcoding in the past-due Plan card body + statusRail) with a surgical fix that introduced a `tierName` variable alongside the existing `price` ternary.

## R1 → R2 closure

| R1 finding | Severity | R2 resolution |
|---|---|---|
| Past-due Plan card body + statusRail hardcoded "Premium" though past-due can fire for Supporter and Founder (`lifecycle-plan-cards.jsx:65-67`) | Low | ✅ Introduced `tierName` variable mirroring the existing `price` ternary (`pdTier === "supporter" ? "Supporter" : pdTier === "founder" ? "Founder" : "Premium"`) and swapped into all three "Premium" sites in the past-due variant: body's two references ("${tierName}'s still on" + "${tierName} pauses") and the statusRail label. Bonus refactor: factored `pdTier` so the free→premium fallback variable doesn't get reused inline. Clean. |

## Per-dimension findings (R2)

### 🗺️ Scope clarity

- ✅ All brief deliverables present and named in the R2 README's "What's here" table. 5 failure surfaces, 2 challenge mounts (3DS / SCA), past-due Plan card variant + banner, microcopy regions (above-CTA legal block + bottom mono rail + tier-card price-promise line), full a11y annotation sweep (overlays for #782 surfaces + back-annotation table for #781/#780 + 3 SR walkthrough scripts).
- ✅ "Out of scope" section properly maps to the sister tickets: #780 (✅ done), #781 (✅ done), #783 (email), #775 (eng infra incl. `decline_code` → category mapping, region detection, past-due session-state schema, customer-portal endpoint, failure webhooks), #794 (logged-out), separate ticket for admin refund tooling, Stripe portal for multi-card, out entirely for i18n beyond required disclosures.
- ✅ "Sequencing risk" note in Dev/handoff section explicitly carries forward the brief's note that #782's past-due Plan card should ship in lockstep with or before #780's implementation so `past_due` users aren't shown a stale "Active" card during the gap. Resolves the gap #780 §8 flagged.
- ✅ Decisions log addresses all 11 "Open for Design to call" items from the brief; each entry references the brief and explains the reasoning.

### 🎭 State coverage

- ✅ All 5 failure categories render in both mobile sheet + desktop modal variants: `insufficient_funds`, `expired_or_incorrect_card`, `issuer_declined`, `fraud_block`, `network_timeout`. `FAILURE_CONFIG` is the canonical copy map.
- ✅ Both challenge mounts (3DS / SCA) render with consistent chrome — dashed Stripe-iframe slot + lock glyph + "we never see it" framing + "don't close this window" + Cancel path.
- ✅ Past-due Plan card variant renders for all three paid tiers post-R2 fix (Supporter / Premium / Founder). Falls back to Premium when somehow lifecycle=past-due with tier=free (an impossible state in production but defensively handled).
- ✅ Past-due banner ships both variants: pinned strip (primary, full-bleed across top of app) + inline inset (rounded card, drops under app bar).
- ✅ Microcopy renders correctly per region: above-CTA legal block ships default (no SCA) + SCA-region variant; bottom mono rail refined; tier-card price-promise line shows on Supporter + Premium with founder-reinforcement variant.
- ✅ `network_timeout` correctly keeps the entered card (no fresh Stripe Elements slot) and ships a `polite` live region for the "give it a minute" guidance — both per the R1 review notes that landed in the chat thread.

### 🔌 Data contract

- ✅ `FAILURE_CONFIG` keys exactly match the brief's 5 category slugs (`insufficient_funds`, `expired_or_incorrect_card`, `issuer_declined`, `fraud_block`, `network_timeout`).
- ✅ `decline_code` → category mapping correctly deferred to #775 with example codes listed per category as guidance only (brief §2 lock).
- ✅ Past-due banner show predicate documented in `past-due.jsx` header verbatim from the brief:
  ```
  subscription.status = "past_due"
  AND (past_due_banner_dismissed_at IS NULL
       OR past_due_banner_dismissed_at < session_started_at)
  ```
  Plus the active-payment-flow suppression rule from the prompt response.
- ✅ `PRICE_PROMISE` map has correct keys (`supporter`, `premium`, `founder` — no `free` since brief explicitly limits to paid tiers). Founder copy reinforces rather than duplicates the locked-forever stamp.
- ✅ `PaymentSurface` extended cleanly with `scaRegion` and `showLegal` props; both default-true / false-respectively to preserve the original surface's contract.
- ✅ `lifecycle-plan-cards.jsx` past-due branch returns the canonical lifecycle-content shape with `pastDue: true` flag for downstream consumers + `ctaAccent` separate from `accent` to preserve the CTA-token rule (button stays `--signal` even when card tone is `--warning`).
- 🟡 Banner's `Update card` button doesn't expose an explicit `href` or click handler in the prototype — eng wires the Stripe customer portal redirect at integration. Not a Design gap; just flagging for traceability.

### 🧱 Codebase fit

- ✅ Token-only colors verified across `failure-surfaces.jsx`, `past-due.jsx`, `microcopy.jsx`, `lifecycle-plan-cards.jsx`, `a11y.jsx`. Every accent reads from `var(--*)`. Spot-checked `--danger` (blocking failures), `--warning` (past-due), `--signal` (CTAs across both), `--fg-on-accent` (button text), `--fg-subtle` (legal microcopy), `--accent` (price-promise card outline), `--border-strong` (separators).
- ✅ CTA token rule respected throughout: card tone carries the message (`--danger` on failure messaging, `--warning` on past-due card), but every forward-action button stays `--signal`. Never a verb on a red button.
- ✅ All 9 themes inherited from #781's `theme-context.jsx` (verbatim copy).
- ✅ Atom reuse: `TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`, `DragHandle`, `MMark`, `TIERS`, `TierSummaryRail`, `TotalsBlock`, `StripeElementsSlot`, plus `getFounderState` for any tier-context derivation — all imported from the canonical `monetization-shared.jsx` via `window.*`. No reinvention.
- ✅ Two new internal primitives in `a11y.jsx` (`A11yPin`, `A11yLegend`) cleanly composed into the `<AnnotatedFailure>` / `<AnnotatedChallenge>` / `<AnnotatedPastDue>` composites. Could be promoted into shared atoms later if a11y annotation patterns get reused.
- ✅ `monetization-payment.jsx` and `lifecycle-plan-cards.jsx` are explicitly marked as `#782-extended copies` in the README so eng knows the originals stay locked. Diffs are small and commented (`#782 EXTENSION` / `#782 addition`).
- 🟡 Customer-facing copy hardcoded in JSX (inherited convention violation). Plan PR must externalize to `apps/web/src/components/monetization/definitions/copy.ts` per `feedback_definitions_copy_rule`. R2's tier-name swap added a small adapter pattern (`${tierName}`) that eng can mirror in the copy-helpers. ~80 new copy slots per the README dev notes.

### ♿ Cross-cutting

- ✅ **A11y wiring is real, not annotated-only.** Failure surfaces ship `role="alertdialog"` + `aria-modal="true"` + `aria-live="assertive"` on the headline (the one place assertive is correct — an error is an interrupt by definition). Network-timeout note ships `aria-live="polite"` (it's guidance, not interruption). Past-due banner ships `role="region"` + `aria-label` + `aria-live="polite"` (banner appears between sessions, not mid-interaction) + labelled dismiss button. Legal block has `role="group"` + `aria-label="Terms and billing information"`. Challenge mounts use `role="dialog"` around the iframe with `aria-labelledby` + `aria-describedby` — Stripe owns the iframe's internal a11y.
- ✅ `aria-current="true"` (not `"page"`) on the current-plan column header per the R1 chat-thread fix. Plus visually-hidden "Current plan" label for screen-reader clarity.
- ✅ Three SR walkthrough scripts ship inline beside the surfaces (§9): tier matrix, payment surface, trial-ended takeover — exactly the three high-complexity surfaces the brief identified.
- ✅ Back-annotation table for #781 + #780 surfaces (§8) covers tier picker (matrix + accordion), scarcity rail, mini paywall sheet, Plan card variants, Manage sheet, Cancel/Downgrade/Upgrade flows, account-deletion two-sheet, day-13 banner. Every surface gets its annotation row.
- 🟡 No analytics / PostHog events spec'd for the new surfaces (failure category telemetry, past-due banner show/dismiss/CTA, challenge-mount entry/completion). Owned by #775 / plan PR.

### ⏰ Drift from reality

- ✅ R2 honors the merged brief (PR #823) on every locked decision and every prompt-response clarification. The 11 "Open for Design to call" items each cite the brief in their decisions log entry.
- ✅ Hugh's R6 amendments from #781 honored throughout (Watching is Free for signed-in users, Supporter is badge-only — both shape the tier-card microcopy contract).
- ✅ Sour Patch voice anchors preserved across all new surfaces: "Your bank said no.", "Your bank declined it.", "Your card got flagged for review.", "Heads up — your card got declined.", "Whatever you pay, you pay. We never raise it.", "$3 is $3. New folks may pay double someday — never you.", "No drama. It just needs a working card."
- ✅ Sequencing concern around #780's past-due gap correctly carried forward in Dev/handoff notes (this round's past-due Plan card ships in lockstep with or before #780's implementation).

### 📝 Decision log

- ✅ 11-entry decisions log covers every "Open for Design to call" item from the brief PLUS the prompt-response clarifications (`network_timeout` keeps card, suppress past-due during active payment, hybrid a11y format, SR walkthroughs inline beside surfaces, challenge-mount chrome tone). Each entry traces back to a brief section + explains the reasoning + offers a one-line "easy to flip" path for Hugh if he wants to change it.
- ✅ Reconciliation prose for the price-promise placement is exemplary — names the brief direction, names Founder's existing locked-forever stamp, explains why a complementary line reads cleaner than a duplicate. That's the right level of Design-eng dialogue.

## Deliberate exclusions (unchanged from brief)

- Subscription lifecycle / cancel / downgrade / upgrade / manage → #780 (✅ done)
- Tier picker visuals, entitlements matrix, scarcity rail, founder/gifted → #781 (✅ done)
- Email touchpoints incl. payment-failed-N + dunning → #783
- Stripe wiring, `decline_code` → category mapping, SCA region detection, `past_due_banner_dismissed_at` schema + session-start check, customer-portal endpoint, failure webhooks → #775
- Multi-card / saved cards → Stripe portal (not designed here)
- Logged-out broader UX → #794
- Admin refund / dispute tooling → separate ticket
- I18n beyond required disclosures → out entirely

## Open observations (no addendum required)

- The `Update card` button on the past-due banner is portal-bound visually (`↗` icon) but the prototype doesn't bind an `onClick`. Eng wires the Stripe customer portal redirect at integration; not a Design gap.
- The 11 explicit decisions log entries each include an "easy to flip" indicator — that's the right Design hygiene for future R3 polish if Hugh ever wants to revisit (e.g., headlines toward more / less blunt, banner cadence toward more aggressive, price-promise wording variation). None are flagged for revisit now.

## Next step

Plan PR remains blocked on #783 (email touchpoints) and #775 (eng infra) closure. The #782 design cycle is now complete; the handoff and this verdict can both land as the canonical artifacts for this addendum.

This verdict supersedes nothing — it's the Track 2 parity gate per `docs/superpowers/design-pipeline.md`.
