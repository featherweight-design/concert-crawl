# Admin 4b: Events and Event edit (phase plan)

**Parent plan:** `docs/superpowers/plans/2026-11-11-admin-redesign.md` (row 4b).
**Backend:** `docs/superpowers/plans/2026-11-13-admin-4a-events-data.md`. 4a-1 is #416 (held for 0114 and Hugh's prod OK). 4a-2 and 4a-3 follow.
**Handoff:**

- `design/design_handoff_admin_redesign/boards/06-events-artists-prices/`
- `07/loading-events` and `07/loading-event-edit`
- phone addendum gap 1 (`phone-addendum/`, merge)
- `addendum-3/` board `11/add-a-show-lineup-d` and its "4b Events" ruling table (rows 4b#1 to 4b#25)
- `READINESS.md` A1, A2 and A3

**Board inventory (every drawn element, per board):** `docs/superpowers/plans/2026-11-13-admin-4b-board-inventory.md`. Each PR's `## Design review` table lists its boards' rows from that file.
**Risk:** the UI PRs are not risky (`/admin/events/**`), so each gets a Claude review. The API PRs in 4a-3 are risky.

## What 4b replaces

- `/admin/events` currently redirects to `/admin/review?tab=all-events`. 4b makes `/admin/events` the list, and `?tab=all-events` redirects to it.
  - The list today is `components/admin/review/all/` (`EventsTable`, `EventsMobileList`, `EventsFilterBar`, `EventRowMenu`, the bulk dock).
  - The editor is `components/admin/events/editor/`, served at `/admin/events/[id]/edit`.
- 4b rebuilds both to the boards. The old components are deleted in the PR that replaces each one. There is no feature switch (Hugh: no switches for admin redesign work).
- Primitives to reuse:
  - `admin/primitives/` (`SidePanel`, `AdminSheet`, `AdminDialog`, `ConfirmDialog`, `RowMenu`, `PageSkeleton`, `CouldntLoad`, `EmptyState`, `Pagination`, `SaveFailedToast`, `useSnapBack`, `KindLabel`, `useIsPhone`);
  - `consumer/StatusChip` (it gains Moved only after Hugh rules, and Played and a Hidden reason chip);
  - `admin/DeleteVenueDialog` as the Delete pattern;
  - the 4d price panels `admin/prices/AddPricePanel` and `EditPricePanel` as the shared price sheet.

## Rulings that settle board questions (from addendum-3 "4b Events", READINESS, and 4a)

| # | Question | Settled |
| --- | --- | --- |
| 4b#2 | Last seen raw title | No source exists, so only the date shows. |
| 4b#3 | Open the crawl run | No event-to-run link exists, so the menu line is dropped. |
| 4b#4 | Phone edit fields | Every desktop field, stacked. Cancelled opens `mark-cancelled-mobile`. |
| 4b#5 | No longer listed | Not settable. It shows as read-only status text with "Listed again" (clears `delisted_at` and `first_missing_at`, using today's PATCH `firstMissingAt: null` and `endDelisting`). |
| 4b#6 | Postponed | `10/postponed-d` and `10/postponed-m`. Notifies Watchers through today's PATCH (`watch.postponed`). |
| 4b#8 | A hidden row | The status chip stays, plus a second Hidden chip with its reason. The reasons go to copy-review. |
| 4b#9 | Hide and Delete | `04/hide-from-site` and `04/delete-venue`. The edit toggle opens the same Hide dialog. |
| 4b#10 | Delete | **Eng decision:** only manual rows get the line and the API (`DELETE /:id` returns 409 `not_manual` on a crawled row). Others use Hide. The board says "Only for shows added by mistake". |
| 4b#11, #12 | Add a show | `11/add-a-show-lineup-d`: lineup chips, the first is the headliner, drag to reorder. There is a duplicate warning. The price is added after save. |
| 4b#13 | Phone Add a show | Full screen, the same fields stacked. |
| 4b#14 | "added by @dlo" | `events.created_by` (4a). Older manual rows read "added by hand". |
| 4b#15 | Desktop merge | The gap-1 pick step is the panel's first view, then compare. |
| 4b#16 | Which reports move | `event_reports` (4a decision 7). The compare's Reports row counts this listing's open event reports, named by kind. Wrong-artist reports are artist-keyed and never move. |
| 4b#17 | Merge Watching count | Deduplicated (the distinct Watchers of both rows). The merge is silent (`notifyWatchers: false`). |
| 4b#18 | Crawler match key | 4a-1: the redirect carries the source crawl key, and the crawl updates the kept row. |
| 4b#19, #20 | Price sheet | 4d settled the fields in `AddPricePanel` / `EditPricePanel`, which is the shared sheet. Edit price opens it for the admin's own submission on this show. Sold out lives in Status only. |
| 4b#21 | Played | Muted chip, past only. |
| 4b#22 | Past | **Eng:** "went" counts `user_events` marked going for the show (the Concerts count). The past edit locks every field except Hidden and lineup (shown read-only). Phone uses the list's Past toggle. |
| 4b#23 | Phone filters | Past toggle and Add a show. Venue and status open `AdminSheet`s with the popover's contents. |
| 4b#24 | Paging | `09/load-more` ("Showing 25 of N", "Load 25 more"). It replaces the drawn "Showing Nov 12–29 · 1,196 more" footer. |
| A3 | Merge across venue or day | Drop the shared header, and add Venue and Day as the first rows of each card. |

## Open (blocks part of 4b; sent to the orchestrator)

1. **Moved (4b#1, Hugh):** the status pill, chip, "Moved to …" line and status-filter row have no data and no picker. 4b ships every other status. The Moved pill and the filter's Moved row wait for Hugh. That is a gap in the drawn set, not a drift: it is recorded in each PR's Design review as "held: Hugh 4b#1".
2. **Refund info on Mark cancelled (4b#7, Hugh):** there is no column, and the fan-page change would be in scope. The Mark cancelled dialog and sheet PR (4b-5) waits for this ruling, so the dialog never ships without its drawn field.
3. **Undrawn details.** Hugh's standing rule is never to drift from the boards: a gap goes to Design. A state is reused only where a shared admin primitive already renders that exact state on a drawn board.
   - ✅ **Couldn't load** (the Events list, Event edit, the Merge pick list): `CouldntLoad`, per `02-needs-you/couldnt-load` ("Same pattern on every page").
   - ✅ **Save failed** (Event edit Save, Add show, the Hide, Delete and Postponed dialogs): `SaveFailedToast` with snap-back, per `07-people-flags-operations/save-failed` ("Any control on these pages: it snaps back and says what is really saved").
   - These are **Design gaps**, not built until Design draws them. The orchestrator takes the batch to Hugh.
     - gap: the Any venue and Any status chip labels once a venue or status is chosen;
     - gap: the venue picker's open state, on Event edit and Add a show;
     - gap: the date and time pickers, on Event edit and Add a show;
     - gap: how a Past row, which has no ⋯, opens its edit view;
     - gap: the "Listed again" control beside the read-only No longer listed status (4b#5 names it but nothing draws it);
     - gap: Add a show's field validation errors (for example, a missing venue or date).

     Where a gap sits inside a PR, the PR builds everything else on its boards and leaves that piece out, recorded in its Design review as "gap: held for Design".

## API contract 4b needs (4a-3, split into two risky PRs)

**4a-3a: list and detail.**

- `GET /v1/admin/events` takes `q`, `when=upcoming|past`, `venueIds[]`, `statuses[]` (`available|soldout|postponed|cancelled|delisted`, plus `moved` once ruled), `noPrice`, `hidden`, `limit`, `offset`. It returns:
  - `rows[]`: `id`, `title`, `date`, `doorsTime`, `showTime`, `venue {id,name,slug,glyph}`, `status` (the fan words, derived as the fan side derives them, `isSoldOutSql` included), `hidden`, `hiddenReason`, `price {min,max}` from the price single source, `watchingCount`, `manual`, and `wentCount` (past);
  - `total`;
  - `counts {noPrice, hidden, byVenue[{venueId,count}], byStatus{…}}`.
- `GET /v1/admin/events/:id` returns:
  - every list field;
  - `lineup[{artistId|null,name,slug,role,position,unsure}]` (from `event_artists`, after 4a-2);
  - `manual`, `createdBy` (as a handle), `sourceLabel` (venue source and `extraction_strategy`), `firstSeenAt` (`created_at`), `lastSeenAt`, `delistedAt`, `fanUrl`, `listingUrl` (`source_url`);
  - `price {listed, matchingSubmissions, ticketHost, checkedAt, mySubmissionId}`.

**4a-3b: writes.**

- `POST /v1/admin/events` adds a show by hand (409 `duplicate` with `existingId`). `GET /v1/admin/events/duplicate?venueId&date&title` serves the warning as you type.
- `PUT /v1/admin/events/:id/lineup` saves the lineup. It sets `lineup_edited_at` and is allowed on past rows.
- `PATCH /v1/admin/events/:id` gains `venueId`. Status, hidden, title, date and times are already there; past rows accept only `hiddenFromConsumer`, and anything else returns 409 `past_locked`.
- `DELETE /v1/admin/events/:id` returns 409 `not_manual` on crawled rows.
- `GET /v1/admin/events/:id/merge-candidates` lists the same venue and day, likely first. Search reuses the list's `q` across both `when` values.
- `GET /v1/admin/events/:id/merge-preview?other=` returns per listing `{title, lineup, from, watching, price, reports}`, plus the deduplicated `watchingAfter` and the kept price.
- The merge POST is unchanged.

Every write is Zod-validated and audited (the merge already is).

## PR split (each from fresh `main` after its dependencies merge; none stacked)

| PR | Content | Boards | Depends on |
| --- | --- | --- | --- |
| **4b-1** Events list | `/admin/events` desktop table and phone cards; search; Upcoming/Past; Any venue and Any status popovers (phone sheets); No price and Hidden chips with counts; Load more; no results, loading and couldn't load; the ⋯ menu (Edit, both View links, Hide…, Delete… on manual rows; Merge… lands in 4b-4); Past list (Played, CONCERTS "went"); `?tab=all-events` redirect; old list removed | events, events-mobile, events-no-results, venue-filter, status-filter, event-menu, past-shows, loading-events | 4a-3a |
| **4b-2** Event edit | Desktop two columns and the phone stack; Show card (Title, lineup chips with Add an artist via 4c's artist search, venue picker, date and times); From the crawl; Status pills (no Moved until Hugh rules) with the Postponed dialog and sheet; Hide toggle and dialog; Price card (rows, Edit price opening the shared sheet, the Submitted prices link); Save bar with the dirty count, Discard, snap-back; past lock; loading, couldn't load, not found; old editor removed | event-edit, event-edit-mobile, edit-price-desktop, loading-event-edit, 10/postponed-d/m, 04/hide-from-site | 4a-3a, 4a-3b (lineup), 4b-1 |
| **4b-3** Add a show by hand | Desktop side panel and phone full screen; duplicate warning with "Open it"; lineup chips with roles; save failed | add-a-show-by-hand, 11/add-a-show-lineup-d | 4a-3b, 4b-1 |
| **4b-4** Merge | Desktop panel (pick then compare); phone full screen (pick, pick loading, nothing found, compare at 390 and 320, keep the second, loading, merging, couldn't merge); across-venue rows (A3) | merge-duplicates, gap-1 × 9 | 4a-3b, 4b-1 |
| **4b-5** Mark cancelled | Dialog (desktop) and sheet (phone), with Refund info | event-edit-mark-cancelled-desktop, mark-cancelled-mobile | **Hugh 4b#7**, 4b-2 |

Each PR stays within about 20 files and 800 lines. 4b-2 is the largest; if it runs over, it splits before opening (2a: the Show and From the crawl cards plus the Save bar; 2b: Status, Hide and Price).

## Route × viewport inventory (`docs/superpowers/inventories/admin-4b-<n>-*.json`, one per PR)

Widths for every row are `phone-320`, `phone` (390) and `desktop` (1300). CONTACT_SHEET_ROLE is admin.

| PR | Row id | Route / step | Wait on |
| --- | --- | --- | --- |
| 4b-1 | list | `/admin/events` | `[aria-label="Events"] table, [data-testid="events-list"]` |
| 4b-1 | venue-filter | list, then click Any venue | `[role="dialog"], [data-testid="venue-filter"]` |
| 4b-1 | status-filter | list, then click Any status | `[data-testid="status-filter"]` |
| 4b-1 | no-price | `/admin/events?noPrice=1` | list |
| 4b-1 | hidden | `/admin/events?hidden=1` | list |
| 4b-1 | no-results | `/admin/events?q=zzzzzz` | `[data-testid="empty-state"]` |
| 4b-1 | row-menu | list, then the first row's ⋯ | `[role="menu"]` |
| 4b-1 | past | `/admin/events?when=past` | list |
| 4b-2 | edit | `/admin/events/<fixture>/edit` | `[data-testid="event-edit"]` |
| 4b-2 | edit-price | edit, then Edit price | `[role="dialog"]` |
| 4b-2 | postponed | edit, then Postponed | `[role="dialog"]` |
| 4b-2 | hide | edit, then the Hide toggle | `[role="dialog"]` |
| 4b-2 | past-edit | `/admin/events/<past fixture>/edit` | `[data-testid="event-edit"]` |
| 4b-3 | add-show | list, then Add a show | `[data-testid="add-show"]` |
| 4b-3 | add-show-duplicate | add-show filled with the fixture venue, date and title | `[data-testid="duplicate-warning"]` |
| 4b-4 | merge-pick | edit ⋯, then Merge with another listing… | `[data-testid="merge-pick"]` |
| 4b-4 | merge-compare | pick, then the likely duplicate | `[data-testid="merge-compare"]` |
| 4b-5 | mark-cancelled | edit, then Cancelled | `[role="dialog"]` |

**Walked by hand** (each named in the inventory's `note`):

- the writes: save, merging, couldn't merge, Add show, Mark cancelled;
- loading boards (throttled);
- couldn't load (API down);
- nothing found (needs a show with no same-day duplicate);
- 320 keep the second.

**Fixtures:** the scratch Neon branch, under the orchestrator's lock. They need:

- one upcoming crawled show with Watchers and a price;
- one hidden show;
- one past show with a going mark;
- one manual show (after 4a-1) that is a same-day duplicate of the crawled show, for merge.

## Next

This plan merges on green CI (doc only). Then 4a-2 and 4a-3a/3b after #416, then 4b-1.
