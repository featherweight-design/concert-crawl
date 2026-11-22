# Addendum 9 (2026-11-22): fan fields, Start adding it on the phone, Passport captions, Submitted prices row

Four build questions, answered. Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-9/a9.py` (`python3 boards.py <dest>`). Any new wording here is placeholder for copy review.

| # | Question | Ruling | Boards |
|---|---|---|---|
| 1 | Fan text fields on the phone, 16px or 14px | **Option 1, as a system rule:** 16px on the phone, 14px on desktop, fan and admin | 14 phone boards updated in place (below) |
| 2 | Start adding it on the phone, and a long message | Drawn on the Basics step; long messages clamp to 4 lines with Show all | `02-start-adding-it/*` |
| 3 | Passport Venues collected captions | **Captions, using the short name**, in a grid of columns at least 60px wide | `03-passport-captions/*` |
| 4 | Submitted prices row, phone vs desktop | **The desktop row on both:** "1 other fan confirmed." and the accent +1 CRED | none (the desktop board is the spec) |

## Decisions only Hugh can make

None are blocking. Two rulings go a step past the question, and Hugh can overrule either:
- Rule 1 covers admin phone fields too (the zoom happens there as well).
- Item 4 puts cred on the phone row, where it wasn't drawn.

## 1. Text fields are 16px on the phone

iOS Safari zooms the page when someone taps a field under 16px and stays zoomed after the keyboard closes. So:

- Every text input and text area uses **16px type on the phone layout and 14px from there up**. Use the breakpoint the feedback note box uses (PR #761).
- Search fields count. Admin phone fields count too: they are drawn at 13.5px and read as 16px.
- Height, padding, radius, labels, hints and placeholders don't change. Placeholders take the field's size.
- The rule is now rule 14 in both handoff READMEs (B+ and admin). Any board still drawn at 14px or 13.5px on the phone reads as 16px.

Redrawn at 16px (everything else on them is unchanged):
- `design_handoff_admin_redesign/addendum-3/boards/02-suggest-a-venue/fan-suggest-a-venue-m` and `fan-suggest-a-venue-empty-m`.
- `design_handoff_admin_redesign/feedback-modal-states/boards/*/*-m`: all 12 phone boards, including `03-validation/fb-validation-venue-m`.

The desktop boards stay at 14px. PR #765 (Suggest a venue) can go ahead on this rule.

## 2. Admin: Start adding it on the phone

- **Phone** (`02/start-basics-m`): this is the Add a venue Basics step (`05-add-a-venue/step-1-basics-mobile`), empty. The fan's message sits in the quote callout where "Filled in from 3 fan suggestions" was, with "Back to it" inline at the end, as on desktop `addendum-7 03/suggestion-start-d`. Fields use rule 1 (16px).
- **A long message** (`02/start-basics-long-m`, desktop `02/start-basics-long-d`):
  - The quote clamps at 4 lines, with "From @handle's suggestion, {date}." counted in them.
  - A link row goes under it, with **Show all** on the left and **Back to it** on the right. Back to it is never cut off.
  - Show the link row only when the message is clamped. A message that fits keeps Back to it inline.
- **Opened** (`02/start-basics-long-open-m`): the whole message shows and the form moves down. **Show less** closes it. Its open or closed state isn't saved.
- **Superseded:** `05-add-a-venue/basics-desktop` ("Asked for by… we filled in the name and address") and `05-add-a-venue/add-a-venue-start` ("Venues people asked for"). They are marked in [`addendum-7`](../addendum-7/README.md) §3.

## 3. Passport: Venues collected captions

Captions, as addendum 4 §4 already decided (Hugh, 2026-11-12, option A); the boards just never drew them.

- **Tile:** the venue glyph at **48px** with a check badge when collected. The caption sits under it:
  - 10.5px, centered, a 2-line clamp with a fixed 26px height so rows line up.
  - Collected: `fg`, weight 600. Not yet collected: `subtle`, weight 500.
  - The caption is **not** dimmed with the tile, so it stays readable.
- **Text:** the venue's `shortName`. With no short name, the full name in 2 lines, the addendum 4 fallback.
- **Grid:** `repeat(auto-fill, minmax(60px, 1fr))` with gaps of 10px (rows) and 8px (columns), all 21 venues, collected first. That gives:
  - 4 columns at 320px (`03/venues-collected-320`), so each tile gets about 67px.
  - 5 columns at 390px (`03/venues-collected-390`).
  - 5 columns in the desktop side column (`03/venues-collected-d`).
- This replaces the 56px icon-only grid on `addendum-4 08-passport/passport-next-*`, `addendum-2 04-passport-order/passport-*` and `16-undrawn-pages/passport-empty-d`.

## 4. Submitted prices: the confirmation row

Both sizes use the desktop row (`screens/07-more-screens/more-s-d_submissions`):

- **Line:** "1 other fan confirmed." ("{n} other fans confirmed." for more than one). The submitter never counts themself, so "other" is the accurate version. The wording goes to copy review.
- **+1 CRED** shows on **both** sizes, in accent, at the end of the confirmation line, as on desktop.
  - It shows only on rows that earned cred: confirmed and published. Pending, closed and price-check rows show none.
  - Show the amount the price actually earned. Today that is 1 per verified price, which matches the Settings summary ("+41 cred").
- On the phone, the phone board's layout stays. Only the line and the cred change.
