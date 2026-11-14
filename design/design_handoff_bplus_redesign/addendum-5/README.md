# B+ and admin · Design addendum 5 (2026-11-14)

Design's answers to the 2026-11-14 build-fidelity audit: 14 items where the B+ or admin boards disagree, or don't draw something a drawn screen needs. Each item gets a ruling, a board, or both.

Canvas: https://claude.ai/artifact/FPx85FGiKrmVKStqwTE4Zb

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. These boards win over any earlier board they contradict; the earlier addenda's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg` (2x JPG); the HTML is in `boards/`. Admin boards use the admin kit, B+ boards the B+ kit; both live in this one folder so the audit has one place to look.

**Build-vs-design check:** before the PR that builds any of this is ready, screenshot each touched screen at 320, 390 and 1280 (and at 768 for item 10) against these boards and list the diffs in the PR body. One component per status: the admin uses the fan `StatusChip`, never a local pill.

| # | Item | Answer |
|---|---|---|
| 1 | Confirm-price sheet | **Ruling:** the rail header wins and **keeps the detail card**. The accent is the price's trust colour: signal for community, gold for box office. `01/*` |
| 2 | Admin Events status chips | **Ruling:** README rule 3 wins, the fan `StatusChip`. `02/*` |
| 3 | ⓘ on the past "That night" card | **Ruling:** dropped, per addendum 3 item 19. The two boards that still draw it are superseded. No board. |
| 4 | Event edit, undrawn states | **Drawn:** venue picker, date and time pickers, picked filter chips, past show, Listed again, Add-a-show errors. `04/*` |
| 5 | Hide from site, events | **Decided with Hugh (2026-11-14): A**, no Why chips for events. `05/hide-event-a-d` |
| 6 | Venue Details: City and fallback art | **Ruling:** City is drawn (beside Neighborhood). The fallback-art preview and Roll go. `06/*` |
| 7 | Map pin with no geocoder | **Decided with Hugh (2026-11-14):** entered by hand, as built, with a Maps link. `06/*`, `07/map-pin-states` |
| 8 | Link to the venue's own site | **Drawn:** in the venue header, for every venue. `08/venue-header-links` |
| 9 | Settings role chips | **Drawn:** ADMIN, PROMOTER, BETA, none. `09/role-chips-m` |
| 10 | Tablet, 640 to 1023 | **Decided with Hugh (2026-11-14): A**, the phone layout up to 1023. `10/tablet-a` |
| 11 | Phone venue page icon size | **Ruling:** about 140pt, as `10-venue-art/hero-m-redrocks`. No board. |
| 12 | Add a venue: gap 3 and Arena | **Already answered.** Gap 3 is in the phone addendum (#175); Arena is the crescent (Hugh), built in `VenueBackdrop`. Nothing is held. |
| 13 | Held B+ items | **Ruled** one by one below; "How prices work →" **decided with Hugh (2026-11-14)**: the tour's How it works step. `13/hex-patch-and-theme-mark` |
| 14 | Admin extras with no board | **Keep all four, drawn.** `14/*` |

## 1. Confirm-price sheet

`06-states/bp-s-confirm_price_m` and `08-prices-and-status/more-p-check_m` disagree. **The rail header wins** (mark tile, dot, "PENDING · 1/2", ×): every B+ sheet uses it, and addendum 3 kept it on the price counter. The plain "CONFIRM PRICE" eyebrow and the Cancel text button go; × closes.

- **Keep the detail card** (price, trust pill, VENDOR / BY / WHEN) under the title and lede. It's the only place the sheet says what you're confirming.
- **Accent:** neither pink nor green. Pink is Sold out and green is Tickets available, both show states. The accent is the price's own trust colour, as the live `CorroborationSheet` already does: **signal** for a community price, **gold (warning)** for a box-office price. It colours the rail dot and code, the detail card, the selected option and radio, and the CTA. The CTA is solid in that colour with dark text (not the `--cta-end` gradient: this sheet's colour carries meaning).
- A box-office price has the two live answers (`01/confirm-price-box-m`). Desktop is the same body in the dialog (`01/confirm-price-d`).

## 2. Admin Events status chips

**README rule 3 wins:** the fan app's `StatusChip` (uppercase mono, tinted rectangle), the same component, not a lookalike. The sentence-case dot pills in `06/events` and `06/events-mobile` are superseded, and so is the header pill on Event edit.

- Colours are the fan ones: Sold out accent, Postponed warning, Cancelled danger, Tickets available success, Moved signal, No longer listed the grey dashed chip (addendum 2), Played subtle.
- **Hidden is not a status.** A hidden show keeps its status chip, and gets a muted "HIDDEN · UNSURE" or "HIDDEN · BY ADMIN" tag under the title (`hiddenReasonSql`).
- The **status filter's menu and the Event edit status picker** stay selectable `fchips` in sentence case: they're controls, not chips.

## 3. The ⓘ on the past "That night" card

**Dropped**, as addendum 3 item 19 ruled. `event-past-d` and `event-after-remove-m` in addendum 3 still draw it; they're superseded on that one point.

## 4. Event edit: the undrawn states

- **Venue picker, open** (`04/venue-picker-d`, `-m`): a searchable list under the field on desktop, a sheet on the phone. Each row is the venue glyph and name; the current venue has a check. Hidden venues come last, muted. Changing the venue on an upcoming show is the existing Moved flow.
- **Date and time** (`04/date-picker-d`, `04/time-picker-d`): one-month popover, today ringed, the date filled with the gradient, a Today button. Past dates are allowed here (corrections). Time is a text field with a half-hour list under it; typing any time works. Doors and Show share it. **Postponed's "New date" uses the same date picker** (only future dates). **On the phone, use the OS date and time pickers** behind the same field style; nothing custom.
- **Filter chips after a pick** (`04/filter-chips-picked`): the chip shows the pick in the active style with a ×. One venue: its glyph and short name (addendum 4). Two or more: "Red Rocks +1". One status: the `StatusChip` itself; two or more: "2 statuses". Tapping the chip reopens its menu.
- **A past show** (`04/past-show-d`): tapping it opens the same edit page, with a banner. Title, lineup, venue and times stay editable as corrections and notify nobody. Status is read-only (PLAYED), with Hide from site still there; price is read-only. The phone is the same, stacked.
- **Listed again** (`04/listed-again`): No longer listed shows as read-only text with why and since when, plus a **Listed again** button. Tapping it brings the status picker back with the status from before picked, as an unsaved change. Nobody is told.
- **Add a show, validation** (`04/add-show-errors-d`): errors under each field after Add show or on leaving a field: "Add a title.", "Pick a venue.", "Pick a date.", "That date has passed.", "Before doors.", "Enter a full link, starting with https://". Add show stays off until they're fixed. A show already at that venue that night gives an amber **warning** with "Open it"; it never blocks. The phone shows the same errors in its full-screen form.

## 5. Hide from site, events

Events store no hidden reason; the list derives "unsure" or "admin".

- **A (recommended):** no Why chips for events (`05/hide-event-a-d`). The confirm says what fans lose and that Watchers aren't told. The list keeps the derived tag.
- **B:** keep Why (Not a concert, Duplicate, Other), which needs a stored reason on events (`05/hide-event-b-d`).

**Decided with Hugh (2026-11-14): A.** No schema change; `05/hide-event-b-d` stays on the canvas as the option not taken.

## 6. Venue Details: City and fallback art

- **City** is drawn: beside Neighborhood in the Venue card (`06/details-d`, `-m`). Red Rocks is in Morrison and Fiddler's Green in Greenwood Village, so it matters. The "Other" card holding it goes.
- **Fallback art preview and Roll: removed.** The seed isn't saved, so Roll changes nothing a fan sees. If a saved seed is built later, it joins the Look card then.
- **Short name** (addendum 4, item 4) joins the Look card; it had no drawn home.

## 7. Map pin

**Recommended: entered by hand, as built** (`07/map-pin-states`): one "latitude, longitude" field, an **Open the address in Maps ↗** link to copy the pin from, and the live error. Empty means no Directions link for fans. No map preview. The board's "Set from the address." is superseded.

**Decided with Hugh (2026-11-14): by hand.** No geocoder is built.

## 8. The venue's own site

`08/venue-header-links`: the venue header gets the same pair as Event edit, **On Concert Crawl** then **On the venue's site**, for every venue, feed venues included. It opens Contact › Website, never the feed or calendar URL (those stay on Source). No website, no button. On the phone they're two links under the name; Re-crawl and ⋯ stay buttons. The old "View on site" button is this pair.

## 9. Settings role chips

`09/role-chips-m`: one chip at most, the B+ pill with its dot, centered on the handle. **ADMIN** warning (admins and sub-admins), **PROMOTER** accent, **BETA** signal, matching `ProfileHero`'s live role dots. Everyone else: no chip.

## 10. Tablet, 640 to 1023

- **A (recommended):** the phone layout up to 1023, desktop from 1024 (`10/tablet-a`). Bottom nav, the Filters button and sheet, one column that stops at 640 and centers. Nothing new to draw, and it fixes both clips.
- **B:** the desktop header and filter bar from 640, which needs a compressed header and an overflowing bar drawn for every screen.

**Decided with Hugh (2026-11-14): A.** Addendum 3's "header under 1024 collapses search to an icon" no longer applies: under 1024 is the phone header.

## 11. Phone venue page icon

**About 140pt**, as `10-venue-art/hero-m-redrocks`, the venue-art spec drawn after Hugh chose the icon set. `02-mobile/bp-m-venue_m`'s 218pt predates it and pushes the name below the fold.

## 12. Add a venue

Nothing is held. **Gap 3** (Add a venue start, Nobody asked yet, Gone live on phone) is drawn in `design_handoff_admin_redesign/phone-addendum/` (PR #175). **Arena** is the crescent moon, Hugh's call, already built in `VenueBackdrop`. READINESS marks 3e unblocked by design.

## 13. Held B+ items

- **Crews hex icon:** the generic crew patch where no crew exists yet (Crews empty, the empty crew lens, a stale invite). It's the crew patch (rim, weave and glow from addendum 4) holding the hex glyph in the default chord; the SVG is on `13/hex-patch-and-theme-mark`.
- **Square Passport stamp:** round, per addendum 4 item 7, including the PNG share card.
- **"How prices work →":** **decided with Hugh (2026-11-14):** link to the prices part of the existing How Concert Crawl works tour (`/onboarding?entry=menu`, the How it works step). No new page.
- **Pink mic Theme glyph:** a sketch of the live `MiniMark` (the CCMark in the active theme's tokens). **Keep `MiniMark` as built.**
- **Low-confidence "Hidden" chip:** the bar is the **code's 0.70**; copy reads it from the constant, never a typed number. The Hidden chip shows only when the show is actually hidden from fans (`is_concert_review_needed`).

## 14. Admin extras

**Keep all four.** They're working safety features, not placeholders.

- **Expected exception chip** (`14/runs-expected-d`, `14/expected-m`): in the venue header beside Live, the neutral pill. Its tip names the figure, who, when and why, and says to undo it on Runs.
- **Fault panel above Runs** (`14/runs-fault-d`, `14/mark-expected-d`): a full-width strip above the two columns, only while a fault is live: the run chip, the figure, and **Is this expected?**, which opens a centered dialog (Pinning, Why, Mark expected). Once marked, the strip folds to one neutral line with **Unmark**. It's distinct from Overview's "What's normal", which sets the usual range.
- **Partial run chip** (`14/run-chips-partial`): amber, between Low and Quiet: some pages read, some failed, the shows we read are kept.
- **First failure** (`14/runs-fault-d`): a danger pill before the first failed page's line in Run detail › Pages.
