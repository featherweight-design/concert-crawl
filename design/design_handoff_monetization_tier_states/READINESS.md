# Readiness Review — Monetization Tier States + Entitlements (Round 5)

**Verdict:** 🟠 Orange (two High findings; surfaces that landed are buildable, but two scope additions block plan-PR readiness)
**Audited:** 2026-06-25
**Auditor:** Claude (autonomous Track 2 parity-gate Readiness Review)
**Audited handoff:** `design/design_handoff_monetization_tier_states/` (Round 5)
**Source brief:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (PR #795, merged 2026-06-25)
**Related ticket(s):** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (the source ticket — tier states + entitlements matrix). Addendum opened from this audit: [#800](https://github.com/HartiganHM/concert-crawl/issues/800) (`[design] Monetization R5 addendum — §5.1 paywall sheet + mobile picker comparison mechanic`). Sister addenda in play: [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle), [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email), [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (eng infra), [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (logged-out broader UX).
**Plan PR target:** TBD — blocked. The Monetization plan PR cannot open until #800 closes plus the sister addenda (#780, #782, #783) and the eng infra spec (#775) close. Path when ready: `docs/superpowers/plans/<date>-monetization-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

## Summary

R5 is a confident, surgical extension of the original `design/design_handoff_monetization/` handoff. It honors every locked decision in the merged brief without redesigning a single line of the original — tone shells, badges, scarcity rail, mono rails, and voice are lifted verbatim, and the new surfaces inherit the visual register cleanly. Voice is on register (the gratitude rail on the gifted thank-you state is a particularly nice extension of the Sour Patch idiom). The entitlements matrix `entCell(group, state)` derivation is a clean codification of brief §6, and the `canUseFeature(plan, feature) === true only for "Active"` footer caption is the right plain-English seam for eng. Founder race-loser and post-claim takeover both nail the brief's tonal intent (honest, no consolation pricing on the loser; ceremonial seat reveal on the winner without confetti). The R5 README's "Open questions — answers Design took" section is exactly the decision log the brief asked for and traces every micro-call back to a brief section.

That said, two scope gaps gate plan-PR readiness:

1. **The §5.1 Free→Premium mini paywall sheet is not rendered.** The §6 matrix's `paywall-on-tap` cell value (8 cells: Watching / Concert history / Calendar export / Following × Free / Supporter) routes to this sheet, but the sheet itself is not in the handoff. The §6 matrix has no destination for a Free user tapping the locked heart.
2. **The mobile tier picker has no comparison mechanic** — it's a vertical scroll of 4 fully-expanded cards inside a 92%-height sheet. Hugh explicitly flagged this. The original handoff had a tap-to-expand mechanic (`<TierDetailSheet>` with chevron) which R5 deliberately did not carry forward, with a "stale Supporter feature data" justification — but the replacement is a regression on comparison-shopping UX.

Both are scope additions (not redesigns of what already landed) and can be closed by a single R6 addendum. Verdict is Orange, not Red, because the surfaces that did land are buildable as-is and the gaps are well-defined.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ All five brief-stated deliverables enumerated and named in the handoff README:
  1. Tier picker — 6 states (`monetization-tier-states.jsx` → `<TierPicker state variant/>`)
  2. Founder race-loser (`monetization-founder-gifted.jsx` → `<FounderRaceLoser variant/>`)
  3. Founder post-claim takeover (`<FounderClaimTakeover variant seatNumber/>`)
  4. Plan card variant for gifted (`<GiftedPlanCardDesktop/Mobile>`)
  5. Entitlements matrix (`monetization-entitlements.jsx` → `<EntitlementsMatrix variant/>`)
- ✅ "Out of scope" section properly maps to the sister tickets: #780 (lifecycle), #782 (a11y + failure), #783 (email), #775 (eng infra), #794 (logged-out broader UX). Matches the brief's deliberate-exclusions table.
- ✅ Section list in the canvas (`Tier States + Entitlements.html`) is exhaustive — 8 sections, mobile + desktop throughout, theme parity sweep at the end.
- 🔴 **§5.1 Free→Premium mini paywall sheet is missing.** The merged brief (§5.1, lines 110–117) calls for a mobile bottom sheet / desktop centered modal triggered when a Free or Supporter user taps a locked active affordance. Feature-anchored headline, primary "Go Premium" CTA deep-linking to `/settings/plan`, secondary "Maybe later" dismisses. This sheet is the destination for every `paywall-on-tap` cell in the §6 matrix (8 cells). It is not rendered in this handoff. Without it, the matrix's `paywall-on-tap` value has no defined surface — eng would have to guess or default to the full picker (which is the logged-out behavior, not the Free/Supporter behavior). The handoff's R5 README acknowledges only §5.2 ("the picker IS the paywall, per brief §5.2") which is the logged-out case; the Free/Supporter case is absent.
- 🟠 Tier-detail "See what's included" expand-sheet pattern is dropped from R5 with the justification *"the locked `<TierDetailSheet>` reads stale Supporter feature data. Reuse it once `R5_TIERS` feature bullets land in `monetization-shared.jsx`."* The justification is reasonable on its face (stale data), but the consequence is the loss of the tap-to-expand mechanic that the original handoff used to manage mobile vertical space. See State Coverage finding below — this is one half of finding #2.

### 🎭 State coverage

- ✅ All six tier states rendered in the mobile picker variant (logged-out, free, supporter, premium, founder, gifted): `TierPicker` switches to `<GiftedThankYou>` for the gifted state (replaces the picker), and `resolveTierCta` covers every other (tier × state) pair explicitly. Verified by reading `monetization-tier-states.jsx:100–143`.
- ✅ Desktop variant renders the same six states (centered modal over Settings · Plan).
- ✅ Founder window states honored: `r5VisibleTiers(founderState)` filters Founder out when the window's closed; the canvas section list confirms "open = 4 stacked cards, closed = 3" on mobile (R5 README #6 in the answers-Design-took log).
- ✅ Race-loser and post-claim takeover both rendered, both variants. Post-claim shows two seat numbers (#37, #03) to prove the format scales — a nice touch.
- ✅ Gifted Plan card renders on both desktop and mobile in Settings context (`<SettingsPlanDesktop>` / `<SettingsPlanMobile>` wrappers in `design-canvas.jsx:312–315`).
- ✅ Entitlements matrix renders both desktop (full table) and mobile (compact icon grid + state-key legend).
- 🔴 **Mobile tier picker has no comparison mechanic.** This is Hugh's explicit concern, and it's well-founded. The mobile picker is implemented as a `<SheetChrome height="92%">` (`monetization-shared.jsx:406–435`) containing a vertical stack of fully-expanded `<TierStateCard>` instances. On a 402×874 iOS device frame:
  - Sheet usable height: ~804px (92% of 874px)
  - Sheet header (drag handle + RailHeader + title + sub + optional sign-in link): ~140–170px
  - Per-card height (current-plan banner, header + price, rationale rail, 5-bullet feature list, CTA): ~280–310px
  - 4 cards × ~295px = ~1,180px stacked content vs. ~640–660px visible
  - Net: user sees roughly the first card + part of the second on first paint; everything else is below the fold inside the modal sheet
  - There is no tap-to-expand mechanic (verified by reading the `<TierStateCard>` JSX `:153–291` — no collapsed-by-default state, no chevron, no expand handler), no tabs at the picker top, no swipe carousel, no summary-first view
  - Comparison shopping is the picker's primary purpose, and it is not supported by this mobile UX — the user cannot see Free + Premium side by side or even within the same scroll height
  - The original handoff (`design/design_handoff_monetization/README.md:33`) explicitly had this: *"Tier cards · tap to expand for full details — each card has a 'What's included' chevron; tap expands the same feature list with one-line descriptions under each item. Collapsed default + Premium-open + Founder-open + all-open shown."* R5 deliberately did not carry this forward (handoff README "Dev notes" cites stale `TierDetailSheet` data) but did not replace it with any other mechanic
  - Recommend: R6 addendum to lock the mobile comparison mechanic — likely options are (a) restore tap-to-expand against `R5_TIERS` data (rebuild `<TierDetailSheet>` against the new feature bullets), (b) collapsed-by-default cards with chevron-to-expand inline, (c) tabs/segmented control at the sheet header that swaps a single rendered card, (d) horizontal swipe carousel, or (e) summary-first matrix view with tap-to-tier-detail. Design owns the choice; the audit just locks the requirement
- 🟡 §5.1 missing surface (see Scope Clarity above) is also a state-coverage gap — the `paywall-on-tap` matrix value names a state that has no rendered surface to land on.
- 🟡 Founder claimed but window closed in Settings — the original Readiness Review on the source handoff flagged this gap (line 49 of `design/design_handoff_monetization/READINESS.md`: *"Founder claimed vs. available-to-claim vs. closed-but-you-already-claimed states are present in the tier picker but not in the settings plan card"*). The R5 handoff doesn't address it because it wasn't in the brief's scope — but neither is it called out as still-deferred. Mention it explicitly in the R5 decisions log so future eyes don't miss it.

### 🔌 Data contract

- ✅ Six-state tier vocabulary aligned with the brief (`logged-out` / `free` / `supporter` / `premium` / `founder` / `gifted`). `ENT_STATES` in `monetization-entitlements.jsx:16–23` and `R5_TIERS` in `monetization-tier-states.jsx:25–72` are both canonical lists.
- ✅ `entCell(groupKind, stateKey)` (`monetization-entitlements.jsx:52–57`) is a clean derivation of the brief §6 matrix — a `PAID = ["premium", "founder", "gifted"]` set, a background-vs-affordance branch, and a logged-out-vs-rest branch for non-paid affordances. Three rules, exhaustive over six states × two group kinds = 12 cells per feature × 7 features = 42 cells produced. Matches the brief verbatim. Eng can codify this into the entitlements helper landing in #775 with very high fidelity.
- ✅ `resolveTierCta(tierKey, state)` (`monetization-tier-states.jsx:100–143`) is exhaustive over all (4 tier × 5 non-gifted-state) = 20 pairs. Current-state-stamps on the matching tier. Cross-state actions (upgrade / downgrade / switch) produce sensible CTAs. Gifted is short-circuited at the surface level via the `<GiftedThankYou>` replacement.
- ✅ Founder window state derives from the same `getFounderState(founderKind)` helper as the original handoff — no new contract introduced. Aligned with the eng infra spec (#775) which owns the seat-counter atomicity.
- ✅ Gifted bypass is structural: the picker doesn't try to render gifted as a tier card; it swaps the whole surface. This aligns with the brief's "Clerk metadata first, then Stripe" derivePlan rewrite (per #775 `derivePlan` rewrite spec — see `design/design_handoff_monetization/READINESS.md:48` for the original gap).
- 🟡 The handoff doesn't expose the entitlements helper signature explicitly. The desktop matrix footer says *"canUseFeature(plan, feature) === true only for 'Active'"* — that's the conceptual seam, but eng will want a typed signature in the plan PR: `canUseFeature(plan: UserPlan, feature: PremiumFeature): boolean` plus the `PremiumFeature` enum (`watching | history | export | following | alerts | spotify | drops`). Plan PR / #775 problem; just flagging for traceability.
- 🟡 §5.1 mini sheet (missing surface, see above) also missing data contract — what does the sheet receive as props? `feature: PremiumFeature` (to drive the anchored copy)? `currentPlan: UserPlan` (for the secondary "switch" CTA)? Resolves when the surface is designed.

### 🧱 Codebase fit

- ✅ Token-only colors verified across `monetization-tier-states.jsx`, `monetization-founder-gifted.jsx`, `monetization-entitlements.jsx`. Every accent reads from `var(--*)` (spot-checked `--surface-1`, `--surface-2`, `--bg-elevated`, `--border`, `--border-strong`, `--fg`, `--fg-muted`, `--fg-subtle`, `--accent`, `--signal`, `--danger`, `--success`, `--fg-on-accent`). The Founder race-loser bg uses `var(--bg)` directly (`monetization-founder-gifted.jsx:96`) and the post-claim takeover uses a radial gradient from `color-mix(... var(--accent) 12% ...)` to `var(--bg)` (`:184`) — both token-driven.
- ✅ All 9 themes addressed — the merged `theme-context.jsx` (`R5 README` line 22) combines the base 3 + the 6 genre themes + Drip's `accent-2`. The theme-parity sweep section in the canvas (Section 7) verifies the Free-state picker across Light / Drip / Forge / Pulse + the matrix in Light. Drip's `accent-2` is set up with `var(--accent-2, var(--accent))` fallback (R5 README "Dev notes") so non-Drip themes degrade gracefully.
- ✅ `MMark` (verbatim copy of `CCMark`) is reused, untouched — eng will swap to the real `CCMark` on integration.
- ✅ Component reuse: `TierBadge`, `MonoEyebrow`, `RailHeader`, `ScarcityRail`, `SheetChrome`, `ModalChrome`, `DragHandle`, `getFounderState` all imported from the original handoff's `monetization-shared.jsx` via `window.*`. No reinvention.
- ✅ `<SeatMeter>` (new component in `monetization-founder-gifted.jsx:12–32`) is a clean primitive — could be promoted to `monetization-shared.jsx` in the eng plan PR for reuse beyond Founder.
- 🟡 **Copy is hardcoded in JSX, same as the original handoff.** R5_TIERS feature bullets, taglines, rationales, badge-only notes, race-loser headlines + honesty rail, post-claim headlines + locked-forever stamp, gifted thank-you copy, gifted plan card body, gifted dropdown chip text — all inline. The project convention (`feedback_definitions_copy_rule` memory: *"ALL customer-facing strings must be in definitions/copy.ts"*) requires externalization. Not Design's job to fix; plan-PR-stage workstream. Volume now significantly larger than the original handoff (probably 80–100 new copy slots).
- 🟠 **`useTweaks()` pattern doesn't actually share state between hook instances.** In `tweaks-panel.jsx` (`:151`), `useTweaks(defaults)` returns its own `useState(defaults)` store. Every component that calls `useTweaks(TWEAK_DEFAULTS)` — `FlowTweaks`, `LiveMobile`, `LiveDesktop` in `Tier States + Entitlements.html` — gets its own independent state. Result: toggling state · theme · Founder window in the Tweaks panel does not drive the Section 0 "Live preview" mobile + desktop pairs, and they don't stay in lockstep with each other. Severity = Medium because the canvas's static artboard sweep (Sections 1–7) already renders every state explicitly; the broken live-preview tool is a verification-workflow inconvenience, not a state-coverage gap. The R5 README directs *"toggle Tweaks in the toolbar to drive state · theme (all 9) · Founder window live"* — that affordance does not work as-described. Recommended fix: refactor `useTweaks` into a singleton store (custom event emitter or single React context provider at the canvas root). Tracked as a follow-up cleanup; not a plan-PR blocker since artboards cover all states.
- 🟡 `<TierDetailSheet>` from the original handoff is intentionally not reused (R5 README "Dev notes" cites stale Supporter feature data). When the comparison mechanic is rebuilt (per State Coverage finding above), the choice of "rebuild `<TierDetailSheet>` against `R5_TIERS`" vs. "ship a different mechanic entirely" is Design's call but will affect eng's reuse of `monetization-extras.jsx` atoms.

### ♿ Cross-cutting

- 🔴 **A11y still not addressed.** Same gap as the original handoff. The race-loser is a full-bleed page-replacement surface — what handles focus return? The post-claim takeover's giant `#37` seat number — does it announce via `aria-live="polite"` with a meaningful screen-reader phrase ("You claimed Founder seat thirty-seven of one hundred")? The picker mobile sheet — focus trap, ESC dismiss, scroll lock, focus restoration on dismiss? Tier cards use `<button>` semantics for CTAs — good. Matrix `<EntitlementsMatrixDesktop>` is a CSS grid, not a `<table>` — screen-reader users get a flat reading order with no row/column headers. *Tracked: #782 (Monetization addendum — a11y review pass + screen-reader walkthrough).* Not a new gap, but it remains live and the R5 handoff didn't add anything toward it.
- 🔴 **Mobile picker UX (Hugh's flagged concern) is THE cross-cutting concern of this round.** See State Coverage finding above — comparison-shopping on mobile is the primary purpose of the picker, and the current scroll-everything implementation does not support it.
- 🟡 No analytics / PostHog events spec'd. Original handoff's `paid-supporter` → `supporter` rename and the new state vocabulary will need a fresh event property schema (`tier_selected: { tier: 'free' | 'supporter' | 'premium' | 'founder', from_state: '...' }`). #775 likely covers; verify in plan PR.
- 🟡 No performance note on the picker render cost. The desktop matrix renders 4 columns × 5–6 feature bullets each = ~24 items; the entitlements matrix renders 7 features × 6 states = 42 cells. Both are static-after-mount. Minor concern; raise in plan PR only if measured regression.
- 🟡 Visual emphasis on the locked $3 stamp in the post-claim takeover (`monetization-founder-gifted.jsx:151–162`) is appropriate — the pill borrows the Founder gradient + signal border. But it sits beside a `<TierBadge tier="founder">` which has its own gradient. Two adjacent gradients with overlapping accent + signal vocabulary could read as visual conflict at small viewports. Spot-check on mobile (which the handoff does verify via the Tweaks panel — defer to Design's eyes).
- 🟡 **Prototype-scope security: postMessage handler is origin-unchecked.** `tweaks-panel.jsx:200` listens to `window.message` events without gating on `event.source === window.parent` or any known-origin allowlist. A third-party page could post `{type: '__activate_edit_mode'}` and toggle edit mode if these prototypes are ever embedded (iframe, omelette preview, etc.). Low severity because these JSX files are design artifacts — they won't ship to production; eng will rewrite against the project's React patterns and won't carry the prototype message handler forward. Note for hygiene: a one-liner `if (event.source !== window.parent) return;` would close the gap on the prototype side too.

### ⏰ Drift from reality

- ✅ R5 honors the merged brief (PR #795) completely on the locked decisions: 6-state vocabulary, $0 / $2 / $5 / $3-locked pricing, Founder launch-only timing, hybrid gating philosophy, gifted thank-you-state-only treatment, race-loser without consolation pricing, post-claim ceremony, no "coming soon" rendering (R5_TIERS includes a `{text: "More coming", future: true}` placeholder bullet — see below), entitlements matrix semantics.
- 🟡 R5 introduces a `{text: "More coming", future: true}` feature-bullet placeholder on the Premium + Founder cards (`monetization-tier-states.jsx:57, 68`) styled as a dimmed `★` row. The merged brief's §7 ("Coming soon — deliberate non-treatment") explicitly says *"Tier cards display the actually-shipped Premium feature set at any given moment. There is no 'coming soon' rendering, no 'Spotify sync — coming Aug' eyebrow, no greyed-out future features on the card."* This `★ more coming` row is arguably a soft "coming soon" treatment — generic enough that it doesn't promise a specific feature, but it does signal future expansion. Verify with Hugh whether the generic "More coming" eyebrow honors the brief's intent or violates it. The conservative read: the brief is talking about per-feature "coming soon" labels (e.g., "Spotify sync — coming Aug"); R5's generic placeholder is meta-statement about ongoing development, not a per-feature claim. Lean: acceptable, but document the call.
- 🟡 **Watching is no longer listed on the Free card.** R5_TIERS Free card omits "Save shows you're watching" (matrix says Watching = `paywall-on-tap` for Free). R5's README correctly flagged this for Hugh's eyes (the "Reconciliation note") and described it as *"a deliberate read of §6, not an oversight."* The audit confirms it is a deliberate read — the brief's §6 matrix locks Watching at Premium-and-up — but it is a material product change vs. the original handoff (and arguably vs. the shipped Free experience today). **Hugh should explicitly re-confirm.** If Watching should stay on Free, the brief's matrix needs an amendment ticket; if not, the R5 reading stands.
- 🟡 **`<TierDetailSheet>` tap-to-expand mechanic from original handoff is gone.** Justification noted in R5 README "Dev notes": stale Supporter feature data. This is real drift from the original handoff's mobile UX (see State Coverage finding above). Closing the comparison-mechanic addendum closes this drift.

### 📝 Decision log

- ✅ R5 README "Open questions — answers Design took" section is the explicit decision log for the seven micro-calls Design made from the brief's "Open Questions" list. Each call traces back to a brief section.
- 🟡 **Theme count was inconsistent in two handoff source files** (the audit caught this during commit verification): `theme-context.jsx:3` originally said *"5 genre themes ... (pulse, forge, bluenote, drip, cedar, gloss)"* but the list contains 6, and the same "5 genre" wording was repeated in the R5 README's file table at line 22. Both fixed in this PR as part of the audit's hygiene sweep ("5" → "6"). The actual theme-context.jsx implementation correctly exports 9 themes; only the descriptive comments were off by one. Low severity but worth recording so future audits know to count, not rely on, the descriptive prose. Examples:
  - #1: Gifted thank-you copy → "Sour-Patch gratitude" with three sample lines (matches brief's "exact copy ... is illustrative, not locked" with concrete proposed text)
  - #2: Race-loser copy → headline + emphasis + honesty rail with verbatim proposed text
  - #3: Post-claim seat rendering → giant `#37` numeric treatment + "Your seat" eyebrow
  - #4: Gifted dropdown badge → Premium badge + "Beta" sub-chip (the brief left this open)
  - #5: Feature-anchored header → mono eyebrow naming the locked feature (e.g., `WATCHING · LOCKED`) + benefit headline + sub
  - #6: Mobile Founder column count → open=4 stacked, closed=3 stacked
  - #7: "Premium" chip consistency → one chip across surfaces, differentiated by route hint only
- ✅ Reconciliation note flags the Watching-on-Free implication for Hugh's review. Explicit, properly scoped, doesn't hide the call.
- 🟡 No explicit decision log entry for the `<TierDetailSheet>` decision (drop from R5, deferred to rebuild). This is mentioned in the "Dev notes" but not framed as a Design decision Hugh should review. Add to the decision log — it's a meaningful UX call.
- 🟡 No explicit decision log entry for the "discovery affordance, never a billing one" gifted plan card CTA choice (the button reads "See what Premium unlocks"). Minor — the surface is self-explanatory, but the principle deserves a one-liner in the log.

## Gaps requiring Design round-trip

Two High findings, both well-scoped, both addressable in a single Design addendum (Track 2 R6 round):

1. **§5.1 Free→Premium mini paywall sheet.** The 8 `paywall-on-tap` cells in the §6 matrix need a destination. Bottom sheet on mobile, centered modal on desktop, feature-anchored headline, primary "Go Premium" → deep-link to picker, secondary "Maybe later" dismisses. Existing `<SheetChrome>` and `<ModalChrome>` atoms cover the container; new is the inline content. Probably 1–2 surfaces total (mobile + desktop with feature-anchor variants spot-checked for 2–3 features).

2. **Mobile tier picker comparison mechanic.** Hugh's flagged concern. Lock the mobile mechanic: tap-to-expand (rebuild `<TierDetailSheet>` against `R5_TIERS`), collapsed-by-default inline-expand, tabs/segmented control, swipe carousel, summary-first, or another. Design owns the choice — the audit just locks the requirement that the picker must support tier comparison without forcing users to scroll past one fully-expanded card to see the next. The desktop variant is fine as-is (row of 4 cards with full features visible at once).

Both gaps would be consolidated into a single Track 2 R6 addendum ticket — they share an audience (Free/Supporter users encountering Premium on mobile) and they share an answer (better progressive disclosure on the picker family).

## Other observations (no round-trip required)

- The 7 micro-calls Design made from the brief's "Open Questions" list are all sensible reads. None deserve pushback. Hugh should still skim them to confirm.
- The `★ more coming` placeholder row on Premium + Founder cards is a soft "coming soon" treatment that the brief's §7 may or may not intend to exclude. Hugh's call — recommend Document & Accept rather than remove.
- Watching dropping off the Free card is a deliberate read of the brief — Hugh's call whether to re-amend the matrix or accept.
- A11y, copy-externalization, analytics events, and the `<TierDetailSheet>` rebuild cost are all inherited gaps that close in their respective owner tickets (#782 + plan PR workstream + #775).

## Decisions inherited

The R5 handoff respects all of the original handoff's locked decisions (voice, card personality, Founder urgency rules, scarcity rail, role-holder voluntary support, token-only colors, tier copy table, success-state headlines, badge taxonomy, `CCMark` reuse). No round-trip on any of those.

The R5 handoff also respects the new locked decisions from the merged brief (PR #795): 6-state vocabulary, pricing, Founder launch-timing, race + post-claim mechanics, hybrid gating, paywall surface types, supporter = badge-only, no "coming soon" per-feature labels. No round-trip on any of those either.

## Next steps

1. **R6 addendum ticket opened as [#800](https://github.com/HartiganHM/concert-crawl/issues/800)** covering both High findings, bundled. Same `type: design, source: internal, phase: beta, priority: high` label profile as #780–#783.
2. **Hugh reconfirms** the two amber drift items (Watching-off-Free, "★ More coming" placeholder).
3. **Once #800 closes** + the other sister tickets (#780, #782, #783, #775) close, the Monetization plan PR is unblocked.

This verdict supersedes nothing — it's the Track 2 parity gate per `docs/superpowers/design-pipeline.md`.
