import { asc, eq, gt, isNotNull, and } from 'drizzle-orm'
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
//
// Keyset-paginates over events.id ascending in BATCH_SIZE chunks so memory
// stays bounded and progress is reportable. 500 keeps each round-trip small
// enough to interleave with normal traffic without spiking active connections.

const BATCH_SIZE = 500

async function main(): Promise<void> {
  console.warn('[backfill-ticket-links] starting')

  let cursor: string | null = null
  let scanned = 0
  let updated = 0

  for (;;) {
    const conditions = [isNotNull(events.ticketUrl)]
    if (cursor !== null) conditions.push(gt(events.id, cursor))

    const batch = await db
      .select({
        eventId: events.id,
        ticketUrl: events.ticketUrl,
        venueWebsiteUrl: venues.websiteUrl,
        venueTicketVendor: venues.ticketVendor,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(and(...conditions))
      .orderBy(asc(events.id))
      .limit(BATCH_SIZE)

    if (batch.length === 0) break

    for (const row of batch) {
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

    scanned += batch.length
    const lastRow = batch[batch.length - 1]
    if (lastRow === undefined) break
    cursor = lastRow.eventId
    console.warn(
      `[backfill-ticket-links] scanned=${scanned} updated=${updated} cursor=${cursor}`,
    )

    if (batch.length < BATCH_SIZE) break
  }

  console.warn(
    `[backfill-ticket-links] done — scanned=${scanned} updated=${updated}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-ticket-links] failed:', err)
    process.exit(1)
  })
