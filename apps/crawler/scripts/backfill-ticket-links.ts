import { eq, isNotNull } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
import { deriveTicketLinks } from '@concert-crawl/crawler-core'

// One-shot backfill. Re-derives every event's ticket_links from its current
// (ticket_url + venue) so prod data reflects the PR 2 heuristic immediately
// instead of waiting for each row's next crawl cycle. Idempotent: running it
// twice produces the same result, since deriveTicketLinks is a pure function
// of its inputs.
//
// Lives in apps/crawler (not packages/db) because the helper is in
// @concert-crawl/crawler-core, which already depends on @concert-crawl/db —
// putting the script in db would create a circular workspace dependency.

async function main(): Promise<void> {
  console.warn('[backfill-ticket-links] starting')

  const rows = await db
    .select({
      eventId: events.id,
      ticketUrl: events.ticketUrl,
      venueWebsiteUrl: venues.websiteUrl,
      venueTicketVendor: venues.ticketVendor,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(isNotNull(events.ticketUrl))

  console.warn(`[backfill-ticket-links] ${rows.length} rows to consider`)

  let updated = 0
  for (const row of rows) {
    const ticketLinks = deriveTicketLinks(row.ticketUrl, {
      websiteUrl: row.venueWebsiteUrl,
      ticketVendor: row.venueTicketVendor,
    })

    await db
      .update(events)
      .set({ ticketLinks, updatedAt: new Date() })
      .where(eq(events.id, row.eventId))
    updated += 1
  }

  console.warn(`[backfill-ticket-links] updated ${updated} rows`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-ticket-links] failed:', err)
    process.exit(1)
  })
