# Fan Send feedback: the missing states (Phase 6)

Answers the six questions from engineering about the redesigned fan "Send feedback" modal. It builds on `boards/07-people-flags-operations/fan-send-feedback.html`, `fan-account-menu-send-feedback.html` and `addendum-3/boards/02-suggest-a-venue/`. 16 boards in `boards/`, 2x shots in `screens/`. Example data throughout. New wording is draft and goes through `copy-review`; strings marked *live* are already in `definitions/copy.ts` and stay as they are.

## Answers

| # | Question | Answer |
| --- | --- | --- |
| 1 | Screenshot row | **A file the fan attaches, never an automatic capture.** The checkbox on the Phase 6 board was wrong: drop it. An automatic capture needs a DOM-to-image library, renders artist photos and fonts unreliably, and could send things the fan didn't mean to share. The row is a dashed attach row: image tile, "Attach a screenshot", "PNG or JPEG, up to 6 MB", "Optional" on the right. Tapping it opens the photo or file picker (same accepted types as today, `FEEDBACK_SCREENSHOT_TYPES`). Attached: solid row with a thumbnail, file name, size and × (36px, 44px hit area); picking again replaces it. Errors: the file is refused and not shown, the row border goes `--danger`, and the live error line sits under it (wrong type: *live* `screenshotWrongType`; too big: *live* `screenshotTooBig`). The error clears when the fan picks again. **Capture failed doesn't exist**, since nothing is captured. The row shows for every kind except Suggest a venue (as addendum 3 drew it). |
| 2 | Send failed | The form stays exactly as the fan left it (kind, text, screenshot). A `--danger` banner sits just above the buttons: "Signal lost. It didn't send." / "We saved your note on this phone. Try again now, or close this and it'll be here next time." The note is saved on the phone automatically the moment the send fails (see follow-up A4), so Send becomes a single **Try again** (primary, *live*); closing the sheet keeps the draft. Reopening shows "Saved draft restored." with **Discard draft** (both *live*) above the kinds, and brings back kind, text and screenshot. If saving the draft fails, the banner text swaps to the *live* `draftBanner.saveFailed` line and the sheet stays open. Desktop is the same in the modal. |
| 3 | Validation | **Send is never disabled.** Pressing it with something missing marks each missing field in place and moves focus to the first one. No kind: error line under the chips, "Pick what kind of note this is." Empty message: `--danger` border and "Tell us a little more first." Suggest a venue with no name: `--danger` border on Venue name and "Tell us which venue." This replaces "Send stays off until there is a venue name" on the addendum 3 empty board. Errors clear as soon as the field is filled. Errors use `--danger` with the alert icon, 12.5px, 6px under the field. The sheet opens with no kind picked (as live today); until one is picked, the box reads "What's on your mind?" with the hint "Pick a kind above, then tell us." |
| 4 | Field for each kind | **Same single box, its own label and hint.** The label now sits above the box (like the Suggest a venue fields) so it stays visible while typing; the hint is the placeholder. Text carries over when the fan switches between these four kinds. Switching to Suggest a venue moves the text into "Anything else?"; switching back moves it back. |
| 5 | Desktop | **Every kind, the sending, failed and sent states use the same 520px centered modal** as `fan-suggest-a-venue-d`, with × top right. The sent state narrows to 440px. Drawn: Something's broken with a screenshot, sending, send failed, sent. |
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

Attach a screenshot · PNG or JPEG, up to 6 MB · Optional · Signal lost. It didn't send. · We saved your note on this phone. Try again now, or close this and it'll be here next time. · Pick what kind of note this is. · Tell us a little more first. · Tell us which venue. · What we send with it · Page · Device · Theme · App version · Account.

Retired with the old modal: "Holler at ya boi.", the Auto-attached rail label, the header and status rails, "Loud and clear.", "Send another", "Back to the show", "Save and come back", the desktop Cancel, and every "If we answer / If we add it … What you missed" promise.

## Follow-ups (2026-11-22)

| # | Question | Answer |
| --- | --- | --- |
| A1 | Cut the What you missed promise | **Done everywhere.** The footnote and the sent screen read only "We read every note." Updated here, on `boards/07-people-flags-operations/fan-send-feedback` and on the four addendum 3 fan boards (`fan-suggest-a-venue-m`, `-empty-m`, `-d`, `fan-feedback-sent-m`). `COPY.md` updated. |
| A2 | Sending state | **Drawn** (`fb-sending-m`, `fb-sending-d`). The kinds, fields, attach row and What we send lock and dim to 55%; Send shows a spinner and "Sending…" (*live* `submitting`) and can't be pressed twice. × and Esc still close: the send carries on, and if it then fails the draft is saved as in A4 and restored on the next open. No toast on success after closing. |
| A3 | Sent screen and desktop footer | **Both dropped.** The sent screen has only **Done**, which closes and leaves the fan where they were (that is "back to the show"). "Send another" goes: the menu is one tap away. The desktop footer has no **Cancel**: ×, Esc and a click on the scrim close it, the same as the addendum 3 desktop modal. |
| A4 | Saved automatically or by the button? | **Automatically, with no button.** The draft is written to the device the moment a send fails, so the banner is true as soon as it shows. "Save and come back" is dropped; Try again is the only button. If writing the draft fails (storage full or private mode), the banner body swaps to the *live* `draftBanner.saveFailed` line. |
| A5 | Suggest a venue drafts, and the screenshot across kinds | **The draft keeps every field of the kind it was saved under:** kind, venue name, website and Anything else (`fb-draft-restored-venue-m`). While the modal is open, switching kinds keeps everything in memory, the screenshot included: switching to Suggest a venue hides the attach row, switching back shows the same file again. **Only what the current kind shows is sent or saved**, so a hidden screenshot is neither sent with a venue suggestion nor kept in its draft. |
| A6 | What we send on the addendum 3 venue boards | **Done:** all three venue boards now have the line above Send. |

## Boards

| Section | Board | Shows |
| --- | --- | --- |
| 01-screenshot | fb-screenshot-none-m, -attached-m, -wrong-type-m, -too-big-m | Q1 |
| 02-send-failed | fb-sending-m, fb-send-failed-m, fb-draft-restored-m, fb-draft-restored-venue-m | Q2, A2, A4, A5 |
| 03-validation | fb-validation-nothing-m, fb-validation-venue-m | Q3 |
| 04-field-per-kind | fb-kind-idea-m | Q4 |
| 05-desktop | fb-broken-d, fb-sending-d, fb-failed-d, fb-sent-d | Q5, A2, A3 |
| 06-what-we-send | fb-what-we-send-m | Q6 |

## Build-vs-design check

Before the PR is ready, screenshot the modal at 320, 390 and 1280 in each state above and list every difference from these boards. One source for the attach row, the error line and the banner; reuse the B+ sheet and the addendum 3 modal shell rather than restyling the old modal.

Sources: the boards are generated from `/mnt/project-files/design/feedback-modal/fb.py` on the approved admin kit; one icon is new (lucide `image`).
