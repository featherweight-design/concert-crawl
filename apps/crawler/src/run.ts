import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers } from '@concert-crawl/db'
import { eq, and } from 'drizzle-orm'
import { crawlVenue } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runTriggeredCrawls(): Promise<{ processed: number }> {
  const pending = await db
    .select({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })
    .from(crawlTriggers)
    .where(eq(crawlTriggers.status, 'pending'))

  if (pending.length === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ count: pending.length }, 'Processing pending crawl triggers')

  for (const trigger of pending) {
    await db
      .update(crawlTriggers)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(crawlTriggers.id, trigger.id))

    try {
      const crawlRunId = crypto.randomUUID()
      await crawlVenue(trigger.venueId, crawlRunId)
      await db
        .update(crawlTriggers)
        .set({ status: 'done', crawlRunId, updatedAt: new Date() })
        .where(eq(crawlTriggers.id, trigger.id))
    } catch (err) {
      logger.error(
        { err, triggerId: trigger.id, venueId: trigger.venueId },
        'Triggered crawl failed',
      )
      await db
        .update(crawlTriggers)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(crawlTriggers.id, trigger.id))
    }
  }

  return { processed: pending.length }
}

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
