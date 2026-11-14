# B+ and admin · Design addendum 6, batch 2 (2026-11-14)

Design's answers to batch 2 of the 2026-11-14 design prompt: items 15 to 43, each a real gap (undrawn, or two drawn sources disagree), vetted against `origin/main` and every handoff under `design/`, addendum 5 included. Numbers match the prompt; 17, 26, 27, 28 and 39 were not in this batch. Each item gets a ruling, a board, or both.

Canvas: https://claude.ai/artifact/KXxTjkCQpzdUFAQwbxad8F (its own canvas). Sources: `/mnt/project-files/design/batch-2/` in the project files (`b2.py` boards, `boards.py <dest>` exports, `canvas.py` builds the page).

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. These boards win over any earlier board they contradict; the earlier addenda's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg` (2x JPG); the HTML is in `boards/`. Admin boards use the admin kit, B+ boards the B+ kit; both live in this one folder.

**Build-vs-design check:** before the PR that builds any of this is ready, screenshot each touched screen at 320, 390 and 1280 against these boards and list the diffs in the PR body. Item 15 is checked at 320 × 568. One component per status: the admin uses the fan `StatusChip`, and every admin avatar is `PersonAvatar`.

| # | Item | Answer |
|---|---|---|
| 15 | Sheets on a short phone | **Drawn:** pinned footer, scrolling body, rail fixed. Confirm price keeps its pinned CTA footer. `15/sheet-short-phone` |
| 16 | Venue Guide: Publish is the whole guide | **Ruling:** yes, signpost it. The tab owns **Publish guide** and says what's unpublished; the section panel's main button is Save draft. `16/*` |
| 18 | Venue Source: Reader and Automatic | **Hugh's ruling, drawn:** Page loading keeps Automatic, the Reader selector stays, and **Back to Automatic** clears both. `18/*` |
| 19 | Event edit header, hidden show | **Drawn:** status chip, then the Hidden tag, then the date. `19/event-edit-hidden-header` |
| 20 | Price check on one tier | **Drawn:** only that tier's row shows the open check; on the headline tier, the card takes the band. `20/tier-price-check` |
| 21 | Hidden tag contrast | **Ruling:** 10px mono in `--fg-muted`, 7.5:1. `21/hidden-tag-contrast` |
| 22 | Hidden venue menu | **Hugh's ruling, drawn:** Pause crawling… / Resume crawling stay on a hidden venue's menu. `22/hidden-venue-menu` |
| 23 | Price checks on the phone: Resolved | **Drawn:** Open / Resolved chips, a list, and a read-only sheet. `23/*` |
| 24 | Admin avatars | **Ruling:** `PersonAvatar` everywhere (README rule 12). `06/submitted-prices-mobile`'s disc is superseded. No board. |
| 25 | Venue page loading | **Ruling:** the no-jump build wins. `07/loading-venue-page`'s 150px hero block is superseded. No board. |
| 29 | Auto-paused chip | **Ruling:** addendum 2 §29 wins: "Auto-paused" in list cells, "Auto-paused: 3 failures" in detail views. No board. |
| 30 | Crawl runs: the 4:10 AM retry | **Ruling:** one row per night, "retried at 4:10 AM", as built. No board. |
| 31 | Crawl runs: Next nightly crawl | **Ruling:** in the header (addendum 3, 1d ruling 26), as built. No board. |
| 32 | Posters: tap to enlarge | **Drawn:** Enlarge opens the real poster full screen. **Hugh decides** whether it ships or the line is dropped for good. `32/*` |
| 33 | Health Emails row | **Confirmed as built:** Sending, N failed, Quiet. `33/emails-states` |
| 34 | Where it's sold › | **Confirmed as built:** the › scrolls to that price's own card. No board. |
| 35 | Share sheet: selected shape tile | **Confirmed as built:** `--surface-3` under the gradient border. No board. |
| 36 | Admin past shows | **Drawn:** the Past tab with venue and status filters, the phone list and page, and the postponed show whose date passed. `36/*` |
| 37 | Activity log: days and filters | **Drawn:** the day picker and arrows, an older day, the Anyone and Any page menus, phone. `37/*` |
| 38 | Trust tones per theme | **Drawn:** three `--trust-*` tokens; Forge, Cedar and Gloss get a blue Community; Light darkens all three. `38/trust-tones` |
| 40 | Where it's sold card | **Drawn:** (a) the tier on every line, (b) the resale line. (c) **Hugh decides**; recommended: keep both. `40/where-its-sold` |
| 41 | Crew Coming up row | **Drawn:** six states. `41/crew-coming-up` |
| 42 | Invite code ended | **Drawn:** "Have another code? Enter it" back to the code form. `42/code-ended-way-back` |
| 43 | Approve one waiting price | **Drawn:** menu item and phone row action, in flight, approved with Undo, and failed. `43/*` |

## Decisions only Hugh can make

1. **Item 40c · resale shown twice.** On a box office + resale show, the resale price is in the price card and in Where it's sold.
   - **A (recommended): keep both.** The price card compares; Where it's sold is the full list of sellers, and every listed price has a row. Hiding one row makes the list incomplete exactly when there's a choice to make.
   - **B:** hide resale from Where it's sold when the price card already shows it.
2. **Item 32 · the enlarged poster.**
   - **A (recommended): ship it** (`32/poster-enlarged-m`). On a phone the 180px preview is too small to check the code and QR before printing a sheet that goes on a wall.
   - **B:** drop "tap to enlarge" for good and keep the small preview.

## 15. Sheets on a short phone (320 × 568)

`15/sheet-short-phone` draws Confirm price at 320 × 568, opened and scrolled to the end. One rule for every B+ sheet with a main action (Confirm price, Submit a price, Price update, Filters, Share):

- The sheet stops **24px** below the top of the screen. Taller content scrolls inside it; the page behind never scrolls.
- The **rail header** (mark, dot, eyebrow, code, ×) stays put. Once the body scrolls, a hairline appears under it. At 320 its eyebrow and code stay on one line.
- The **main action** is in a pinned footer: `--surface-2`, a hairline on top, 12px above and 20px plus the safe area below. A 22px fade above it shows there's more, and goes at the end.
- Secondary links (Submit an update instead) stay in the body, last.
- A sheet that fits keeps the same footer; only the fade and the scroll bar go.
- Desktop dialogs follow the same rule, capped at the window height minus 80px.

**Confirm price (#436) keeps its pinned CTA footer:** that's the rule.

## 16. Venue Guide: Publish acts on the whole guide

**Yes, signpost it.** Publishing is per guide, so the control lives on the guide:

- The Guide tab gets a bar when anything is unpublished: "**3 changes not published:** Bag check, Accessibility and Age. Fans still see the published guide." with **Publish guide** (`16/guide-tab-d`). Each section row's pill reads Draft, Edited, Published or Not written.
- The section panel's main button is **Save draft** (this section). **Publish guide** sits beside it as the secondary button, with a line above naming every change it puts live (`16/guide-panel-d`).
- Phone: the same bar above the section list, full-width button (`16/guide-m`).

## 18. Venue Source: Page loading and Reader

**Hugh's ruling:** keep the Reader selector and a way back to Automatic, drawn in the Source panel.

- **Advanced, open** is its own full-width card under the two columns (`18/source-advanced-d`), so the columns stay even. Two by two: Page loading and Reader on top, Wait until and Wait for below.
- **Page loading:** Automatic · Plain fetch · Full browser. Automatic is `crawl_mode = null`.
- **Reader:** Automatic · JSON-LD only · Haiku only · Detail pages. Automatic is the cascade; Detail pages is the `detail-page` platform; moving off it clears the platform (as built in `source-rules.ts`). Its hint says what the pick does; forced picks say "Set by hand".
- **Advanced, closed:** with everything automatic, the line says "All automatic". With anything forced, each forced setting shows as an amber chip ("Reader: Haiku only") with **Back to Automatic** (`18/source-forced-d`, `18/source-advanced-states`).
- **Back to Automatic** sets Page loading and Reader to Automatic as an unsaved change; Save source saves it. Wait until and Wait for are left alone.
- Phone: the same controls stacked; Reader wraps as chips (`18/source-advanced-m`).

## 19. Event edit header: a hidden show

`19/event-edit-hidden-header`: the fan `StatusChip`, then the Hidden tag ("HIDDEN · BY ADMIN" or "HIDDEN · UNSURE", the same derived reason as the Events list), then the date and venue, on one line. No tag when the show isn't hidden. On the phone the tag sits beside the chip under the title and wraps to its own line before it truncates.

## 20. A price check on one tier

`20/tier-price-check`:

- A price check belongs to one tier. Only that tier's row changes; the headline and the other tiers stay live.
- **Another tier:** the row takes the open-check look of the single-price disputed card: warning left edge and tint, UPDATE PENDING, old → new?, who and when, and Submit an update.
- **The headline tier:** the whole card takes the band, as the single-price card does, and Still this price? gives way to Submit an update.
- Where it's sold keeps the live price for that tier until an admin picks one. After review the row goes back to plain, with the single-price card's outcome line.

## 21. The Hidden tag's contrast

**Ruling:** the tag is **10px JetBrains Mono in `--fg-muted`** (#9AA8C7), the eye icon the same colour: 7.5:1 on the row ground, 8.2:1 on the page. As drawn (9px in `--fg-subtle`) it was 3.2:1. It stays quieter than the status chip because it has no fill or border. The token passes in every theme (`21/hidden-tag-contrast`). This applies to the Events list rows and the Event edit header (item 19).

## 22. Hidden venue menu

**Hugh's ruling:** keep Pause/Resume crawl for a hidden venue (`22/hidden-venue-menu`).

- **Hidden, not paused:** Show on site ("Crawling starts again tonight."), **Pause crawling…** ("Keeps crawling off once it's shown."), then Delete venue… and Take down….
- **Hidden and paused:** Show on site ("Crawling stays paused: off-season."), **Resume crawling** (the pause's own line, "Starts when it's shown."), then the same two.
- Pause opens the same Pause panel (`03/pause-panel-d`), the sheet on the phone.
- The second chip follows addendum 3 (3a #13): "Not crawled" when hidden, the pause chip ("Paused: off-season") when paused.

## 23. Price checks on the phone: Resolved

`23/checks-resolved-m`: Open / Resolved chips under the Checks tab. Each resolved row: show, venue and date, who decided and when (PersonAvatar), the answer pill (Used $X in success, Kept $X neutral), and a chevron. Five at a time, then Load more. A row opens a read-only sheet (`23/checks-resolved-detail-m`): the two prices with the used one outlined, Decided, Told, Note, and Open show / Open ticket page.

## 24. Admin avatars

**`PersonAvatar` everywhere** (README rule 12): the disc washes each person's two colours at 30% over the page, the ring is the same two at full strength. `06/submitted-prices-mobile`'s disc (one-colour edge) predates it. Every avatar on this addendum's boards is drawn as `PersonAvatar`.

## 25. Venue page loading

**The no-jump version wins.** The skeleton matches the loaded `04/venue-overview` header (glyph, name, chips, tabs); `07/loading-venue-page`'s 150px hero block is superseded, since the loaded page has no hero there.

## 29. Auto-paused chip on the Venues list

**Addendum 2 §29 wins:** list cells read "Auto-paused", with the failure count in the latest-run line; detail views and Needs you read "Auto-paused: 3 failures". `venues-select-d` in addendum 3 is superseded on that one point.

## 30. Crawl runs: the 4:10 AM retry

**One row per night**, as built: the night's row reads "retried at 4:10 AM" in its run line, and its run detail lists both attempts. The board's separate "Didn't start" and "Nightly retry" rows are superseded.

## 31. Crawl runs: Next nightly crawl

**In the header**, per addendum 3 (1d ruling 26): "Next nightly crawl: tonight at 3:00 AM MT", on desktop and phone. The board's footer placement is superseded.

## 32. Posters: tap to enlarge

`32/poster-preview-m`: the preview shows the real poster (the approved invite poster, Night) with an **Enlarge** button. `32/poster-enlarged-m`: Enlarge opens it full screen over the page on solid black, with the look and code on top, ×, "Pinch to zoom. Check the QR scans before you print.", and Back / Print at the bottom. Desktop needs nothing: its preview is already large.

**Hugh decides** (top of this file): ship it (recommended), or drop the line for good.

## 33. Health › Emails row

**Confirmed as built** (`33/emails-states`), from `StatusBadge`:

- **Sending** (success): the last send in 24 hours was accepted.
- **N failed** (danger): any send in 24 hours that Resend refused or that bounced. The line says how many of how many, and the row opens Operations › Emails filtered to failed.
- **Quiet** (neutral): nothing went out in 24 hours. Not a fault: most days no show moves.
- Failures win over Quiet.

## 34. Where it's sold: the ›

**Confirmed as built:** no per-vendor link is stored, so the row's › scrolls to that price's own card on the page. It never links out. If a per-vendor URL is stored later, the row can open it then.

## 35. Share sheet: the selected shape tile

**Confirmed as built:** the selected tile is `--surface-3` under the gradient border (the B+ `gborder`), its glyph in `--signal` and its label in `--fg` at 700. Unselected tiles: a 1px `--border-strong`, glyph and label in `--fg-muted`.

## 36. Admin past shows

Addendum 5's `04/past-show-d` (the desktop past-show editor and its banner) stands. New:

- **The Past tab** (`36/past-d`): the same table as Upcoming, newest first, with **venue and status filters** beside Upcoming / Past. The whole row opens the past-show editor; the chevron shows on hover, as on Upcoming. "Load older" pages back.
- **The status filter** (`36/past-status-menu-d`) lists only past statuses: Played, Cancelled, Postponed, No longer listed, each as its `StatusChip`. Multi-select, as every admin filter (addendum 2).
- **Phone** (`36/past-m`, `36/past-show-m`): the list as cards (date tile, title, venue glyph, price, "N went", status chip), and the past-show page stacked: banner, Show, Status, Price, with a pinned Save bar once something changes.
- **A postponed show whose original date passed** (`36/postponed-passed-d`): it is never PLAYED. It keeps the Postponed chip, and the list adds "No new date yet" in amber under it. Its editor is the upcoming one (not the read-only past one), headed "Was Fri Nov 6", with an amber banner: the date passed, it stays Postponed until it gets a new date or is cancelled. The New date field is highlighted. Nothing changes on its own.

## 37. Activity log: days and filters

- **Day picker** (`37/log-day-picker-d`): on the right of the filter row, ‹ and › step one day; the day chip opens a one-month popover. A dot marks days with changes, future days are off, and **Today** jumps back. › is off on Today.
- **Older days** (`37/log-older-day-d`): the chip shows the day ("Tue, Nov 10"). The table ends with "That's everything on Tue, Nov 10." and links to the days either side. A day with more than 50 changes gets Load more before that line.
- **Anyone and Any page** (`37/log-filter-menus`): single-select menus under their chips. Anyone lists every admin and sub-admin with their PersonAvatar and today's count, you first, with a search once there are more than 8. Any page lists the sidebar's pages in its order. Once picked, the chip shows the pick with a × (addendum 5 #4). Search, person, page and day all combine; an empty result keeps the drawn "Pick another day, or anyone".
- **Phone** (`37/log-m`, `37/log-filter-sheet-m`): search, then a full-width day stepper (the middle opens the OS date picker, addendum 5 #4), then Anyone and Any page, each opening a sheet. This answers the question that the phone had search only.

## 38. Trust tones in every theme

`38/trust-tones`. Three new tokens, **`--trust-community`, `--trust-boxoffice`, `--trust-resale`**, used by every trust pill, the trust-coloured accents in Confirm price (addendum 5 #1), and the resale line in item 40. They default to `--signal`, `--warning` and `--danger`, so Electric, Jade, Pulse, Blue Note and Drip don't change.

| Theme | Community | Box office | Resale | Why |
|---|---|---|---|---|
| Forge | **#8FB3D9** (was #C8211A) | default | default | Community was a red beside Resale, and 3.1:1 |
| Cedar | **#8CC7E8** (was #D89A8A) | default | default | Community was a dusty red beside Resale |
| Gloss | **#A9B4FF** (was #FF5BA1) | default | default | Community was a pink beside Resale |
| Light | **#006A85** (was #0080A0) | **#8F5500** (was #B86E00) | **#B3243A** (was #C42940) | All three were under 4.5:1 at 9.5px |

Every pill passes AA small text (4.5:1) on its own 8% tint over `--surface-1`; the board prints each ratio. Only the trust pills change: `--signal`, `--warning` and `--danger` keep their values everywhere else.

## 40. Event page: Where it's sold

`40/where-its-sold`:

- **(a) Box office rows carry the tier:** "{tier} · face value · no fees", so two box office tiers never read alike.
- **(b) The resale line:** "{tier} · resale · all-in", with "resale" in `--trust-resale`. The letter tile stays neutral.
- **(c) Box office + resale:** **Hugh decides** (top of this file). Recommended: keep both. The price card compares; Where it's sold is the full list of sellers.

## 41. Crew page: the Coming up row

`41/crew-coming-up`, for the crew page as shipped (still behind the crews flag). The row: the gradient date tile, the artist photo, time and venue, and who's going. Sorted by date; tapping a row opens the show.

- **Just you:** "1 GOING · YOU", as drawn.
- **You and others:** up to three faces, then the count: "4 GOING · YOU, MIRA +2". You're named first.
- **Others, not you:** their names, and **I'm in** on the right, which is the same Yes, going.
- **Tonight:** the tile reads TONIGHT, and the row leads the list.
- **Postponed or cancelled:** the fan `StatusChip` under the going line. A cancelled show leaves after a day.
- **Nothing yet:** "Nothing coming up. One yes from anyone in the crew puts a show here." with Find a show, in the Been there card's dashed style.

## 42. Invite code ended: the way back

`42/code-ended-way-back`: a third, quieter way out under the two buttons, **"Have another code? Enter it"**, which opens `/auth/code` empty and focused. The ended code isn't carried over. Desktop is the same page in its centered column.

## 43. Submitted prices: Approve one waiting price

- **Desktop** (`43/approve-menu-d`): **Approve** is the first item in a waiting price's ⋯ menu, in success, above Open show, Open ticket, Other prices, Edit price and Reject…. Its line says what it publishes and how many fans back it. No confirm dialog: it's undoable.
- **In flight** (`43/approve-busy-d`): the row tints and its state reads "Approving…" with a spinner; the menu is closed and the row can't be acted on.
- **Approved** (`43/approve-done-d`): the state reads "Published by you" in success, the counts move (Waiting 1, Published 44), and a toast says "Approved. $68–$75 is live on FKJ. The fan who sent it is told." with **Undo**. Under Waiting for you the row stays until you leave the filter, so Undo has something to point at; under All it updates in place.
- **Failed** (`43/approve-failed-d`): the row stays Waiting, its state reads "Didn't approve" in danger, and a toast says "Couldn't approve that price. It's still waiting. Nothing changed." with **Try again**.
- **Phone** (`43/approve-m`, `43/approve-sheet-m`): a waiting row carries an **Approve** button (soft, not the gradient: one per row) and ⋯; in flight the button shows the spinner. The ⋯ sheet repeats the desktop menu with Approve first. The same toast sits above the tab bar.
- The Needs you batch sheet is unchanged.

Code: `apps/web/src/components/admin/prices/SubmittedTab.tsx`.
