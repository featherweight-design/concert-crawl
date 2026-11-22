# B+ cold-review gaps (2026-11-22)

Gaps engineering found in a cold review of the B+ handoff. Boards in `boards/08-tier-check-outcome/` and `boards/10-welcome-back/`, 2x shot in `screens/`. Source: `/mnt/project-files/design/feedback-modal/cr.py` (reuses batch 2's tier card).

| # | Question | Answer |
| --- | --- | --- |
| 7 | Offline pill between 360 and 1023px | **Addendum 3 rule 1 wins.** It's the later, width-by-width ruling, and addendum 2 item 15 only looked at phones. The pill reads "Offline" at every width under 1024px and "Offline · cached OK" from 1024px up. Addendum 2's 360px breakpoint is retired. |
| 8 | Multi-tier: does a tier row show the price check's outcome? | **Yes, drawn** (`tier-check-outcome`). After review the tier row goes back to plain with the single-price card's outcome line under it, same style and *live* copy (`checkHeld`, `checkUpdated`). Updated: the row shows the new price and "Was" names the old one. Held: the row keeps its price. On the headline tier the line sits under the big price and the band is gone. The line stays as long as it does on the single-price card. Phone and desktop use the same card. |
| 9 | Submitted prices "Load 35 more" | **Not desktop only, and the board's numbers were cropped example data.** Both widths show the newest 20 rows. When there are more, a centered text button at the end of the list reads "Load N more", where N is the next batch (up to 20; "Load 15 more" for the last 15). Pressing it appends the rows with quiet skeleton rows while loading (B+ rule 10, no wave). The phone list does the same: a button, not infinite scroll. Changing the filter starts over at 20. Under 21 rows, there's no button. |

## Second round (2026-11-22)

| # | Question | Answer |
| --- | --- | --- |
| 10 | Welcome-back strip for a Follow kept through sign-up | **Yes, drawn** (`welcome-back-strip`). The same strip with the artist photo, "Now following {artist}." (*live* `returnSeam.following`), the subline and **View**, which opens the artist page. Only the tap that sent the fan to sign up is kept, so the strip names one show or one artist, never both. |
| 11 | The strip at 320 and 390 | **The phone strip changes.** The subline becomes "Kept while you signed up" at every width (draft; replaces `returnSeam.kept`), which fits one line at 320. The title may wrap to two lines so the name is never cut, with … past two lines. View stays centered on the right. The phone strip spans the screen inside the 16px gutters. |
| 12 | Price check outcome on the multi-source card | **Under the price that was checked, never both.** A price check belongs to one price (one tier from one source), so its outcome line goes with that price only. Checked the box-office headline: the line sits under the big price, as on the plain card (board 08). Checked the resale alternate: the line sits under the "Or pay for convenience" row, inside the card, and the headline stays plain. If both prices had their own checks, each gets its own line. On another tier whose alternate is collapsed, the line shows with that price when the row is opened; the collapsed row stays plain. Same line, same *live* copy (`checkHeld`, `checkUpdated`), same rule for how long it stays. Not drawn: the line and its placement are the board 08 pattern. |

New wording: "Load N more" and "Kept while you signed up" are draft for `copy-review`.

## Build-vs-design check

Screenshot the welcome-back strip (watch and follow) at 320, 390 and 1280, the multi-source card after a check on each price, the offline header at 320, 390, 900 and 1280, the multi-tier card after each outcome, and Submitted prices with 25 rows at 390 and 1280, and list every difference from the boards before the PR is ready.
