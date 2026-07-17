# Design Gap Report — Supporting Artists Line (#643, PR2)

Property table: `docs/superpowers/design-tables/supporting-artists-line.md`
Design source: `design/design_handoff_supporting_artists_line/` (supporting-line.jsx, event-cards.jsx, README.md)
Verified: 2026-07-17 via the `design-review` skill (Agent 1 enumerate → Agent 2 verify → Agent 3 confirm).

## Scope boundary

Ticket #643 ships the **supporting-artists title block** — the shared
`EventTitleBlock` + `SupportingLine` components — and integrates them into the
existing `EventCard`, `HeroEventCard`, and event-detail surfaces. The plan's
Task 10/11 briefs explicitly scope the integration to "swap only the artist +
title text; preserve the surrounding layout." The surrounding host chrome
(card border/background/radius, artist image size, `MetaLine` spacing, hero
card dimensions, gradient stops, "Tonight's pick" badge position) is
pre-existing app layout and is **not** part of this ticket.

## In-scope gaps — all fixed

Agent 2 flagged 14 fidelity gaps on the two new components. All fixed in
commit `fix(web): exact design-spec typography + tour a11y label on title
block (#643)` and confirmed by Agent 3 (0 remaining):

| #   | Element             | Property       | Design                        | Now         |
| --- | ------------------- | -------------- | ----------------------------- | ----------- |
| 1   | Kicker row          | margin-bottom  | 1px                           | 1px         |
| 2   | Headliner           | font-weight    | detail 900 / else 800         | matched     |
| 3   | Headliner           | letter-spacing | detail -0.03em / else -0.02em | matched     |
| 4   | Headliner           | line-height    | 1.12                          | 1.12        |
| 5   | SupportingLine root | line-height    | 1.35                          | 1.35        |
| 6   | Lead word           | letter-spacing | 0.04em                        | 0.04em      |
| 7   | Lead word           | position       | relative                      | relative    |
| 8   | Lead word           | top            | -0.02em                       | -0.02em     |
| 9   | Artist name         | letter-spacing | -0.005em                      | -0.005em    |
| 10  | "+N more" tail      | letter-spacing | 0.01em                        | 0.01em      |
| 11  | StatusPill          | padding        | 2px 7px                       | 2px 7px     |
| 12  | StatusPill          | line-height    | 1                             | 1           |
| 14  | TourEyebrow         | aria-label     | "Tour: {name}"                | via copy.ts |

Item 13 (TourEyebrow margin-bottom 3/8px) — ACCEPTABLE-BY-STRUCTURE: the tour
renders inside a horizontal `items-center` kicker flex; vertical spacing to the
headliner is governed by the parent `flex-col gap` (2/3/5px per surface), which
is the correct mechanism. A bottom margin on a row-flex child is a no-op.

## Out-of-scope (host surfaces — not this ticket)

Agent 2 also flagged 21 properties on the surrounding host components. These
are pre-existing app layout the plan explicitly preserved, not regressions
introduced by #643, and are **not** gaps for this PR:

- EventCard root chrome (gap, padding, border-radius, background, border)
- EventCard artist image size (48px vs handoff's 56px) + radius
- EventCard/HeroEventCard `MetaLine` (margin-top, gap, font-size, venue color)
- HeroEventCard root border-radius (12px vs 16px), image height (180 vs 200),
  gradient stops, "Tonight's pick" badge offsets, content-area padding/margin

The handoff's `event-cards.jsx` is an idealized standalone-card mock; the live
surfaces have their own established design. Re-skinning them is out of scope
for the supporting-artists line and would belong to a separate card-redesign
ticket if ever desired.

## Deferred by design (documented in the plan's Self-Review)

- SupportingLine **chips** variant — only "billing" ships.
- **TourSubtitle** / `tourPlacement` subtitle+hidden — only tour-as-eyebrow ships.
- **`interactive`** tap affordance on openers — owned by #84, not ported here.

## Verdict

0 in-scope gaps remain. Ready to ship.
