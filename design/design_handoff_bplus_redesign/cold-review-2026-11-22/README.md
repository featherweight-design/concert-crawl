# B+ cold-review gaps (2026-11-22)

Three gaps engineering found in a cold review of the B+ handoff. One board in `boards/08-tier-check-outcome/`, 2x shot in `screens/`. Source: `/mnt/project-files/design/feedback-modal/cr.py` (reuses batch 2's tier card).

| # | Question | Answer |
| --- | --- | --- |
| 7 | Offline pill between 360 and 1023px | **Addendum 3 rule 1 wins.** It's the later, width-by-width ruling, and addendum 2 item 15 only looked at phones. The pill reads "Offline" at every width under 1024px and "Offline · cached OK" from 1024px up. Addendum 2's 360px breakpoint is retired. |
| 8 | Multi-tier: does a tier row show the price check's outcome? | **Yes, drawn** (`tier-check-outcome`). After review the tier row goes back to plain with the single-price card's outcome line under it, same style and *live* copy (`checkHeld`, `checkUpdated`). Updated: the row shows the new price and "Was" names the old one. Held: the row keeps its price. On the headline tier the line sits under the big price and the band is gone. The line stays as long as it does on the single-price card. Phone and desktop use the same card. |
| 9 | Submitted prices "Load 35 more" | **Not desktop only, and the board's numbers were cropped example data.** Both widths show the newest 20 rows. When there are more, a centered text button at the end of the list reads "Load N more", where N is the next batch (up to 20; "Load 15 more" for the last 15). Pressing it appends the rows with quiet skeleton rows while loading (B+ rule 10, no wave). The phone list does the same: a button, not infinite scroll. Changing the filter starts over at 20. Under 21 rows, there's no button. |

New wording: "Load N more" is draft for `copy-review`.

## Build-vs-design check

Screenshot the offline header at 320, 390, 900 and 1280, the multi-tier card after each outcome, and Submitted prices with 25 rows at 390 and 1280, and list every difference from the boards before the PR is ready.
