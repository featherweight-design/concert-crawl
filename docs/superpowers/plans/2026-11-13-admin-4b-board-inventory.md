# Admin 4b board inventory (Events, Event edit, price sheet, Mark cancelled, Add a show, Merge, Past)

Handoff root: `design/design_handoff_admin_redesign/` (abbrev `H/`). Boards are HTML under `H/boards/...`; JPGs in `H/screens/...`.
Shared desktop chrome on every desktop board: 232px sidebar (Needs you badge **14**, Health, MANAGE: Venues, **Events** active cyan, Artists, Prices, People, Feature flags; SYSTEM: Crawl runs, Operations; Hugh/ADMIN account pill), top bar breadcrumb. Shared phone chrome on list pages: bottom tab bar (Needs you + badge 14, Venues, **Events** active, More).
Status chip = pill with 6px dot + word (rule 3, fan `StatusChip` colours): Tickets available (green #7BFFB0), Sold out (pink #FF7BD4), Postponed (amber #FFD27A), No longer listed (amber), Moved (cyan #7AE6FF), Cancelled (red #FF7A8A), Hidden: <reason> / Played (muted #5A6788 tint).

## 1. Per board

### `06/events` (1280) — caption: "Price column fits wide ranges ($89.50–$1,250). Status uses the fan-facing words; Hidden is separate."
- Breadcrumb "Events". H1 "Events"; sub "1,204 upcoming · one status each, the same words fans see" → upcoming count.
- Header button "Add a show" (secondary) → opens Add a show panel.
- Filter row (one row): search input w/ magnifier "Search shows or artists"; segmented pill **Upcoming** (selected, gradient border) / Past; chip "Any venue" (opens venue popover); chip "Any status" (opens status popover); toggle chip "No price" + count **214**; toggle chip "Hidden" + count **4**. No chevrons drawn on chips.
- Table card, mono headers: DATE · SHOW · VENUE · STATUS · PRICE · WATCHING · (⋯ col).
- Row: date tile (mono weekday "THU" + day "12"); show title (one line, e.g. "Olive Jones w/ Zoe Stroupe"); venue glyph (16px, venue colour) + venue name; status chip; price text (range "$65–$495", single "$15", none "—" muted); Watching count ("31", "—" when hidden); ⋯ (three-dot, opens event menu).
- Rows drawn: Clipse & J.I.D/Red Rocks/Sold out/$65–$495/31; Olive Jones/Globe Hall/No longer listed/$15/12; Marian Hill/Bluebird/Tickets available/$44/18; Six Foot Blonde w/ The Man is Dead/Larimer Lounge/Moved/$12/4; Cashmere/Lost Lake/Tickets available/—/9; Ninth Key/Gothic/Postponed/$35–$65/6; Michael Smoak…/Cervantes’/**Hidden: unsure** (replaces status)/$25/—; FKJ/Mission Ballroom/Tickets available/$89.50–$1,250/44.
- Footer line "Showing Nov 12–29 · 1,196 more" (range + remaining count). No Load more control drawn (addendum-3 4b#24 → `09/load-more`).
- Data: id, date (MT weekday/day), title, venue {id,name,glyph,colour}, status, hidden + hiddenReason, priceMin/priceMax, watchingCount; total/remaining counts; noPriceCount, hiddenCount.

### `06/events-mobile` (390) — "Cards, not a sideways table."
- Header "Events", sub "1,204 upcoming", avatar "H".
- Search "Search shows or artists".
- Chip row (scrolls): Upcoming (selected), No price **214**, Hidden **4**, Any venue (clipped). No Past, Any status, Add a show drawn (ruled: phone adds Past toggle + Add a show; venue/status open sheets, addendum-3 4b#23).
- Card: date tile; left column title then venue glyph (12px) + venue; right column price ("$65–$495"; none = "No price" muted), "31 Watching", status chip. Hidden card: "Hidden: unsure" chip, no Watching line. No ⋯ on cards (tap → edit presumably).
- Bottom tab bar (Needs you 14 / Venues / Events / More).

### `06/events-no-results`
- Icon tile (24px cyan), title "No shows match", body "Try another venue or status, or include past shows.", button "Clear filters".

### `06/venue-filter` (popover over events)
- Search "Find a venue"; list rows: checkbox (Red Rocks checked, dark check on cyan), venue glyph 13px, name, count: Red Rocks 88, Bluebird Theater 63, Globe Hall 42, Gothic Theatre 41, Larimer Lounge 37 (sorted by count desc). Footer: "Clear" (ghost), "Show 88" (tinted primary, = matching rows). Caption "Searchable, with counts."
- Data: per-venue upcoming event counts (respecting other filters?), venue glyph.

### `06/status-filter` (popover) — "Several at once."
- Checkbox rows + counts: Tickets available 903, Sold out 142, Postponed 6 ✓, Cancelled 9 ✓, Moved 3, No longer listed 11. Footer "Clear", "Show 15". No Hidden row (Hidden is its own chip).
- Data: per-status counts incl. moved + no longer listed (delisted).

### `06/event-menu` (⋯ menu) — "Both “View on” links live here and on the edit page. Merge is for duplicates."
Each item: 14px icon + title + subline.
- Edit — "Title, lineup, date, status, price"
- View on Concert Crawl — "The fan page, in a new tab"
- View on the venue’s site — "The listing we crawled" (needs source/listing URL)
- Open the crawl run — "The run that last saw it" (needs last crawl_run id; 4b#3: drop line if no link)
- Merge with another listing… — "For duplicates. Keeps Watchers and prices"
- Hide from site… (amber) — "Not a concert, or a duplicate" → `04/hide-from-site` dialog pattern (4b#9)
- Delete… (red) — "Only for shows added by mistake" → `04/delete-venue` pattern; only manual rows get it (4b#10, Eng/Hugh)

### `06/event-edit` (1280) — "View on Concert Crawl and on the venue’s site, side by side. Amber lineup token: an unsure artist match. Edit price opens the shared price sheet."
- Breadcrumb "Events / Six Foot Blonde" (short headliner name).
- Header: H1 full title; status chip (Moved); meta "Sat Nov 14 · 4 Watching"; buttons "On Concert Crawl" (external icon), "On the venue’s site" (external icon), ⋯ icon button (event menu).
- Two balanced columns (rule 5).
- Card **Show**: Title input; **Lineup** chip field — chips with 14px artist avatar + name; cyan tint = matched, amber tint = unsure ("The Man is Dead"); trailing "Add an artist" placeholder; help "Each name links to its artist. Amber means unsure: opens the match on Artists."; **Venue** picker (venue glyph 15px + name + chevron); Date "Sat, Nov 14, 2026"; Doors "6:00 PM"; Show "7:00 PM".
- Card **From the crawl** (key/value rows): Source "Larimer Lounge calendar · JSON-LD" (venue source + extraction method); First seen "Sep 30"; Last seen "Nov 10, as “MOVED TO GLOBE HALL”" (4b#2: date only if no raw title).
- Card **Status**: pill selector Tickets available / Sold out / Postponed / Cancelled / Moved (selected, gradient border). Line "Moved to **Globe Hall** · Watchers were told on Nov 11." Divider, toggle (off) "Hide from site" + "For not-a-concert or duplicates." (toggle opens the Hide dialog, 4b#9). No "No longer listed" option (4b#5: read-only status text + "Listed again").
- Card **Price**: rows Listed price "$12"; From "2 Submitted prices, matching"; Ticket page "larimerlounge.com · checked Nov 10"; buttons "Edit price" (cyan tint) and "Submitted prices" (ghost, chevron); note "Edit price opens the same price sheet as Prices, and is saved as your submission, so the history stays in one place." (copy flagged 4b#25).
- Pinned bottom bar (64px): amber "2 unsaved changes" (dirty-field count); "Discard" ghost; "Save" gradient primary.

### `06/event-edit-mobile` (390) — "Same fields, stacked, Save pinned."
- Top bar: back chevron "Events", ⋯ (18px).
- Title, Moved chip, "Sat Nov 14 · 4 Watching"; buttons "On Concert Crawl", "Venue’s site".
- Fields drawn: Title; Lineup chips (cyan/amber); Venue "Larimer Lounge"; Date "Sat, Nov 14" + Show "7:00 PM" side by side; Status pills (overflow hidden: Tickets available, Sold out, Moved…); Price "$12" + "Edit price".
- Pinned full-width "Save" (46px).
- Ruling 4b#4: caption wins → every desktop field stacked (Doors, From the crawl, Hide toggle, Add an artist, all status options, Ticket page, Submitted prices). Cancelled opens the mobile sheet.

### `06/event-edit-mark-cancelled-desktop` — "A centered dialog over the edit page, because it notifies Watchers."
- Scrim over event-edit. Dialog title "Mark Six Foot Blonde cancelled?" (headliner short name).
- Body "4 Watchers get one notice. Get Tickets becomes refund info on the fan page. The show stays listed as Cancelled until its date passes." (watchingCount).
- Field "Refund info (optional)" input "Refunds at point of purchase"; help "Shown where Get Tickets was."
- Buttons "Keep it" (secondary), "Mark cancelled" (red outline).

### `06/mark-cancelled-mobile` — "Bottom sheet."
- Sheet over "Ninth Key". Title "Mark Ninth Key cancelled?"; body with "6 Watchers get one notice…"; Refund info (optional) field + help; stacked "Mark cancelled" (red outline) then "Keep it".

### Postponed (addendum-3 `10/postponed-d`, `10/postponed-m`, reused per 4b#6)
- Title "{show} is postponed?"; "12 people Watching it get one notice. The show stays listed as Postponed until it has a date."; radio "No new date yet" / "New date" → Date + Show time; note "With a date it reads Moved to Sat, Jan 9 for fans, and Watching follows it. Same tickets."; "Cancel" / "Mark postponed" (primary). New date optional.

### `06/edit-price-desktop` — "Overlay over event edit." (side panel, scrim)
- Kind label "PRICE" (green), close ×. Title "Edit price"; sub "Six Foot Blonde · Larimer Lounge · Sat Nov 14".
- Lowest "$12"; Highest (optional) "$15"; checkboxes: Before fees (checked), It’s free, Sold out; "Where you saw it" URL "larimerlounge.com/events/…".
- Note box "Saved as your submission, so Submitted prices keeps the history. The 2 fans who sent $12 aren’t told." (matching submission count).
- Buttons "Save price" (primary), "Cancel".
- Rulings: tier + vendor (if required) use fan sheet's Tier and "Where it's listed" above Lowest (top 8, Eng); Sold out lives in Status only, sheet loses Sold out row (4b#20).

### `06/add-a-show-by-hand` — "Overlay panel from Events." (side panel over events list)
- Kind label "SHOW" (pink), close ×. Title "Add a show by hand"; sub "For a show the crawler can’t see. The next crawl won’t remove it."
- Title "Kaleo"; Venue picker (glyph + "Mission Ballroom"); Date "Fri, Dec 4"; Doors "7:00 PM"; Show "8:00 PM"; Ticket link "axs.com/events/…"; Lineup (comma text "Kaleo, The Band of Heathens", help "Each name is matched on Artists.") — **superseded** by addendum-3 board below.
- Buttons "Add show" (primary), "Cancel".

### addendum-3 `11/add-a-show-lineup-d` — "The lineup uses the edit page’s chips: first is the headliner." (wins over the above)
- Same panel; after Show time: amber warning box (calendar icon) "Mission Ballroom already lists **Kaleo** on Fri, Dec 4. Open it instead?" + "Open it" button (duplicate check on venue+date+title).
- Lineup chips: "Kaleo" + mono "HEADLINER" + ×; "The Band of Heathens" + "SUPPORT" + ×; "Add an artist"; help "The first is the headliner. Drag to reorder. Each name is matched on Artists."
- Line "Add a price after it’s saved, from the show." No price/status fields. Buttons "Add show" / "Cancel".
- Phone: full screen, same fields stacked (4b#13). Hidden link until 4a (3e#15 ruling).

### `06/merge-duplicates` (desktop side panel) — "Pick the listing to keep; everything moves to it."
- Kind label "MERGE" (cyan), close ×. Title "Merge duplicates"; sub "Two listings for one show. Pick the one to keep; Watchers, prices and reports move to it."
- Radio card 1 (selected, gradient border): "Clipse & J.I.D" / "Red Rocks · Thu Nov 12 · from the crawl · 31 Watching · $65–$495".
- Radio card 2: "CLIPSE with special guest JID" / "Red Rocks · Thu Nov 12 · added by @dlo · 3 Watching · no price".
- Summary box "After merging: 34 Watching, one price. The other listing redirects here. Nobody gets a notice."
- Buttons "Merge into the first" (primary), "Cancel".
- Ruling 4b#15: desktop gets the gap-1 pick step as the first panel view.

### phone-addendum `gap-1/merge-pick` (390, full screen from ⋯ "Merge with another listing…")
- Top: back chevron + "Clipse & J.I.D". Kind "MERGE". Title "Merge with another listing"; sub "Which listing is the same show?"
- "THIS LISTING": date tile THU 12, "Clipse & J.I.D", "Red Rocks · from the crawl · 31 Watching".
- "LIKELY THE SAME SHOW" + right "same venue and day": candidate row (date tile, title, "Red Rocks · added by @dlo · 3 Watching", chevron →).
- "OR FIND IT": search field "Search all shows".
- `merge-pick-loading`: same with candidate slot as skeleton. `merge-nothing-found`: dashed box "No other listing at Red Rocks on Thu Nov 12. If the duplicate has another date or venue, search for it." Search results/no results follow `06/artist-search-mobile` + `06/events-no-results` (A3).

### phone-addendum `gap-1/merge-compare` (390) and `merge-compare-320`
- Back "Clipse & J.I.D"; MERGE; title + sub as desktop.
- Shared header: venue glyph 18px "Red Rocks · Thu Nov 12" / "Same venue and day on both".
- Card "First listing" + "KEEP" label (selected): title; rows Lineup (chips Clipse, J.I.D cyan), From "the crawl", Watching "31", Price "$65–$495", Reports "none".
- Card "Second listing": "CLIPSE with special guest JID"; Lineup chip (amber, raw title as one unsure chip); From "added by @dlo"; Watching "3"; Price "no price"; Reports "1 wrong-artist report".
- Summary "After merging: 34 Watching, one price, one report. The second listing redirects here. Nobody gets a notice."
- Pinned "Merge into the first" (primary) + "Cancel". Tapping a card moves KEEP.
- `merge-keep-second-320`: KEEP on second; summary "After merging: 34 Watching, the $65–$495 price, one report. The first listing redirects here, and the next crawl updates this one instead of adding it again. Nobody gets a notice."; button "Merge into the second".
- `merge-loading`: skeleton of compare; only "Cancel" live, main button placeholder.
- `merge-merging`: button "Merging…" with spinner inside (only spinner allowed).
- `merge-failed`: snap-back; red-icon notice "Couldn’t merge" / "Both listings are as they were. Nothing moved, and nobody was told." + "Try again" (repeats same merge); buttons restored.
- Across venue/day (A3): drop shared header, add Venue and Day as first rows of each card. (addendum-3 says "venue and date rows highlighted as differing" — same board, reuse.)

### `06/past-shows` — "Read-only except Hidden and lineup."
- Breadcrumb "Events / Past". H1 "Events"; sub "Past shows · read-only except Hidden and lineup". No Add a show button.
- Filter row: search + segmented Upcoming / **Past** (selected). No venue/status/No price/Hidden chips.
- Columns: DATE · SHOW · VENUE · STATUS · PRICE · **CONCERTS** (no ⋯ column, no row menu).
- Rows: Japanese Breakfast/Mission Ballroom/**Played** (muted chip)/$45 (muted)/"14 went"; Pink Fuzz/Hi-Dive/Played/$15/"3 went"; Turnstile/Fillmore/**Cancelled**/—/—; Kyle Emerson/Larimer Lounge/Played/$18/"2 went". Newest first.
- Footer "Past shows stay for Concerts and stamps. Showing Nov 5–8".
- Rulings: Played OK, muted, past only (4b#21); past edit locks every field except Hidden + lineup, others shown read-only (4b#22); phone Past = phone list with Past toggle.

### `07/loading-events`
- Breadcrumb "Events". Skeleton: title bar + sub bar; filter row = wide search block + 5 pills; table card with header bar and rows (square tile, two text bars, chip pill, two short bars), fading down. Rule 9: no animation under reduced motion.

### `07/loading-event-edit`
- Breadcrumb "Events / …". Skeleton: title + sub bars; two columns — left: tall card (6 bars) + short card (3 bars); right: two cards (4 bars each). (Matches Show / From the crawl | Status / Price.)

## 2. Data the UI needs

List (`GET /v1/admin/events`):
- id, title, date + doors/show times (UTC → MT weekday/day), venue {id, name, glyph/colour}, status (available / sold out / postponed / cancelled / moved / no longer listed = delisted_at), hidden + hidden reason (unsure = is_concert_review_needed; others: by admin, not a concert, duplicate — Copy), priceMin/priceMax (via price single source, not events.ticketPriceMin), watchingCount (deduped).
- Query: q (show or artist full-text), when=upcoming|past, venueIds[], statuses[], noPrice, hidden; paging (Load more, "Showing 25 of N" / date range + "N more").
- Counts: upcoming total; noPrice count (214); hidden count (4); per-venue counts for the venue popover (sorted desc, searchable); per-status counts for the status popover; selection total for "Show N".
- Past: Played (derived: past + not cancelled), wentCount (going/Concerts count — Eng), past price.

Event detail (`GET /v1/admin/events/:id`):
- title, short headline name (breadcrumb/dialog titles), status, moved-to venue + watchers-told date (Moved: Hugh top 7), watchingCount, fan URL (`/e/:id`), venue listing URL (source), lineup [{artistId, name, avatar, role headliner|support, position, unsure flag/match status}], venue, date, doors, show.
- From the crawl: source label (venue calendar / feed) + method (JSON-LD/HTML/Haiku), first_seen, last_seen_at, last seen raw title (no source today), last crawl_run id (no link today).
- Price: listed price, matching submission count, ticket page host + checked date, submitted-prices link (filtered to event).
- manual flag, created_by handle (A2: `events.created_by`; old manual = "added by hand"), hidden flag + reason, delisted_at.

Mutations:
- PATCH event (title, lineup, venue, date, doors, show, status, hidden) with dirty count + Discard; snap-back on failure (rule 10).
- Mark cancelled (refundInfo optional — no column today, Hugh 4b#7) → one Watcher notice; Mark postponed (optional new date) → notice.
- Hide (dialog, reasons) / Delete (manual only, typed confirm per `04/delete-venue`).
- Price sheet save = admin's own price_submission (lowest, highest, beforeFees, free, url; tier/vendor if required); "N fans who sent $X aren't told".
- Add a show by hand: POST {title, venueId, date, doors, show, ticketUrl, lineup[{name/artistId, role, position}]} → manual=true, created_by; duplicate check endpoint (venue + date + title) returning existing event id.
- Merge: likely-duplicate lookup (same venue + day), search all shows, compare payload per listing {title, lineup, from (crawl / added by @handle), watching, price, reports}, merge preview (deduped Watching sum, kept price, report count), POST merge {keepId, otherId} silent, redirect via `event_redirects` (4a decision 1; there is no `merged_into_id`), crawl match key resolves through the redirect's source key (A1, 4a-1).

## 3. Gaps / open

- **Moved** (status, chip, selector option, moved-to, "told on"): no data; Hugh top 7 (Q 4b row 1). Open.
- **Last seen raw title**: no source. Resolved default: show date only (addendum-3 4b#2).
- **Open the crawl run**: no event→run link. Default: drop line (4b#3).
- **Mobile edit field subset vs caption**: resolved, every field stacked (4b#4). Mobile layout for From the crawl/Hide/Price rows not drawn → stack desktop cards.
- **No longer listed in selector**: resolved, read-only status text + "Listed again" (4b#5). "Listed again" control itself is undrawn.
- **Postponed dialog**: resolved → `10/postponed-d/m` (4b#6).
- **Refund info storage + fan-page change**: Hugh (4b#7). Open.
- **Hidden row status**: resolved — status chip stays, Hidden is a second chip with reason (4b#8). Contradicts drawn rows (Hidden replaces status) — ruling wins. Reason words = Copy.
- **Hide / Delete dialogs**: resolved — reuse `04/hide-from-site`, `04/delete-venue`; edit toggle opens same dialog (4b#9). Event-specific reasons list not drawn (Copy).
- **Delete only manual**: Eng/Hugh (4b#10). Open.
- **Add a show lineup roles + duplicate check + no price**: resolved by `11/add-a-show-lineup-d` (4b#11, #12). Phone Add a show: full screen, not drawn (4b#13).
- **added by @dlo**: A2 decision (`events.created_by`); addendum-3 4b#14 still says "Eng".
- **Desktop merge pick step**: resolved, pick step first (4b#15); desktop pick/compare-with-Reports not drawn — reuse gap-1 boards in the panel. Desktop merge panel lacks Reports row and Lineup rows; phone compare has them.
- **Which reports move** (wrong-artist reports are artist-keyed): Eng (4b#16). Open.
- **Watching deduped, merge silent**: Eng; merge stays silent (4b#17).
- **Crawler match key on keep-second**: A1 decision, built in 4a-1 (#416): the redirect carries the source crawl key and the crawl updates only crawl-owned fields of the kept row.
- **Merge across venue/day**: A3 (header drops, per-card Venue/Day rows) vs addendum-3 ("rows highlighted as differing") — compatible; no board.
- **Price sheet tier/vendor/before fees/free/url columns**: Eng top 8 (4b#19). Open, blocks price sheet.
- **Sold out in sheet and Status**: Design: Status only, sheet drops Sold out (4b#20); Eng for write path.
- **Played**: resolved OK (4b#21). **Went count**: Eng (4b#22). Past edit view not drawn (lock all but Hidden + lineup). Past row has no ⋯ — how to reach edit undrawn (row click assumed).
- **Phone filters**: resolved — add Past toggle + Add a show; venue/status open sheets (4b#23); sheets not drawn.
- **Load more**: resolved → `09/load-more` ("Showing 25 of 140" / "Load 25 more" / "Loading" / "Showing all 140") (4b#24). Conflicts with drawn "Showing Nov 12–29 · 1,196 more" footer wording.
- **"Saved as your submission… history"** copy: Copy (4b#25).
- Undrawn, no Q entry found: filter chip label once a venue/status is chosen (e.g. "Red Rocks" / "2 statuses"); event-edit Couldn't load / not found (use `CouldntLoad`, Eng item 2); save-failed toast on edit (rule 10 pattern); Add a show validation errors / save failed; price sheet loading/failed; events list Couldn't load; Add an artist search behaviour (likely `06/artist-search` full screen on phone); lineup amber chip click target (opens match on Artists); search no-results vs filter no-results copy; past-shows empty; date/time pickers; venue picker popover contents.
- Plan note: 4b depends on 4a (`event_artists`, `manual`, `created_by`, `lineup_edited_at`, redirect source key), which lands in #416 (4a-1, migration 0115); plan `docs/superpowers/plans/2026-11-13-admin-4a-events-data.md`.

## 4. Existing code paths

Routes:
- `apps/web/src/app/(protected)/admin/events/page.tsx` (redirects to `/admin/review?tab=all-events`; plan renames to `/admin/events` in 4b)
- `apps/web/src/app/(protected)/admin/events/loading.tsx`
- `apps/web/src/app/(protected)/admin/events/[id]/edit/page.tsx` (+ `page.test.tsx`, `loading.tsx`)
- `apps/web/src/app/(protected)/admin/review/page.tsx` (current all-events host)

Current events UI:
- `apps/web/src/components/admin/review/all/` — `EventsTable.tsx`, `EventsMobileList.tsx`, `EventsFilterBar.tsx`, `EventRowMenu.tsx`, `EventConfirmModal.tsx`, `BulkDock.tsx`, `BulkConfirmModal.tsx`, `BulkDeleteConfirm.tsx`, `filters.ts`, `types.ts`
- `apps/web/src/components/admin/events/editor/` — `EventEditorClient.tsx`, `EditorHeader.tsx`, `SaveBar.tsx`, `MergeEventDialog.tsx`, `EditField.tsx`, `EditSection.tsx`, `LifecycleBadge.tsx`, `SrcTag.tsx`, `VerifyMark.tsx`, `sections/{Identity,Status,Pricing,Classification,Art,DangerZone}Section.tsx`
- `apps/web/src/components/admin/events/EventQueueSplit.tsx`, `types.ts`; `apps/web/src/components/admin/event-review-table/EventReviewTable.tsx`

Price sheets (no `EditPriceSheet`/`PriceSheet`/`AddPriceSheet` exist):
- `apps/web/src/components/admin/prices/EditPricePanel.tsx`, `AddPricePanel.tsx` (used by `PricesClient.tsx`), `RejectPriceDialog.tsx`, `prices-api.ts`
- Fan sheet: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`, `VendorField.tsx`

Primitives to reuse: `apps/web/src/components/admin/primitives/` — `SidePanel.tsx`, `AdminSheet.tsx`, `AdminDialog.tsx`, `ConfirmDialog.tsx`, `RowMenu.tsx`, `PageSkeleton.tsx`, `CouldntLoad.tsx`, `EmptyState.tsx`, `Pagination.tsx`, `SaveFailedToast.tsx`, `useSnapBack.ts`, `KindLabel.tsx`, `useIsPhone.ts`. Status chip: `apps/web/src/components/consumer/StatusChip.tsx` (no Moved/Played/Hidden variants).
Venue dialogs to mirror: `apps/web/src/components/admin/DeleteVenueDialog.tsx`.

API: `apps/api/src/routes/admin/events.ts` — GET `/`, GET `/count`, GET `/:id`, PATCH `/:id`, DELETE `/:id`, POST `/:id/sold-out`, `/:id/available`, `/:id/merge`, PATCH `/:id/verify`, bulk `/bulk/{unverify,mark-non-concert,mark-as-concert,delete}`, `/bulk-auto-approve`, PATCH `/reports/:reportId/resolve`. Prices: `apps/api/src/routes/admin/prices.ts`. Schema: `packages/db/src/schema/events.ts` (status enum upcoming/cancelled/postponed; `hidden_from_consumer`, `is_concert_review_needed`, `delisted_at`), `event-redirects.ts`, `prices.ts`.
