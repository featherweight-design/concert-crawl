# Admin redesign · Design addendum 5 (2026-11-24)

Design's answers to the admin rows still open in [`../QUESTIONS-2026-11-12.md`](../QUESTIONS-2026-11-12.md) after the 2026-11-12 and 2026-11-23 rounds: G8b's "If it runs out" off state, the 4c Artists confirms, and Health 1c (G3, G4, G5, G6, G12, G14).

`NN/board` means `screens/NN-<section>/board.jpg` (2x), with the HTML in `boards/NN-<section>/board.html`. Boards that change a drawn state patch the drawn board; the rest use the same kit. Cards use `--bg-elevated` per admin addendum 4, 2a. Like earlier addenda, these boards win over a board they contradict. **All new wording is draft** and goes through `copy-review`; copy is not part of this ask.

| # | Row | Ruling | Boards |
|---|---|---|---|
| G8b | "If it runs out" off (Hugh: Haiku keeps running past the budget, warning only; migration 0112) | **Drawn.** Off: grey switch, the line says what off does. Once on pace to pass the budget, a warning row; past it, the tile reads Over budget (warning) and Needs you gets the existing budget item. Haiku never stops. | `01/budget-off-d`, `01/budget-off-m`, `01/budget-tiles` |
| 4c | Exact name, candidate selection, Not an artist (line 697) | **All three confirmed as built.** Exact name is a toggle (`aria-pressed`, signal tint and check). Clicking a candidate selects it (gradient border) and its Use becomes the primary Use selected. Not an artist is a ConfirmDialog with no reason step (a sheet on the phone). | `02/exact-name-on-d`, `02/candidate-selected-d`, `02/not-an-artist-confirm-d`, `02/not-an-artist-confirm-m` |
| G3 | Artists tile pill and panel title | **No pill; the panel is "Artists".** Matched = crawler match plus admin pick. No match = nothing found plus Not an artist. The two Unsure buckets stay their own rows. | `03/g3-artists`, `03/health-desktop-answers` |
| G4 | Site tile, email only | **The tile is EMAIL.** Sending, Bouncing (20% of the last 20), Failing (last 3 failed; also a Needs you item), Quiet (nothing sent in 48 hours; not a fault). The panel keeps only email rows. | `03/g4-email-tile`, `03/health-desktop-answers` |
| G5 | No budget set | **Spend and pace, no pill, a Set a budget link.** The chart drops the budget line. The panel's budget field is empty; Warn me at and If it runs out are disabled until a number is saved. Never a Needs you item. | `03/g5-no-budget` |
| G6 | Paused reason, and hidden, blocked and robots-disallowed venues | **Paused reads `crawl_pause_reason`** (with the resume date); no reason reads "Paused · no reason given"; crawler auto-pauses stay in Failed. Order: Failed, Blocked, Paused, Robots.txt says no, Quiet on purpose, OK, then Hidden as one collapsed row. | `03/g6-venue-groups` |
| G12 | Panels left off the phone | **Partly deliberate.** Artist and Email panels open as sheets from their tiles; "Runs ›", "$x a day" and "All ›" come back; Open Needs you (the tab bar does it), the footer and the chart footnote stay off on purpose. | `03/g12-phone-spec`, `03/g12-health-m`, `03/g12-artists-sheet-m` |
| G14 | Phone loading; reflow from 720 to about 1100 | **Drawn.** Phone loading uses 07/loading-health's skeleton kit. From 720 to 1099: the desktop shell, tiles 2×2, one column of panels. From 1100: as drawn. | `03/g14-loading-m`, `03/g14-mid-900`, `03/g14-reflow-spec` |

## Decisions only Hugh can make

None new. G8b draws Hugh's ruling. G4 treats "Failing" as a Needs you item; say if it shouldn't be.

## Notes for the build

- **G4.** More's "Venues, cost, site checks" and addendum 2's "1 site check failing" become email wording; that's copy.
- **G6.** Hidden venues aren't crawled, so they never count toward failing or toward "N venues crawled".
- **G14.** Two breakpoints only (720, already built, and 1100), so no width shows half-squashed tiles.
