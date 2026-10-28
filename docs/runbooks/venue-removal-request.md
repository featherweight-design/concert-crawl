# Venue removal request

`/bot` promises venues that if they ask, we take their listings and price history down within 30 days, and write back when it's done. This is how to keep that promise.

## When a request arrives

1. Confirm the sender speaks for the venue: their address is on the venue's own domain, or they reply from the contact address the venue's site lists.
2. Open the venue in admin (`/admin/venues/<id>`), go to **Danger zone**, and choose **Remove venue data**.
3. Give a reason that names the request, such as `venue emailed 2026-10-28 asking for removal`. It is kept in the audit log as `venue.remove`.
4. Type the venue's name to confirm.
5. Reply to the venue that it's done. Do this within 30 days of their email.

## What removal does

- **Shows leave the site.** The venue is set inactive, and every public query joins on `venues.active`. That covers browse, search, event detail, artist pages and the venue page. Inactive venues also refuse new price submissions, confirms, price checks and edits; a submitter can still delete their own.
- **Crawling stops.** `crawl_paused_at` is set, so no run fetches the venue, manual triggers and the price pipeline included.
- **Every price is deleted.** That means the crawled price on each event (`ticket_price_min`, `ticket_price_max`, `price_source`) and every row in `price_submissions` for the venue's events, along with their confirms. This cannot be undone.
- **Event rows stay.** Users' Watching and Concerts entries for those shows survive. Users who submitted a price lose that row from their Submitted prices list. Their earned price-cred is not taken back.

The audit entry records how many submissions were deleted and how many event prices were cleared.

## If the venue later changes its mind

Use **Activate venue** and then **Resume crawling** in the same danger zone. The shows come back, and the next crawl refills the crawled prices. Prices that users submitted do not come back.

## Not this tool

- **Pause crawling** stops fetches but keeps the shows published. Use it while we wait on a venue's permission, as with Levitt.
- **Pause venue** takes the shows off the site but keeps every price.
- **Delete venue** removes the venue's config and detaches its events. It is not a removal request: the events keep their prices.
