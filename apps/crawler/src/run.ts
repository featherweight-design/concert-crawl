import { createLogger } from '@concert-crawl/logger'
import { db, venues } from '@concert-crawl/db'
import { eq, and } from 'drizzle-orm'
import { crawlVenue } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runDailyCrawl(): Promise<{
  succeeded: number
  failed: number
  total: number
}> {
  logger.info('Starting daily crawl')

  const activeVenues = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  let succeeded = 0
  let failed = 0

  for (
    let batchStart = 0;
    batchStart < activeVenues.length;
    batchStart += MAX_CONCURRENT
  ) {
    const batch = activeVenues.slice(batchStart, batchStart + MAX_CONCURRENT)
    const results = await Promise.allSettled(
      batch.map((venue) => crawlVenue(venue.id)),
    )

    for (const [idx, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        succeeded++
        logger.info(
          { venueId: batch[idx]?.id, name: batch[idx]?.name },
          'Crawl succeeded',
        )
      } else {
        failed++
        logger.error(
          {
            venueId: batch[idx]?.id,
            name: batch[idx]?.name,
            err: result.reason,
          },
          'Crawl failed',
        )
      }
    }
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length }
}
