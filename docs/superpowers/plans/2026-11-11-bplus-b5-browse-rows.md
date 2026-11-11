# B+ B5: Browse rows (phase plan)

Part of the [B+ umbrella plan](2026-11-11-bplus-redesign.md). **Boards:** `01-core/bp-browse` (desktop) and `02-mobile/bp-m-browse_m` (390). **Builds on:** F3 (#101), which adds the genre tokens, `GenreDot`, the image ring and the carded left edge.

## Scope

1. **Carded Browse rows.** `SURFACES.browse.carded` becomes true, so Browse rows get the card, the 2px genre left edge, the wash and the image ring F3 built. The list gaps between cards replace the dividers. Row content doesn't change: the four-line contract, the chip budget and the price slot stay as they are.
2. **Day headers.** A date tile (weekday over day number, a gradient tile for today and neutral for other days) next to the live label ("Tonight", "Tomorrow", or the date) and a mono "N shows" count. `dateGroupLabel` is unchanged.
3. **Tonight spotlight.** `HeroEventCard` is restyled to the board: the filled pink "★ Tonight" chip, the genre ring on the art, the F3 genre chip, the venue and time line, the watch button in the corner, and a card edge that runs from the genre color to the accent. Selection doesn't change (the first event, when it is today).
4. **Coming to Denver.** The `FollowShelf` "some" cards get a border in their genre color with a soft glow. The "zero" variant ("Follow someone. Anyone.") keeps its copy and only takes the same card treatment.
5. **List/Cal toggle.** An icon segmented control (list and calendar icons, with a gradient fill on the active one). The accessible names keep today's copy.
6. **Floating Crews button.** origin/main has no floating Crews button: Crews is a bottom-nav tab behind the `crews` flag, and the crew lens is the pill beside the heading. So B5 removes nothing. The lens pill moves into the "Who" filter segment in B6, where the board draws it.
7. **Release note:** one `releases.ts` entry for the new Browse look, through copy-review.

Filters (B6) and Cal, skeletons and empty states (B7) are out of scope.

## Route inventory

| Route | 390 | 1300 | Shares with |
| --- | --- | --- | --- |
| `/events` list, no filters (spotlight, day headers, rows) | ☐ | ☐ | origin |
| `/events` with a filter set (no spotlight, rows) | ☐ | ☐ | `/events` rows |
| `/events` Coming to Denver (signed in with follows) | ☐ | ☐ | — |
| `/events` signed out (zero shelf, rows) | ☐ | ☐ | `/events` rows |
| `/events?view=cal` (toggle only) | ☐ | ☐ | — |

Every row is checked in Electric, Light and Forge, plus a 320px pass on the list. **Marker:** `data-testid="row-image-ring"` on every Browse row, and the `event-row` card edge.

## Risks

- **Row height.** Carding adds padding. `rowMin` stays the floor; the measure pass and the 320px pass check that line 4 doesn't drop.
- **Sold out and cancelled rows** keep the F3 status colors and the strike. Card opacity is never applied to the row (the AA rule in `EventRow`).
