# Venue removal request

`/bot` promises venues that if they ask, we take their listings and price history down within 30 days, and write back when it's done. This is how to keep that promise.

## When a request arrives

1. Confirm the sender speaks for the venue: their address is on the venue's own domain, or they reply from the contact address the venue's site lists.
2. Open the venue in admin (`/admin/venues/<id>`), go to **Danger zone**, and choose **Remove venue data**.
3. Give a reason that names the request, such as `venue emailed 2026-10-28 asking for removal`. It is kept in the audit log as `venue.remove`.
4. Type the venue's name to confirm.
5. Reply to the venue that it's done. Do this within 30 days of their email.

## What removal does

- **Shows leave the site.** The venue is set inactive, and every public query joins on `venues.active`. That covers browse, search, event detail, upcoming shows on artist pages, and the venue page. Removal also sets `removed_at`, which takes the venue's past shows off artist pages and search too. Plain deactivation keeps those (#1299). Inactive venues also refuse new price submissions, confirms, price checks and edits; a submitter can still delete their own.
- **Crawling stops.** `crawl_paused_at` is set, so no run fetches the venue, manual triggers and the price pipeline included.
- **Every price is deleted.** That means the crawled price on each event (`ticket_price_min`, `ticket_price_max`, `price_source`) and every row in `price_submissions` for the venue's events, along with their confirms. Users' price-drop alerts and price-check notices for those shows are deleted too, since they quote or concern those prices. This cannot be undone.
- **Event rows stay.** Users' Watching and Concerts entries for those shows survive, minus the price each Watching entry captured when it was saved (`user_events.saved_price`). Users who submitted a price lose that row from their Submitted prices list. Their earned price-cred is not taken back.

The audit entry is written in the same transaction as the deletion. It records how many submissions were deleted, how many event prices, saved prices and notifications were cleared.

Removal is safe to run twice. The price pipeline re-checks the venue before every write, so a run that was already going stops filling prices the moment removal commits. If someone submits a price in the same instant the removal commits, running removal again deletes it.

## If the venue later changes its mind

Use **Activate venue** and then **Resume crawling** in the same danger zone. Activating clears `removed_at`. The shows come back, past shows on artist pages included, and the next crawl refills the crawled prices. Prices that users submitted do not come back.

## Not this tool

- **Pause crawling** stops fetches but keeps the shows published. Use it while we wait on a venue's permission, as with Levitt.
- **Pause venue** takes the shows off the site but keeps every price.
- **Delete venue** removes the venue's config and detaches its events. It is not a removal request: the events keep their prices.
