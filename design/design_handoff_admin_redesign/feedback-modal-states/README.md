# Fan Send feedback: the missing states (Phase 6)

Answers the six questions from engineering about the redesigned fan "Send feedback" modal. It builds on `boards/07-people-flags-operations/fan-send-feedback.html`, `fan-account-menu-send-feedback.html` and `addendum-3/boards/02-suggest-a-venue/`. 13 boards in `boards/`, 2x shots in `screens/`. Example data throughout. New wording is draft and goes through `copy-review`; strings marked *live* are already in `definitions/copy.ts` and stay as they are.

## Answers

| # | Question | Answer |
| --- | --- | --- |
| 1 | Screenshot row | **A file the fan attaches, never an automatic capture.** The checkbox on the Phase 6 board was wrong: drop it. An automatic capture needs a DOM-to-image library, renders artist photos and fonts unreliably, and could send things the fan didn't mean to share. The row is a dashed attach row: image tile, "Attach a screenshot", "PNG or JPEG, up to 6 MB", "Optional" on the right. Tapping it opens the photo or file picker (same accepted types as today, `FEEDBACK_SCREENSHOT_TYPES`). Attached: solid row with a thumbnail, file name, size and × (36px, 44px hit area); picking again replaces it. Errors: the file is refused and not shown, the row border goes `--danger`, and the live error line sits under it (wrong type: *live* `screenshotWrongType`; too big: *live* `screenshotTooBig`). The error clears when the fan picks again. **Capture failed doesn't exist**, since nothing is captured. The row shows for every kind except Suggest a venue (as addendum 3 drew it). |
| 2 | Send failed | The form stays exactly as the fan left it (kind, text, screenshot). A `--danger` banner sits just above the buttons: "Signal lost. It didn't send." / "Your note is saved on this phone. Try again, or save it and come back later." Send becomes **Try again** (primary, *live*) with **Save and come back** (ghost, *live*) under it, which closes the sheet with the draft kept. Reopening shows "Saved draft restored." with **Discard draft** (both *live*) above the kinds, and brings back kind, text and screenshot. If saving the draft fails, the banner text swaps to the *live* `draftBanner.saveFailed` line and the sheet stays open. Desktop is the same in the modal. |
| 3 | Validation | **Send is never disabled.** Pressing it with something missing marks each missing field in place and moves focus to the first one. No kind: error line under the chips, "Pick what kind of note this is." Empty message: `--danger` border and "Tell us a little more first." Suggest a venue with no name: `--danger` border on Venue name and "Tell us which venue." This replaces "Send stays off until there is a venue name" on the addendum 3 empty board. Errors clear as soon as the field is filled. Errors use `--danger` with the alert icon, 12.5px, 6px under the field. The sheet opens with no kind picked (as live today); until one is picked, the box reads "What's on your mind?" with the hint "Pick a kind above, then tell us." |
| 4 | Field for each kind | **Same single box, its own label and hint.** The label now sits above the box (like the Suggest a venue fields) so it stays visible while typing; the hint is the placeholder. Text carries over when the fan switches between these four kinds. Switching to Suggest a venue moves the text into "Anything else?"; switching back moves it back. |
| 5 | Desktop | **Every kind, the failed state and the sent state use the same 520px centered modal** as `fan-suggest-a-venue-d`, with × top right. The sent state narrows to 440px. Drawn: Something's broken with a screenshot, send failed, sent. |
| 6 | What we send | **Keep it, smaller.** It's the only place a fan learns their page, device and account ride along. One quiet line, "What we send with it" with a chevron, between the footnote and Send, closed by default; it opens in place to a five-row list. Rows: Page, Device, Theme, App version, Account (same five fields the live modal sends). Suggest a venue gets the same line (the same details are sent), so add it to the addendum 3 venue boards too. |

### Labels and hints for the box (draft copy)

| Kind | Label | Hint |
| --- | --- | --- |
| Something's broken | What happened? | What did you tap, and what did you expect? |
| An idea | What's the idea? | What would make it better for you? |
| Something I love | What do you love? | Tell us what's working. |
| Other | What's on your mind? | Anything at all. |
| None picked yet | What's on your mind? | Pick a kind above, then tell us. |

### Other new strings (draft copy)

Attach a screenshot · PNG or JPEG, up to 6 MB · Optional · Signal lost. It didn't send. · Your note is saved on this phone. Try again, or save it and come back later. · Pick what kind of note this is. · Tell us a little more first. · Tell us which venue. · What we send with it · Page · Device · Theme · App version · Account.

Retired with the old modal: "Holler at ya boi.", the Auto-attached rail label, the header and status rails, "Loud and clear." (the addendum 3 sent state replaces it).

## Boards

| Section | Board | Shows |
| --- | --- | --- |
| 01-screenshot | fb-screenshot-none-m, -attached-m, -wrong-type-m, -too-big-m | Q1 |
| 02-send-failed | fb-send-failed-m, fb-draft-restored-m | Q2 |
| 03-validation | fb-validation-nothing-m, fb-validation-venue-m | Q3 |
| 04-field-per-kind | fb-kind-idea-m | Q4 |
| 05-desktop | fb-broken-d, fb-failed-d, fb-sent-d | Q5 |
| 06-what-we-send | fb-what-we-send-m | Q6 |

## Build-vs-design check

Before the PR is ready, screenshot the modal at 320, 390 and 1280 in each state above and list every difference from these boards. One source for the attach row, the error line and the banner; reuse the B+ sheet and the addendum 3 modal shell rather than restyling the old modal.

Sources: the boards are generated from `/mnt/project-files/design/feedback-modal/fb.py` on the approved admin kit; one icon is new (lucide `image`).
