# Design Gap Report — Manage Sheet + Cancel/Downgrade/Upgrade Flows (PR 4.5, monetization)

Design-review skill run 2026-07-11 against `docs/superpowers/design-tables/lifecycle-manage.md`
and `docs/superpowers/design-tables/lifecycle-flows.md`
(source: `design/design_handoff_monetization_lifecycle/`, #780 locked).

## Agent 2 verdict

Two parallel verifiers (manage sheet table; cancel/downgrade/upgrade flows table),
each running the dual pass:

- Pass 1 (visual): **0 gaps** — every property row matched on both tables.
- Pass 2 (state reachability): **0 gaps** — 6/6 manage-sheet states and 14/14 flow
  states reachable end-to-end (API field present in the response type, computed by the
  route, component branch exists, props correct).

No Agent 3 confirm pass required (nothing was flagged).

## Non-gap findings (fixed pre-PR)

Two stale code comments contradicted the implemented founder-as-source behavior
(#780 decision 6). Behavior was correct; comments were wrong:

| File                              | Was                                                                 | Fix                                                          |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `manage/DowngradeFlow.tsx` header | "Founder is claim-only and never a change-tier source; API 409s it" | Founder's retention path routes here per #780 decision 6     |
| `api/routes/billing-lifecycle.ts` | claimed "confirm copy warns the grandfathered seat is forfeited"    | switch is an explicit confirm flow; no forfeit-warning claim |

## Accepted adaptations (documented, not deferred)

- **Mobile sheet positioning:** `position: fixed` in the app vs `absolute` in the mock —
  the mock renders inside a phone-frame div; `fixed` is the correct viewport-anchored
  equivalent in the real app.
- **Sheet height:** `maxHeight: 92%` with inner scroll instead of the mock's unbounded
  height — protects short viewports; design defines no overflow behavior.
- **ErrorLine + pending affordances:** live mutations need inline error text and
  disabled/pending button states; the static design defines none. Built from the
  existing lifecycle primitives so they inherit the designed type/color system.
- **Founder → DowngradeFlow verbatim:** the design locks DowngradeFlow as a single
  Premium → Supporter shape ("Switch · Premium → Supporter" eyebrow, no tier variants).
  Founder's retention path (#780 decision 6) reuses it verbatim rather than inventing a
  founder-specific variant.
