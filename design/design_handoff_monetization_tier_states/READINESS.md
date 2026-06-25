# Readiness Review — Monetization Tier States + Entitlements (Round 6)

**Verdict:** 🟢 Green — ready for plan PR (modulo the sister addenda + eng infra; see Plan PR target below)
**Audited:** 2026-06-25
**Auditor:** Claude (autonomous Track 2 parity-gate re-review)
**Audited handoff:** `design/design_handoff_monetization_tier_states/` (Round 6)
**Source brief:** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (amended in this PR — §6 Watching row moves to Free for signed-in users)
**Related ticket(s):** [#781](https://github.com/HartiganHM/concert-crawl/issues/781) (source ticket — tier states + entitlements matrix), [#800](https://github.com/HartiganHM/concert-crawl/issues/800) (R6 addendum — closed by this round). Sister addenda still gating the plan PR: [#780](https://github.com/HartiganHM/concert-crawl/issues/780) (lifecycle), [#782](https://github.com/HartiganHM/concert-crawl/issues/782) (failure states + a11y), [#783](https://github.com/HartiganHM/concert-crawl/issues/783) (email), [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (eng infra). Sister Track 2: [#794](https://github.com/HartiganHM/concert-crawl/issues/794) (logged-out broader UX).
**Plan PR target:** TBD — blocked on #780, #782, #783, #775 closure. Path when ready: `docs/superpowers/plans/<date>-monetization-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

**Prior verdict for this handoff:** R5 audit at `READINESS_R5.md` (🟠 Orange, 2026-06-25). R6 closes every item the R5 audit named. See the R5 file for the historical record.

## Summary

R6 cleanly closes the five items R5 left open. Design's iteration is high quality and on-voice — Sour Patch register is preserved, token-only colors hold across all 9 themes, and the new surfaces (§5.1 mini paywall, mobile tap-to-expand picker) feel native to the original handoff's vocabulary rather than bolted on. Hugh's matrix amendment (Watching → Free for signed-in users) is applied consistently in the brief, the entitlements matrix component, the Free tier card, the logged-out picker copy, and the `MINI_PAYWALL_ANCHORS` default.

The four hygiene items the R6 PR fixed inline (brief amendment in the repo, theme-context "6 genre" restore, dead-code branch collapse, this R6 READINESS / R5 archive split) are mechanical and don't change the verdict. Verdict is 🟢 Green for this handoff in isolation. Plan-PR readiness for monetization as a whole still depends on the four sister tickets (#780/#782/#783/#775) closing.

## Per-R5-item closure check

| R5 finding | R6 resolution |
|---|---|
| §5.1 Free→Premium mini paywall sheet missing | ✅ `monetization-paywall.jsx` ships `<MiniPaywall variant anchor/>` + `MINI_PAYWALL_ANCHORS`. Mobile bottom sheet + desktop centered modal. Feature-anchored, single upgrade CTA → `/settings/plan`, "Maybe later" dismisses. Four anchors (drops/history/export/following) so eng can fan out per gated feature. Default leans on the now-Free Watching ("You've watched it. Want to know when the price drops?") which connects the matrix amendment to the upsell. Canvas section 3. |
| Mobile tier picker has no comparison mechanic | ✅ `<TierComparisonMobile>` + `<TierRowMobile>` replace the R5 vertical stack of fully-expanded cards. Collapsed-summary rows (name · badge · price · tagline) always visible; one row expanded inline at a time; tap toggles. No nested modal, no truncation. Defaults to current plan, else Premium. Desktop picker untouched (locked from R5). |
| Founder current-plan card hidden post-window-close (Medium, surfaced in R5 Copilot review) | ✅ `r5VisibleTiers(founderState, state)` now takes `state` and keeps Founder visible when `state === "founder"` even after the window closes. New artboards in sections 1 & 2 ("Founder · window CLOSED · still your plan") demonstrate the post-close state with the current-plan stamp + Manage CTA visible. |
| `useTweaks()` not single source (Medium handoff polish) | ✅ Module-level `__twkStore` (values + subs Set) shared across every `useTweaks(defaults)` call. Subscribers are React effects; `setTweak` writes via `__twkApply` and notifies all subscribers. Section 0 live preview now responds to Tweaks panel changes as the README promises. |
| `postMessage` handler origin-unchecked (Low handoff polish) | ✅ `if (e.source !== window.parent) return;` gate on the `__activate_edit_mode` / `__deactivate_edit_mode` handler. |

## New decisions Hugh confirmed during R6 review

- **"★ More coming" placeholder** on Premium + Founder tier cards stays. Reading: a meta-statement about ongoing development, not the per-feature "coming soon" labels brief §7 outlaws.
- **Watching is Free for signed-in users** (the matrix amendment). Brief §6 + §4 hybrid-gating rationale updated in this PR; the Free tier card lists "Save shows you're watching"; the logged-out picker copy reframes as "Watching's free — you just need an account"; the §6 entitlements matrix component reads `freeForSignedIn: true` on the Watching feature.

## What this PR added beyond Design's drop

Four mechanical fixes applied inline so the brief and the handoff stay consistent:

1. `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` — applied the Watching matrix amendment in the brief itself (Design only updated their uploaded copy). Brief §4 hybrid-gating rationale + §6 matrix row + new "Amendment 2026-06-25" note under Supporter rationale.
2. `theme-context.jsx:2` — restored "6 genre themes" (Design's drop reverted this to "5", a regression of the R5 audit hygiene fix).
3. `monetization-tier-states.jsx:124` — restored the collapsed `if (state === "free") return base;` (Design's drop restored the dead-code branch the R5 audit had collapsed).
4. `READINESS.md` → `READINESS_R5.md` rename + this new R6 file. Per `docs/superpowers/design-pipeline.md:112` the addendum-audit naming convention is `READINESS_<issue>.md` for parent designs that ship once and later receive extensions. R5 is the parent audit; R6 is its successor verdict. Both stay in the repo.

## Per-dimension findings (R6 re-audit)

### 🗺️ Scope clarity

- ✅ All R5 deliverables now present. README's "Round 6 changes" section explicitly maps each R5 finding to its R6 resolution.
- ✅ Out-of-scope section unchanged from R5: lifecycle / failure-and-a11y / email / eng infra / logged-out broader UX still belong elsewhere.
- ✅ "Open questions" decision log updated. Item 5 (feature-anchored header) and Item 6 (mobile comparison) reflect the R6 calls.

### 🎭 State coverage

- ✅ Mobile picker now answers comparison shopping. Hugh's R5 concern is closed: collapsed summary + tap-to-expand replaces the scroll-everything pattern.
- ✅ Founder closed-window-while-Founder state has its own artboards. The closure is observable.
- ✅ Free tier card reintroduces "Save shows you're watching" — the amendment is consumer-visible.
- ✅ Mini paywall renders both variants; eng fans out anchors at integration.
- 🟡 The mini paywall's *default* anchor in the canvas (`drops`) is a thoughtful connection to the Watching amendment, but eng will pick the anchor per gated feature at integration. The decision log calls this out; ensure the plan PR enumerates the per-affordance mapping.

### 🔌 Data contract

- ✅ `entCell(feature, groupKind, stateKey)` now takes the feature object so a per-feature override (`freeForSignedIn: true`) can short-circuit cleanly. Signature change is propagated through both `EntitlementsMatrixDesktop` and `EntitlementsMatrixMobile`. Eng's `canUseFeature(plan, feature)` helper (per #775) will need the same feature-aware signature.
- ✅ `r5VisibleTiers(founderState, state)` signature change is propagated through `TierPicker`. No stale callers.
- 🟡 `MINI_PAYWALL_ANCHORS` is an object keyed by feature codename (`drops` / `history` / `export` / `following`). Eng will need a per-affordance route from the matrix's `paywall-on-tap` cell to the right anchor key. Plan PR scope — recommend a small map `{ [PremiumFeature]: AnchorKey }` co-located with the entitlements helper.

### 🧱 Codebase fit

- ✅ Token-only colors verified across the new `monetization-paywall.jsx` (`var(--signal)`, `var(--accent)`, `var(--surface-1)`, `var(--border)`, `var(--fg-on-accent)`). All 9 themes still render correctly.
- ✅ Reuses existing atoms — `TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`, `DragHandle` — for the mini paywall surface. New `<FeatureLockMark>` is an internal primitive only.
- ✅ R5 hygiene fixes restored in this PR (see "What this PR added").
- 🟡 Copy externalization still pending (inherited from R5). The new R6 surfaces (mini paywall anchors, mobile accordion expanded-row copy, Founder-closed artboard copy) add ~30–40 new copy slots. Plan PR's `definitions/copy.ts` workstream grows correspondingly.
- 🟡 The mobile accordion's `<TierRowMobile expanded onToggle>` controlled-state pattern is clean React. Eng will reuse this pattern when rebuilding against the project's shadcn primitives.

### ♿ Cross-cutting

- 🟡 A11y still owned by #782. The new mini paywall surface adds another sheet/modal that #782 will need to cover (focus trap, ESC dismiss, scroll lock, focus return). The mobile accordion adds `aria-expanded` / `aria-controls` requirements. Not a new gap, just expanded surface area for the existing #782 ticket.
- 🟡 Analytics / PostHog event schema (inherited from R5) expands to cover `paywall_opened: { feature: PremiumFeature, anchor: AnchorKey }` and `tier_row_expanded: { tier }` mobile interactions. #775 scope.

### ⏰ Drift from reality

- ✅ Brief amendment landed in lockstep — no contradiction between brief and handoff. The 2026-06-25 amendment note in §6 documents the change and its rationale.
- ✅ R5 verdict archived at `READINESS_R5.md` for historical traceability.
- ✅ "★ More coming" placeholder treatment confirmed; the brief's §7 stance survives ("no per-feature coming-soon labels").

### 📝 Decision log

- ✅ R6 README's "Round 6 changes" section is the explicit decision log for everything new in this round, matched 1:1 against R5 findings.
- ✅ Hugh's two confirmed calls are recorded (★ More coming stays; Watching amendment) in both the README and the brief.

## Deliberate exclusions (unchanged from R5)

- Lifecycle / cancel / downgrade / upgrade — #780
- Payment failure surfaces + a11y + microcopy — #782
- Email touchpoints — #783
- Stripe wiring / schema / entitlements helper plumbing / Founder seat counter / `derivePlan` — #775
- Logged-out broader UX — #794

## Next step

Plan PR for monetization stays blocked until #780, #782, #783, and #775 close. The R5/R6 cycle for #781 is now complete; **#800 can be closed**.

Once the four sister tickets are done, the plan PR opens. Path: `docs/superpowers/plans/<date>-monetization-implementation-plan.md`.
