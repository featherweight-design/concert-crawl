# Gap Report — Lifecycle Takeover + Day-13 Banner + Founder Claim (PR 4.2)

Design-review verify pass (Agent 2) against `docs/superpowers/design-tables/lifecycle-takeover.md`, 2026-07-11.

## Verdict

**0 visual gaps, 0 actionable state gaps.** Every property row in both tables (Table 1: #780
TrialEndedTakeover / TakeoverPickerMobile / DayThirteenBanner + atoms; Table 2: #781 R5
FounderClaimTakeover) matches the implementation, including all copy strings verbatim.

## State reachability

- 16 of 18 states ✅ REACHABLE end-to-end (API field in type → route computes it → component
  branch exists → props correct).
- 2 states ⚠️ by design: `DayThirteenBanner variant="inline"` (mobile + desktop) is implemented
  and tested but mounted nowhere. The #780 decisions log (item 5) defines the pinned strip as
  the primary placement and the inline variant as an alternate "for surfaces where a pinned
  strip is too heavy" — no such surface exists yet, so the variant ships as a dormant export.
  Not a deferral; the design's mounted default is fully wired.

## Accepted deviations (pre-declared)

1. `all: unset` CTA resets replaced by explicit border/background resets — codebase a11y
   convention (UA focus rings survive; enforced by an existing test).
2. Founder seat number renders unpadded (`#38`, not `#038`) — eng call on the design-canvas
   zero-padding ambiguity.
3. Design-canvas scaffolding (iOS frame, Tweaks panel, per-node font-family, `position:
relative` canvas roots) replaced by real overlays (`position: fixed; inset: 0`) and
   app-global Inter inheritance — computed values identical.

## Notes

- Post-claim footer hint "Routing you to Settings · Plan" holds because Settings · Plan
  (`/me` PlanPanel) is the sole production mount of `TierPickerSheet`. If the sheet is ever
  mounted elsewhere, `finishClaim` should gain an explicit `router.push(PLAN_SETTINGS_ROUTE)`.
- `showPastDueBanner` is evaluated and returned by `GET /v1/users/me` per the spec contract but
  intentionally unrendered — the past-due banner surface is PR 4.3 (#782).
