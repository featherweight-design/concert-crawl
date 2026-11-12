# B+ redesign · Design addendum 3 (2026-11-12)

Design's answers to [`../QUESTIONS-2026-11-12.md`](../QUESTIONS-2026-11-12.md). Every row there appears below and gets one of these:

- **A board.** Drawn here, in `boards/` (HTML) and `screens/` (2x JPG).
- **A ruling.** One line naming the drawn pattern it reuses.
- **Hugh** or **Eng.** The question belongs to Hugh (product) or engineering (data). Design draws nothing for it except what Hugh has already ruled.
- **Copy.** Wording for copy-review.

Canvas with every board from both addenda: https://claude.ai/artifact/Re9dZJJQDtwwasY7WsjbgK

**All new wording on these boards is draft.** It goes through `copy-review` before it ships.

The admin answers are in [`../../design_handoff_admin_redesign/addendum-3/README.md`](../../design_handoff_admin_redesign/addendum-3/README.md).

The boards are built on the approved B+ kit, addendum 2's helpers, and the Edit your Concerts kit. Where they contradict an earlier board, they win. Addendum 2's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg`.

| folder | what it settles |
|---|---|
| `01-widths` | Lane 11 and 9d: the offline header at 640, 900 and 1100, and the event hero title at 320 |
| `02-no-longer-listed-rows` | ec1: the Watching and Browse row for a No longer listed show |
| `03-notification-tab-states` | 9d #138: a tab that's empty, loading or couldn't load |
| `04-edit-your-concerts` | The cf pre-audit: menus, remove states and toasts, the event page after removing, the desktop past event, the Add sheet's states, one stamp shape, and the ⋯ target |

## Rules this addendum sets

1. **The header under 1024.** Search becomes an icon button. The offline pill drops "· cached OK" and reads "Offline". Under 768, the wordmark becomes the mark. Nav labels never truncate. When the filter bar can't fit, it becomes the phone chips row under the header (`01/header-640`, `01/header-900`, `01/header-1100`).
2. **Long titles step down, never clip.** A hero or stat title wraps at spaces. A single word that can't fit steps down one size at a time (38, 30, 26 for the hero), and never uses an ellipsis or a mid-word break (`01/hero-320-wrap`, `01/hero-320-long-word`). The same goes for venue stats ("Amphitheater").
3. **Days-ago range.** Today, Yesterday, then "{N} DAYS AGO" up to 30, then the date ("OCT 2"). The past twin of DAYS AWAY.
4. **One stamp everywhere.** The shared VenueStamp: round, straight, filled in the venue's stamp color, on every row, the Passport and the share card (`04/one-stamp-m`).
5. **Tap targets.** Every ⋯ is a 44px target with an 18px glyph (`04/menu-hit-target-m`).

## B7 Browse calendar week strip

| row | answer |
|---|---|
| Genre dots vs volume | **Ruling:** volume dots are accepted (up to three, signal). |
| Desktop skeleton bar | **Confirmed:** it follows main's bar now, and B6a's when that lands. |

## B9b Price counter

| row | answer |
|---|---|
| Rail icon tile and close | **Keep.** They're built in slice two, as drawn. |
| Success card preview | **Keep.** Built in slice two. |

## B11 Venues

| row | answer |
|---|---|
| Venue art | **Ruling (Hugh, 2026-11-10):** the icon set replaces the scenes. The hero is the venue's glyph, large and in neon, over a quiet two-stop backdrop. The simplified build is accepted, and no multicolor skyline is owed. |
| Name gradient | **Ruling:** the last word that isn't a generic venue noun (Theatre, Theater, Hall, Club, Nightclub, Ballroom, Lounge, Pavilion, Amphitheatre, Arena, Room). A one-word name takes it whole, so Red Rocks → "Rocks" and The Church Nightclub → "Church". |

## B12 My shows

| row | answer |
|---|---|
| Dashed find card | **Confirmed** removed. |
| Desktop empties | **Confirmed:** the phone layout, centered in a 560 column. The empty art as built is fine. |
| Artists skeleton headline block | **Drop the block.** The skeleton follows the live page. |
| "Artists 271" with no follows | **Confirmed** hidden. |

## B13, B14, B18, B20a, B21, B22a, B23

| row | answer |
|---|---|
| B13 Jump to threshold | **Confirmed:** desktop, more than 4 nights. |
| B14 crew been empty | **Confirmed:** `EmptyState layout="card"`. |
| B18 account icon rows | **Confirmed:** mail and document glyphs. This also settles 9d #156. |
| B20a signed-in error page | **Confirmed:** Go home. |
| B21 How prices work | Hugh. Until he rules, the card has no link. |
| B22a install pill order | **Ruling:** the target is left of search, as drawn. The live order is fine until B17. |
| B22a iPhone sheet × | **Confirmed:** keep the shared ×. |
| B22a dismissed card | **Confirmed:** a fixed status card. |
| B23 launch timeline | **Confirmed.** |

## A4, A5, W3, other fixes

| row | answer |
|---|---|
| A4 chip with openers, hero | **Confirmed:** the chip goes after the whole title block, openers included, and under the title until B8. |
| W3 card placement | **Confirmed:** the card ends the main column, after the player. |
| W3 no genres, no match | **Confirmed.** |
| W3 withdraw failure | **Confirmed:** the error sheet pattern. |
| W3 429 and lost session | **Confirmed:** the error sheet pattern. The bodies are Copy. |
| W3 signed-out tap | **Ruling:** sign in. The app is free (Hugh, 2026-11-11), so there's no tier picker. The same holds for every signed-out tap below. |
| Vendor picker selected | **Confirmed.** |
| Follow nudge and push sheet | **Confirmed:** one at a time, nudge first. |

## Undrawn widths (lane 11)

| row | answer |
|---|---|
| 640 top nav while offline | Rule 1, `01/header-640`. |
| 320 hero title | Rule 2, `01/hero-320-wrap`, `01/hero-320-long-word`. |
| Status card on the public share page | **Ruling:** the same status card, read-only, with no Watching action. A No longer listed show also gets the NLL card. |
| Source line for an admin-set status | Hugh. **Proposal:** "Confirmed by Concert Crawl · {age}". Until he rules, the drawn line ships. |
| Sold out "We'll watch it." | Hugh + Copy. |

## Lane ec1

| row | answer |
|---|---|
| The NLL row | **Boards** `02/nll-row-watching-m`, `02/nll-row-browse-d`. It's dashed, with no genre edge or wash. The photo is in grayscale. The chip and the source line replace the meta row, and the dismiss × stays. |
| The public page's NLL card | **Ruling:** yes, the same card. |
| Contrast | **Ruling:** raise the chip and source line to `--fg-muted` (#9AA8C7), which clears 4.5:1 on both grounds. The 02 boards draw it. |
| Launch kill switch delay | Hugh. |

## New from addendum 2

| row | answer |
|---|---|
| "As built is fine" | **Confirmed:** it means live main, so the held PRs change back. |
| Precedence | **Ruling:** README rules win over a board. #178 item 5 was a named exception, not a precedent. |
| Items 25 and 29 | **Confirmed:** item 25 is the fan rule and item 29 the admin rule. |
| Item 21, failed refresh | Eng for detection. **Design's intent:** a failed refresh while online closes with the error toast, and the pill shows only when truly offline. |
| Item 14 banner copy | **Confirmed** new copy, for copy-review. |
| Item 22 translate | **Confirmed:** an example. Derive it from the viewport. |
| Item 20 shelf | **Confirmed:** the addendum wins on desktop too. |
| Item 12 delisted_at | Eng (carry it). |

## Lane 9d

| row | answer |
|---|---|
| Header 640 to 1023 | Rule 1. |
| Notification tabs | **Boards** `03/notif-tab-empty-m`, `03/notif-tab-loading-m`, `03/notif-tab-failed-m`. Each tab gets an unread dot. An unknown category goes under Alerts (#178). Sold out uses the phone board's glyph. |
| Status banner, unsafe VIEW, time-ago | **Ruling:** with no safe URL, VIEW is dropped and the method line reads without a link. The time-ago follows the source, as on the status card ("· 2H"). |
| Submitted prices filters | **Ruling:** Live is published and corroborated. Price checks is disputed. Stale and archived are under All only. An empty filter uses B+'s filter-empty pattern. |
| Avatar band | **Ruling:** solid, with no stripe. |
| Account row with no handle or name | **Ruling:** "Your account". |
| Glyphs | B18. |

## Lane a6

| # | answer |
|---|---|
| 1 | **Ruling:** a day with shows but no known genre keeps one signal dot. |
| 2 | **Ruling:** #178 wins at every width (addendum 2 item 20). |
| 3 | **Ruling:** See all shows only past five cards. |
| 4 | **Ruling:** the My artists filter. |
| 5 | **Ruling:** Design meant the genres of the artist's shows, mapped to the 16 buckets. A new artist-level field isn't needed. |
| 6 | **Ruling:** the loaded card (200 × 250 at −2°) is right. The skeleton changes to match it, so there's no jump. |
| 7 | **Ruling:** the same skeleton on desktop, at −2°. |
| 8 | **Ruling:** the skeleton copies the loaded card's radius and outline. |
| 9 | **Ruling:** keep the back + name bar. |
| 10 | **Ruling:** the shared ChipGroup wins. One chip system. |
| 11 | **Ruling:** the shared primary button wins. |
| 12 | **Confirmed:** #178. Wrapping on phones is fine. |
| 13 | **Ruling:** the board wins (no date tile). |
| 14 | **Ruling:** keep the tile on light boards too. |
| 15 | **Ruling:** the shared BackChip and type scale win. |
| 16 | **Confirmed:** Light only. |
| 17 | **Confirmed:** Done closes the card and keeps the error ID. |
| 18 | **Confirmed:** 408 and 425 are temporary. |
| 19 | **Confirmed:** bare outside `(main)`. |
| 20 | **Confirmed:** shared wording. |
| 21, 22, 25 | Rule 4: the shared VenueStamp, the dashed NEXT stamp, and the PNG share card too. |
| 23, 24, 26 | **Confirmed** as built. |
| 28 | Rule 2 (step down, no mid-word break). |
| 29 | Rule 1: under 1024, the phone chips row. |
| 30 | **Confirmed:** anonymous. |
| 31 | **Confirmed:** the real time. |
| 32 | **Ruling:** the viewer's own update, labeled as theirs. |
| 33 to 36 | **Confirmed** as built. The error rail is in danger. |
| 37, 38, 40 | **Confirmed** as built. |
| 39 | **Confirmed:** a staging slip. |
| 41 | **Ruling:** highlight every chosen vibe. |

## Edit your Concerts

| # | answer |
|---|---|
| 1 | **Ruling:** the README wins. The desktop ⋯ shows on hover, on focus and while open. |
| 2 | **Board** `04/past-menu-m`. The phone gets the menu, so Share is reachable. |
| 3 | **Boards** `04/upcoming-menu-m`, `04/upcoming-menu-d`. Not going anymore has no confirm, and its toast has Undo. |
| 4 | **Ruling:** at 320 the row wraps to a fourth line, and the date never truncates. Every density gets the ⋯ (rule 5). |
| 5 | **Board** `04/event-after-remove-m`. |
| 6 | **Boards** `04/removed-top-m`, `04/removed-last-m`. |
| 7 | **Board** `04/removed-d`: bottom center, one at a time. A new toast replaces the old one. |
| 8 | **Ruling:** the Passport counts past nights only, so the board's 5 is a slip for 4. |
| 9 | Hugh. |
| 10 | **Ruling:** the dual dismiss is intended. **Boards** `04/remove-busy-m`, `04/remove-failed-m`. |
| 11 | **Board** `04/removed-no-undo-m`. |
| 12 | **Ruling:** it returns to its month slot, with `--motion-base` fade. |
| 13 | Eng. |
| 14 | **Ruling:** the existing poster is right. The fields are Eng. |
| 15 | **Board** `04/menu-flip-focus-d`. |
| 16, 17 | Hugh (17 with Eng). |
| 18 | Deliberate state switching. |
| 19 | **Ruling:** drop the ⓘ. |
| 20 | **Confirmed.** |
| 21 | Rule 3. |
| 22 | **Ruling:** signed-out goes to sign-in (the app is free, so everyone signed in is entitled). Hugh to confirm. |
| 23, 24 | Hugh. |
| 25 | **Ruling:** signed-out shows the outline "I went" pill, and a tap goes to sign-in. Past 50, a "Show older" row loads the next 50. |
| 26 | **Ruling:** the footnote stays. |
| 27 to 30 | Hugh / Eng. |
| 31 | **Boards** `04/event-past-d`, `04/event-past-remove-d`. |
| 32 | **Boards** `04/add-loading-m`, `04/add-error-m`, `04/add-tap-failed-m`. Offline uses the offline pill. Paging is skeleton rows on scroll. A failed Undo is the error toast. |
| 33 | Draft strings, for copy-review: "Couldn't load shows." / "Try again" / "Couldn't stamp that one." / "Couldn't undo." / the pill's name "I went to {artist}, {date}" / "Clear search" / "1 SHOW". |
| 34 | **Ruling:** the note sits at the top of the unsearched list only. It scrolls away and hides while searching. |
| 35 | **Ruling:** the footer shows at the end of any list with no next page, worded for its scope. |
| 36 | **Board** `04/add-my-venues-empty-m`. |
| 37 | Eng. |
| 38 | **Ruling:** only the venue name truncates. The date never does. |
| 39 | **Board** `04/add-unmark-m`. For multiple taps, the newest toast replaces the last. |
| 40 | **Ruling:** the toast sits inside the sheet, above its bottom edge, and clears on Done. |
| 41, 42 | Hugh. |
| 43 | **Board** `04/add-two-scopes-m`. |
| 44 | **Ruling:** 92% tall, and the drag handle dismisses. The header (search + chips) is sticky. The keyboard shrinks the list, not the header. |
| 45 | **Boards** `04/add-search-d`, `04/add-tapped-d`. |
| 46 to 49 | Hugh / Eng. |
| 50 | **Board** `04/removed-last-m` (the Add row under the empty state). |
| 51 | Hugh / Copy. |
| 52 | **Ruling:** accept a theme check. The build-vs-design check adds a Light screenshot, and the pills use tokens. |
| 53 | Rule 4, `04/one-stamp-m`. |
| 54 | Hugh. |
| 55 | **Re-filed** as Design gaps and answered by this addendum (rows 3, 32, 45, 50). |
| 56 | **Signed off.** The Undo toast is `role="status"`. The ⋯ menu uses arrow keys, and Esc returns focus to the ⋯. The pill uses `aria-pressed`. |
| 57 | Rule 5, `04/menu-hit-target-m`. |

## Proposals for Hugh

- The source line for an admin-set status: "Confirmed by Concert Crawl · {age}".
- Signed-out taps go to sign-in everywhere (W3, Edit your Concerts 22 and 25), following the free decision.

## Build-vs-design check

1. Screenshot each built state at 320, 390 and 1280, plus Light for Edit your Concerts. Put each beside its board in `screens/`.
2. Compare side by side:
   - spacing, type, radii
   - chip centering
   - one glow per screen
   - stamps (rule 4)
   - tap targets (rule 5)
3. Run the vocabulary grep over new strings.
4. List every difference under "Differs from the board", with a reason.

## Self-review

The boards were checked against the approved B+ boards, addendum 2 and Edit your Concerts. They use the same header, rows, sheets, toasts and stamps.

- **Glow.** One per screen.
- **Contrast.** The NLL text was raised to muted.
- **Dates.** The desktop past event uses Fri, Nov 6 in both the hero and the dialog.
- **Vocabulary grep.** Clean, with two exceptions. Whole-string "—" placeholders are allowed. The approved event page's artist "Following" button appears in the background of `04/event-past-*`, and it's the lane's copy-review item.
