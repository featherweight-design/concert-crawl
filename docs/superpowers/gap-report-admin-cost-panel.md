# Gap Report — Admin Dashboard CostPanel (#112 / #114)

Design-review verification (2026-07-11) against
`docs/superpowers/design-tables/admin-cost-panel.md`. Initial verdict: 14 visual gaps,
3 state gaps. Disposition below.

## Fixed in this branch

| #   | Gap                                       | Fix                                                                                                      |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Title cluster gap — design 10px, impl 8px | `CostPanel.tsx` gap → 10                                                                                 |
| 2   | Flat WoW delta rendered `-0% wow`         | `computeWowTrend` now signs from the rounded delta — flat renders `0%`, decreases `-N%`, increases `+N%` |

## Approved by the merged plan (not gaps)

`docs/superpowers/plans/2026-07-10-admin-dashboard-cost-panel.md`:

- **Empty window** — plan specifies a quiet single-line message when the 30-day total is $0 (no chart/list skeletons). Implemented as specified.
- **WoW badge omitted when prior window is $0** — plan-specified; a percentage against $0 is meaningless.
- **"Open billing" action dropped, $20 budget, live data, dynamic badge tone, mobile stacking** — locked in READINESS.md + plan.

## Pre-existing primitive drift (out of scope — tracked as a follow-up issue)

These mismatches live inside shared admin primitives that ship across every admin
surface (dashboard StatCards, venues, events, crawl tables). CostPanel passes the
props the design specifies; the primitives themselves diverged from the mock's
primitives when they were first built (admin UI v2). Restyling them inside this PR
would silently change every admin page, so they are deferred to a dedicated issue (#874):

| Primitive          | Property                                                 | Mock                             | Shipped                            |
| ------------------ | -------------------------------------------------------- | -------------------------------- | ---------------------------------- |
| Panel header strip | padding                                                  | 14px 18px                        | 10px 16px                          |
| StatusBadge (mono) | gap / padding / font-size / letter-spacing / line-height | 6 / 2px 8px / 11 / 0.04em / 16px | 5 / 2px 6px / 10 / 0.02em / unset  |
| StatusBadge (soft) | background / border                                      | color-mix from token             | hardcoded rgba, transparent border |
| CostText           | font-weight / letter-spacing / sub-$1 4-decimal format   | 500 / 0.01em / toFixed(4)        | 400 / unset / always toFixed(2)    |
| ProgressBar        | wrapper gap / fill transition                            | 10 / width .25s ease             | 8 / none                           |

Note on sub-$1 formatting: the API also rounds `costUsd` to cents (`roundUsd`), and
2-decimal display is the established convention everywhere else in admin — adopting
the mock's 4-decimal sub-$1 format is a product decision for the follow-up issue,
not a bug in this panel.

**VERDICT: 0 gaps remain in CostPanel scope.**
