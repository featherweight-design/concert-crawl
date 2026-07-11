# Design Gap Report — Past-Due Surfaces (PR 4.3)

Verified against `docs/superpowers/design-tables/past-due-surfaces.md` via the design-review skill (Agent 2 verify → fixes → Agent 3 confirm).

## Agent 2 verify (commit ccbc138b)

**PastDueBanner** (pinned + inline modes, card-alert SVG, CTA, dismiss, copy): clean match — every property row and all five copy strings verbatim.

**State reachability** (Pass 2): all states reachable end-to-end — shown (type `showPastDueBanner` at packages/types/src/index.ts:765; route computes via `evaluateNudgeFlags` with `?sessionStartedAt=`; gate renders pinned banner), dismissed-this-session (local state + `dismissNudge('past-due')` stamping `pastDueBannerDismissedAt`), re-shown next session (dismissedAt < sessionStartedAt predicate), suppressed during payment flow (`usePaymentFlowActive` + `beginPaymentFlow` on embedded-checkout mount), mutual exclusivity with takeover/day-13 (gate ordering + server predicates).

**Visual gaps found: 9** — all in the shared plan-card past-due shell (drift from PR 3.4):

1. Card shell radial gradient stop — fixed 58% → 60% mobile / 55% desktop
2. Card shell border warning mix — fixed 45% → 40% mobile / 45% desktop (emphasis stays 70%)
3. Card shell max-width — none → 620px desktop
4. TierBadge — sm always → sm mobile / md desktop (dual render, visibility toggle)
5. Headline letter-spacing — −0.025em always → −0.03em desktop
6. Body line-height — 1.5 always → 1.45 mobile / 1.5 desktop
7. Body max-width — 520px always → desktop-only
8. "Update card" primary CTA — missing 12×12 portal arrow SVG + flex/gap-7 layout (added `portalArrow` CTA marker)
9. Primary CTA border — `1px solid transparent` → `none`

**State gaps: 0 blocking.** The banner's `inline` variant is implemented but intentionally unmounted (exported for future surfaces; only pinned is mounted by the gate) — documented in the component header, not a defect.

## Fixes

All 9 fixed in commit `fix(web): plan-card past-due shell gaps vs design table (pr 4.3)`.

## Agent 3 confirm

All 9 items FIXED with file:line evidence. **VERDICT: 0 gaps remain — ready to ship.**

## Accepted deviations (documented, not gaps)

- Banner/dismiss buttons use explicit style resets instead of the design's `all: unset` — codebase a11y convention (UA focus styles survive)
- Pinned banner wraps in `position: fixed; z-index 60` (shares the day-13 layer; server predicates make the two mutually exclusive) — design specified no z-index
- CTA `disabled`/pending affordance (`transition-opacity disabled:opacity-60`) for the portal round-trip — eng extension
- Plan-card copy stored sentence-case with CSS `text-transform: uppercase` — renders verbatim
