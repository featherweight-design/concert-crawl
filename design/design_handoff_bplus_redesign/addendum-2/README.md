# Addendum 2: gaps and conflicts found while building (2026-11-12)

Answers to the 29 questions engineering raised while building the B+ redesign and the admin redesign. Each item has either a drawn board (in `screens/` and `boards/`, by item number) or a written ruling. **As built is fine** means the build is right and nothing changes. Where the build is wrong, the board draws the fix.

How to read this:

- Every board is made from the approved B+ and admin kits. Nothing here adds a color, a token, a component style or an icon.
- Where the question gives us a conflict, the **README rules win over a board**, and **live copy wins over a board's wording** unless a board was drawn to change it.
- New strings are marked **(new copy)**. They need the `copy-review` pass like any other copy.
- Questions that need Hugh or design are collected at the end under **Open questions for design**. Engineering should build the ruling given here in the meantime, because each one is the safest reading.
- Several questions in the brief were cut off mid-sentence (17, 18, 24 to 29). For those, the section starts with how we read the question.

Live canvas: https://claude.ai/artifact/DjFFjh1j5Nt9G9hJ7CWCm2. The phone addendum for admin gaps 1 to 4 is separate (PR #175).

## A. Contradictions

### 1. Notification tabs: which tab does each item go in?

**Drawn:** `01-notification-tabs/notif-shows-m`, `notif-alerts-m`, `notif-prices-m`. The tabs stay. Each category belongs to exactly one tab:

| Tab | Categories (`apps/web/src/lib/notifications.ts`) |
| --- | --- |
| **Shows** | `watch.cancelled`, `watch.postponed`, `watch.soldout`, `watch.backonsale` (something changed on a show you're Watching) |
| **Alerts** | `artist.new_show`, `artist.report_fixed`, `crew.going`, `crew.joined`, `crew.left` (news about artists you follow and your crews) |
| **Prices** | `watch.pricedrop`, `contest.resolved`, `contest.needs_info` (prices and Price check results) |

- A price drop is under **Prices**, not Shows. That was the board's mistake.
- An unknown category (the `CATEGORY_FALLBACK` path) goes under **Alerts**.
- The tab opens on **Shows**. The header count ("4 NEW") is the total across all three tabs, as live.
- Each row keeps its small category label (SHOWS, ARTISTS, CREWS, PRICES).

### 2. "No longer listed": is there a notification?

**No notification.** Hugh ruled that shows the crawler drops are No longer listed, never Cancelled, and that they don't send cancellation notifications (`status-and-dispute-fixes.md`). The COPY.md row "chip, row and notification" is wrong. It is fixed in this PR to read "chip, row and event page". The event page is drawn in item 12.

### 3. Stamps: tilted squares or one round stamp?

**One round stamp everywhere. It is straight everywhere except inside the Passport booklet** (Hugh, 2026-11-12). There the stamps keep their slight hand-stamped tilt, so it feels like a real passport. This refines README rule 4.

- **Drawn:** `03-stamps/concerts-round-stamps-d` and `-m`. Every Concerts row and the Passport teaser use the round venue ring, straight.
- **Drawn:** `04-passport-order/*`. The booklet stamps are round and keep the booklet's tilts (−8°, 6°, 4°, −5°, repeating by slot).
- The rest of the app (Watching, Concerts, the teaser, the stub's NEXT slot, Up next) stays straight.
- The rounded-square variant (`shape=1`) is retired. Don't build it.

### 4. Passport booklet: newest first on page 1, oldest first later?

**Not intended.** It is oldest first on every page, so the book fills in the order you went out and page 1 starts with your first night.

- **Drawn:** `04-passport-order/passport-d`, `passport-m`, `passport-later-d`, `passport-later-m`.
- New stamps fill the next open slot on the latest page. The NEXT ghost stamp always sits right after the newest stamp.

### 5. Watching: "Going to this show?" or "Going? In N days."?

**As built is fine.** The board and live copy are right: the heading **"Going to this show?"** plus the line **"In N days."** (`whenInDays`). The README's "Going? In N days." was shorthand for that one-line layout, not new copy.

### 6. Filters are drawn multi-select, but were they ruled single-select?

**No. Multi-select is intended** (Hugh, 2026-11-12), so the approved boards stand: `05-filters/bp-f-filt_active_d`, `bp-f-filt_where_d`, `filt_m_active`, `filt_sheet_m` and `filt_venues_m`.

- **Where** and **Vibe** take several values. They show "Bluebird +1" with stacked tiles and "Electronic +1" with stacked dots on desktop, and "2 venues" and "2 vibes" chips on mobile.
- The venue list uses checkboxes, as drawn.
- This settles data-contract gap 1 in the B+ README: widen `filterWhere` and `filterVibe` (`filter-bar/filter-defs.ts`) to lists. A show matches if it is at **any** chosen venue and has **any** chosen vibe. Different filters still combine with AND.
- Nothing is redrawn for this item.

### 7. Admin More: yellow count pills on Health and Operations

**Rule 1 wins:** only Needs you carries a badge.

- **Drawn:** `07-admin-more-no-pills/more-mobile`. The pills are gone. The counts move into each row's detail line as plain text (admin plan decision 12).
- Detail lines: Health "1 site check failing", Artists "200 artists to check", Prices "214 missing a price", People "People, invite codes, posters", Feature flags "3 flags", Crawl runs "Last run today, 3:00 AM", Operations "4 feedback to read" **(new copy, admin, exempt from the em-dash rule but still reviewed)**.
- When a count is zero, the row falls back to its plain description (Health "Venues, cost, site checks", Operations "Feedback, emails, activity log").

### 8. Admin sidebar: draw the interim Invite codes row or drop it?

**Drawn:** `08-admin-invite-codes-row/desktop-sidebar-interim`. The row sits under Manage, right after People, with the lock icon and no badge. It lives from 0a until 5b, when Invite codes becomes a tab inside People. Then the row is removed and the sidebar matches `01/desktop-sidebar` again.

### 9. Admin Needs you badge: what does the number count?

**Decisions waiting, and nothing else** (rule 1). It never counts price coverage.

- **Interim (0a, before the 2a decision count exists):** sum only the review counts that are decisions: event flags, missing shows, and open Price checks (contests). Leave out price coverage ("missing a price") and price submissions.
- **From 2b:** switch to the 2a decision count, as planned.
- The plan's "sum today's review counts" is narrowed to the line above. That matches the README, so no board changes.

### 10. Admin couldn't load: one line for timeouts and render errors?

**Yes, one line.** **Drawn:** `10-admin-couldnt-load/couldnt-load`.

- The line is now "This page didn't load. Nothing you decided is lost." **(new copy)**, and it replaces "The API didn't answer in time" everywhere that pattern is used.
- The heading keeps the page name ("Couldn't load Needs you"). Try again and Open Health stay.

### 11. Artist skeleton: round portrait or the tilted 4:5 card?

**The tilted card wins** (rule 9: skeletons hold the layout). **Drawn:** `11-artist-skeleton/load-artist-m`.

- The skeleton card is 190 × 230 (the loaded card's size) at the same −2.5° tilt, in the hero, with the eyebrow, name and genre chips below it.
- The Follow button, the history line, the Upcoming heading and the rows are skeletons in place. The header and bottom nav render at once.

## B. Undrawn states

### 12. Event page for a "No longer listed" show

**Drawn:** `12-no-longer-listed/event-nll-m` and `event-nll-d`. This follows the No longer listed plan (`docs/superpowers/plans/2026-11-11-bplus-a5-no-longer-listed.md`).

- It is **not** a cancellation: no strike-through, no grey photo, no red banner.
- A grey, dashed card holds the NO LONGER LISTED chip, the line **"The venue took this show down. It may be off."**, and a source line **"NOT ON THE VENUE'S CALENDAR SINCE {date}"** **(new copy)**.
- The CTA stays what it was: Get tickets, Visit venue website, or the disabled state, by the same `EventTicketCta` rules. It never shows Refund info. No longer listed is stored as cancelled plus `delisted_at`, so `EventTicketCta` has to check No longer listed before its cancelled branch.
- Watch, More at this venue and Report a status change stay, so fans can still report a real cancellation.

### 13. Cancelled from the crawler with no fan report, and cancelled with no ticket link

**Drawn:** `13-cancelled-variants/*`.

- **From the crawler:** the same Cancelled banner. The source line names the venue's calendar instead of a reporter: **"FROM THE VENUE'S CALENDAR · 2H"** **(new copy)**. There are no confirm counts because nobody reported it.
- **No vendor link, venue website only:** the CTA is **Visit venue website ›** (outlined, like Refund info). The banner's second sentence becomes "Check with the venue about refunds." **(new copy)**.
- **No link at all:** the disabled **No tickets available**, as live.
- A cancelled show **never** shows Get tickets. As live, `EventTicketCta` sends a cancelled show with no ticket URL to the venue link, else to the disabled state. Keep that order.

### 14. Tickets available: only on a live sold-out show? Its pending state?

**Yes, only on a live (confirmed) sold-out show**, through the "Tickets still available?" footer that is already drawn (`bp-s-ev_sold_m`).

- **Pending (drawn, `event-tickets-back-pending-m`):** the dashed green pending banner, "A fan reports tickets are back.", with its confirm dots and Confirm. The sold-out card and the disabled Sold out CTA stay as they are until it's confirmed.
- **Confirmed (drawn, `event-tickets-back-live-m`):** the sold-out flag clears and the page is back to normal (countdown, price, Get tickets, Watch). There is no banner. Watchers get `watch.backonsale` under Shows (item 1).
- The existing `st-ev_sold_pending_m` board is the pending **Sold out** report. It's unchanged.

### 15. 320px widths

**Drawn:** `15-320px/*`.

- **Browse rows (filters A):** as built is fine. Filters and My artists fit on one line. Row venue lines truncate with an ellipsis, and the price stays right-aligned. With filters on, the active chips run off the right edge and scroll sideways, like the shelf.
- **Offline pill:** below 360px it drops "· cached OK" and reads just **Offline**, so search keeps its spot. At 360px and up, it reads as drawn.
- **Calendar:** as built is fine. The seven day tiles fit at 320 with the dots under each.
- **Invite landing:** the code field's placeholder (`BETA-XXXX-XXXX`, the real format from COPY.md) stays on one line below 360px at 12px with 0.04em tracking and tighter padding, and Redeem keeps its width. The other strings on this board are the old board's; COPY.md has the current ones.
- **Bottom nav (5 slots):** as built is fine. The labels keep JetBrains Mono at 9px and never shrink. At 320 each slot is 64px, and "my shows" fits.

### 16. Desktop empty Passport, desktop notifications panel, Light venue hero

**Drawn:** `16-undrawn-pages/*`.

- **Desktop empty Passport:** the open book with four empty round slots and the ID page at 0 / 0 / —, the empty block beside it ("No stamps yet", Find a show), and 0 of 21 venues, all greyed. Share and Save image are hidden until there's a stamp.
- **Mobile empty Passport:** the approved board, unchanged. The empty slots keep the booklet's tilt (item 3).
- **Desktop notifications:** the account menu panel swaps to What you missed, as the live `NotifMenuPanel` does. It is 390 wide under the avatar, with Menu as the way back, and has the same tabs and rows as mobile. It scrolls inside the panel, up to 700px tall.
- **Light venue hero:** the backdrop goes pale and the neon glyph keeps its own colors. The theme does not recolor the glyph. Drawn at mobile and desktop.

### 17. Venue page and Venues list details

*How we read it: stat values at phone width; whether upcoming rows are grouped by date; whether the Venues list has column headers.*

- **Stat values at phone width:** as built is fine. There are three columns (Capacity, Upcoming, Type), and a value that doesn't fit wraps to two lines. It never shrinks.
- **Upcoming rows:** as built is fine, **ungrouped**. Each row carries its own date tile, and a venue's list is short.
- **Venues list column headers:** none, as drawn. Each row labels itself.

### 18. Error page details

*How we read it: a Tell us report that the server refuses; what global-error renders when sign-in can't be checked; an error inside the app (a crew page) with the bottom nav.*

- **Refused report (429 rate limit or a 4xx rejection), drawn `18-error-page/error-report-refused-m`:**
  - It is **not saved** on the device and **not retried**, unlike Signal lost, because sending it again won't help.
  - The rail reads "Didn't send · beta channel" with the code LIMIT in warning.
  - **"Not sent."** and "We couldn't take this report, so it isn't saved. If it keeps happening, the error ID below is all we need." **(new copy)**, then one **Done** button. The error ID chip stays below.
- **global-error has no Clerk:** signed-in detection is the `__client_uat` cookie, as the README says. If the cookie is missing or unreadable, render the **signed-out layout** (no card). A 401 on send also switches to signed-out.
- **Error inside the app, drawn `error-in-app-m`:**
  - A route `error.tsx` renders inside the app layout, so the app header and bottom nav stay. The bare logo bar is replaced by the app header.
  - The error, the Tell us card and the error ID are the same as the standalone page.
  - Only `global-error.tsx` is the bare page.

### 19. Calendar week strip: where do the genre dots come from?

**One dot per distinct genre bucket** among that day's shows, at most four. The dots are ordered by how many shows have that bucket (most first), with ties in the `genre-buckets.ts` order. A show with two genres counts for both. A day with no shows has no dots. The data is the same buckets the rows already use. Nothing new is needed.

### 20. Browse shelf past five cards

**Drawn:** `20-browse-shelf/shelf-see-all-m`.

- **See all ›** sits on the "Coming to Denver" heading row, on the right, in the signal color, the same pattern as "All 21 ›" in the Filters sheet.
- The shelf shows up to 10 cards and scrolls sideways. There's no end card.
- See all turns on the **My artists** filter in Browse (the same list, in full).

### 21. Pull to refresh, and the offline note

- **Open:** dragging down past the top opens a 74px zone. The wave is drawn at rest until the pull passes 74px. Releasing before that snaps back on `--motion-fast`.
- **Hold:** past the threshold, release starts the wave with LOADING SHOWS. It holds for at least one full loop (1300ms), so it never flashes, and then until the fetch settles.
- **Close:** the zone collapses on `--motion-base` (`--motion-ease`) and the new rows are in place. If the refresh fails, it closes and the offline pill appears in the header. There is no toast.
- Pull to refresh is on Browse only (rule 10). The My shows tabs don't have it.
- **Offline note:** the pill lives in the header, so it shows on **every** screen while offline, all My shows tabs included. There is no separate per-tab note.

### 22. Launch animation: the start scale before the grow

The mark starts at **128 / 96 = 1.333×** (the mark's 96-unit art drawn at 128px, the same size as the splash icon tile), centered: `translate(131px, 358px) scale(1.333)` on a 390 × 844 screen, with transform-origin at the top left. It grows from there to 4.2× at 110 to 360ms (expo out). These values come from `ICON` and `HERO` in the launch board's source.

### 23. Search palette: an artist with no genre

- The thumbnail gets a **neutral ring** (`--bs` hairline) and no glow.
- There is **no genre chip**.
- The row's left edge is neutral.

The artist is never assigned a fallback genre color.

### 24. Submitted prices: filters, month grouping and thumbnails without image data

*How we read it: the board draws filters, month grouping and artist thumbnails, but the submitted-prices data has no image.*

**Drawn:** `24-submitted-prices/submitted-prices-m`.

- **Thumbnails:** use the **venue tile** (rule 5), which every submission already has. No artist image is needed.
- **Month grouping:** keep it. Group by the month the price was submitted.
- **Filters:** keep All, Live, Pending and Price checks, with counts.
- The page title is **Submitted prices** (locked vocabulary). The older board said "My submissions".

### 25. Account menu

*How we read it: the founder eyebrow, handle and "See all" aren't built; the plan wording was removed for going free; Theme and Settings; the profile banner colors in Settings.*

- **"BETA · FOUNDER" eyebrow:** drop it for now. There is no founder field. Show the handle only.
- **Handle:** show `@handle`. With no handle, show the display name. The rules for that are in item 29.
- **See all N:** build it as live copy (`seeAll`). It opens What you missed in the same panel (item 16).
- **Theme and Settings rows:** as drawn.
- **Profile banner:** the stripes use the avatar's two Mix two colors. With a single color, the banner is a solid band in that color.
- **Plan and billing lines:** gone (going free), as built.

### 26. Crews

*How we read it: "1 coming up" on the board against live "1 show coming up"; the invite page draws an avatar cluster that live removed.*

- **Count:** live copy wins: **"1 show coming up"** / "N shows coming up".
- **Invite page:** as built is fine. Show the crew patch and the live member count ("4 members", `memberCount`) instead of avatars. Don't bring the avatar cluster back.

### 27. Artist page

*How we read it: where the genre comes from; whether rows show tour names; where Follow goes as you scroll on mobile; the dashed note on mobile; whether there's an artist share card or a plain link.*

- **Genre:** the artist's genres mapped to the 16 buckets (`genre-buckets.ts`), the same source the rows use. With none, see item 23.
- **Tour names:** no. Rows show the date tile, the venue (with its tile), the time and the price, as drawn.
- **Follow on mobile:** stays where it is under the hero. It's not sticky.
- **Dashed note on mobile:** add it below Upcoming, as on desktop ("We'll tell you the day they book another Denver date." / "Follow to hear…", existing copy).
- **Share:** a **plain link** through the native share sheet (or copy link on desktop). There is no artist share card. Share images are only for shows.

### 28. Price check counter: "How you found out" and the honesty footnote

**Drawn:** `28-price-check-counter/counter-how-found-m`.

- The required **HOW YOU FOUND OUT \*** chips ("Bought it myself", "Saw the listing", "At the venue", from live `HOW_FOUND_OPTIONS`) sit between the price fields and Submit update. They are single-choice pill chips, and Submit stays disabled until one is picked.
- The **honesty footnote** (live `honestyFootnote`) sits centered under the button in small subtle text.

### 29. Admin details

*How we read it: the display name when a person has no first name; a "robots.txt disallows" venue chip; whether pausing after 3 failures reads Auto-paused or Paused; the generic admin page-not-found; the tone of the FLAG kind label; skeleton row heights; what the More detail lines ("200 to check", "Last run") mean.*

- **Display name:** first name, else `@handle`, else the masked email's local part ("hu•••"). Never a Clerk id (rule 7).
- **robots.txt disallows:** the second status chip reads **"Paused: robots.txt"** in warning, as in the phone addendum Source board.
- **Pause after 3 failures:**
  - In detail views and Needs you, the chip reads **"Auto-paused: 3 failures"** (danger), as in `02/venue-auto-paused-after-3-failures`.
  - In list cells it reads **"Auto-paused"**, and the failure count goes in the latest-run text line.
  - A pause by a person reads **"Paused"** (warning).
- **Page not found:** as built is fine. Use `07/not-found`.
- **FLAG kind label:** info tone, like VENUE and SHOW. It is outlined, small caps and vertically centered (rule 8).
- **Skeleton row heights:** the same as the loaded row on that page, so nothing jumps (rule 9). Mobile list rows and desktop table rows each use their loaded height.
- **More detail lines:**
  - "200 artists to check" is the number of artists in the Artists review list (no Spotify match or a suspect match).
  - "Last run today, 3:00 AM" is the start time of the latest daily crawl, in Mountain Time.
  - See item 7 for the rest.

## Open questions for design

Engineering should build the ruling above until these are answered.

1. **Tickets available, confirmed (14):** should the price card carry a short "Tickets back" line for a day, or is back to normal enough? We drew back to normal.
2. **Notification tabs (1):** should each tab show its own unread dot? None is drawn, and the header total is the only count.
3. **No longer listed (2, 12):** the No longer listed plan asked whether a quiet, non-alert notice should exist. We ruled no notification, following Hugh's earlier decision.
4. **See all on the shelf (20):** it turns on My artists in Browse. The alternative is the Artists tab in My shows.
5. **Founder eyebrow (25):** dropped for lack of data. Should early members get a mark later?
6. **Refused report (18):** one state covers both a rate limit and a rejection. Do they need different words?
7. **The truncated items (17, 18, 24 to 29):** please check that our reading of each question matches what was asked.

## Files

- `screens/<item>/<board>.jpg`: 2× screenshots.
- `boards/<item>/<board>.html`: the standalone boards, with images inlined.
- `manifest.json`: every board with its item, title, note and size.
