# Design Gap Report — Tier Picker (PR 3.2, monetization)

Design-review skill run 2026-07-11 against `docs/superpowers/design-tables/tier-picker.md`
(source: `design/design_handoff_monetization_tier_states/`, R6 locked).

## Agent 2 verdict

Pass 1 (visual): 9 gaps found. Pass 2 (state reachability): all 10 states reachable —
six PlanState-driven picker states, three founder-window states (endpoint computed +
integration-tested), price-promise microcopy on Supporter + Premium.

## Gaps found and fixed

| #   | Element                            | Design                                                                               | Was                                  | Fix                                                           |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| 1   | Picker title (desktop)             | 36px / lh 1.02                                                                       | 34px / lh 1.06                       | `TierPickerSheet.tsx`                                         |
| 2   | Outer content column gap (mobile)  | 12                                                                                   | 16                                   | conditional `isMobile ? 12 : 16`                              |
| 3   | Footer mono rail                   | mobile 9.5/0.12em, desktop 10/0.14em                                                 | 9.5/0.13em both                      | `MonoRail` takes `isMobile`                                   |
| 4   | Sign-in link (logged-out, desktop) | 13.5px, right of title block in flex-end/space-between row                           | 12.5px under sub on both breakpoints | desktop header row added; mobile keeps 12.5 + margin-top 2    |
| 5   | Expanded mobile feature-list gap   | 6 (desktop card stays 5)                                                             | 5 shared                             | `TierFeatureList` gained `gap` prop; `TierRowMobile` passes 6 |
| 6   | Expanded region aria-label         | `{name} tier details`                                                                | `{name}`                             | new `TIER_PICKER_COPY.aria.tierDetails`                       |
| 7   | Gifted mark cluster                | 56×56 CCMark + accent radial halo (inset -6, radius 22)                              | missing                              | added to `GiftedThankYou.tsx`                                 |
| 8   | Gifted discovery button            | "See everything you've got" + chevron, 12px 16px, radius 11, border-strong, 700/13.5 | missing                              | added; copy in `TIER_PICKER_COPY.gifted.discover`             |
| 9   | Gifted desktop variant             | title 40, body 15.5, perks grid 1fr 1fr                                              | mobile values only                   | `variant` prop, passed from sheet's `isMobile`                |

## Agent 3 verdict

All 9 items confirmed fixed. **0 gaps remain.**

## Judgment calls (documented, not deferred)

- **Gap 8 destination:** no plan/spec/handoff defines where the gifted discovery button
  goes (design README locks it as "one discovery affordance, never billing" but names no
  route). Wired as `onDiscover={close}` — it dismisses the picker back to the app, where
  everything the perks list describes lives. Trivial to point at a feature-tour route
  if one ever exists.
- **Founder pre-launch CTA** ("Opens at public launch", disabled) comes from the eng
  infra spec, not the design canvas — carried over from the plan's locked decision.
- Cross-tier switch/downgrade CTAs render the designed labels but are disabled
  (`action: 'none'`) — those flows are brief #780 / PR 4.5 scope.
