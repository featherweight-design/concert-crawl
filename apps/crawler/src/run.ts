import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers } from '@concert-crawl/db'
import { eq, and, inArray } from 'drizzle-orm'
import { crawlVenue, tagEventsWithGenres } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runTriggeredCrawls(): Promise<{ processed: number }> {
  const claimed = await db
    .update(crawlTriggers)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(crawlTriggers.status, 'pending'))
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  if (claimed.length === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ count: claimed.length }, 'Processing pending crawl triggers')

  let browser: Browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (launchErr: unknown) {
    logger.error(
      { launchErr },
      'Browser launch failed — marking triggers as failed',
    )
    await db
      .update(crawlTriggers)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(
        inArray(
          crawlTriggers.id,
          claimed.map((trigger) => trigger.id),
        ),
      )
    return { processed: 0 }
  }

  try {
    for (const trigger of claimed) {
      try {
        const crawlRun = await crawlVenue(trigger.venueId, browser)
        await tagEventsWithGenres(trigger.venueId, crawlRun.id)
        const triggerStatus = crawlRun.status === 'failed' ? 'failed' : 'done'
        await db
          .update(crawlTriggers)
          .set({
            status: triggerStatus,
            crawlRunId: crawlRun.id,
            updatedAt: new Date(),
          })
          .where(eq(crawlTriggers.id, trigger.id))
      } catch (err) {
        logger.error(
          { err, triggerId: trigger.id, venueId: trigger.venueId },
          'Triggered crawl threw unexpectedly',
        )
        await db
          .update(crawlTriggers)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(crawlTriggers.id, trigger.id))
      }
    }
  } finally {
    await browser.close().catch((closeErr: unknown) => {
      logger.warn({ closeErr }, 'Browser close failed')
    })
  }

  return { processed: claimed.length }
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

  if (activeVenues.length === 0) {
    return { succeeded: 0, failed: 0, total: 0 }
  }

  let succeeded = 0
  let failed = 0

  const browser = await chromium.launch({ headless: true })
  try {
    for (
      let batchStart = 0;
      batchStart < activeVenues.length;
      batchStart += MAX_CONCURRENT
    ) {
      const batch = activeVenues.slice(batchStart, batchStart + MAX_CONCURRENT)
      const results = await Promise.allSettled(
        batch.map((venue) => crawlVenue(venue.id, browser)),
      )

      for (const [idx, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          succeeded++
          if (batch[idx]?.id) {
            try {
              await tagEventsWithGenres(batch[idx].id, result.value.id)
            } catch (tagErr) {
              logger.error(
                { tagErr, venueId: batch[idx]?.id },
                'Genre tagging failed — crawl data saved, genres skipped',
              )
            }
          }
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
  } finally {
    await browser.close().catch((closeErr: unknown) => {
      logger.warn({ closeErr }, 'Browser close failed')
    })
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length }
}
