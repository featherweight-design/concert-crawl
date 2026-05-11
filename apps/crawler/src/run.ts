import * as Sentry from '@sentry/node'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers, events } from '@concert-crawl/db'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import { crawlVenue, tagEventsWithGenres } from '@concert-crawl/crawler-core'
import { runPricePipeline } from '@concert-crawl/price-pipeline'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 1

async function runPricesForVenue(venueId: string): Promise<void> {
  const unpricedEvents = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      artist: events.artist,
      date: events.date,
      ticketUrl: events.ticketUrl,
    })
    .from(events)
    .where(and(eq(events.venueId, venueId), isNull(events.ticketPriceMin)))

  for (const event of unpricedEvents) {
    if (event.venueId === null) continue
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: event.venueId,
        artist: event.artist,
        date: event.date,
        ticketUrl: event.ticketUrl,
      })
    } catch (priceErr: unknown) {
      logger.error(
        { priceErr, eventId: event.id },
        'Price pipeline failed for event — skipping',
      )
    }
  }
}

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
        if (crawlRun.status === 'failed') {
          Sentry.captureException(
            new Error(crawlRun.errorMessage ?? 'Crawl failed'),
            { extra: { venueId: trigger.venueId, triggerId: trigger.id } },
          )
          Sentry.logger.warn('crawl.failed', {
            venue_id: trigger.venueId,
            trigger_id: trigger.id,
            status: 'failed',
            error_message: crawlRun.errorMessage ?? null,
            events_found: crawlRun.eventsFound,
            duration_ms: crawlRun.durationMs,
          })
        } else {
          Sentry.logger.info('crawl.complete', {
            venue_id: trigger.venueId,
            trigger_id: trigger.id,
            status: 'success',
            events_found: crawlRun.eventsFound,
            events_inserted: crawlRun.eventsInserted,
            events_updated: crawlRun.eventsUpdated ?? 0,
            duration_ms: crawlRun.durationMs,
            extraction_strategy: crawlRun.extractionStrategyUsed ?? null,
            llm_cost_usd: crawlRun.llmCostUsd ?? null,
          })
        }
        try {
          await tagEventsWithGenres(trigger.venueId, crawlRun.id)
        } catch (tagErr) {
          logger.error(
            { tagErr, venueId: trigger.venueId, triggerId: trigger.id },
            'Genre tagging failed — crawl data saved, genres skipped',
          )
        }
        if (crawlRun.status !== 'failed') {
          await runPricesForVenue(trigger.venueId)
        }
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
        Sentry.captureException(err, {
          extra: { triggerId: trigger.id, venueId: trigger.venueId },
        })
        Sentry.logger.error('crawl.error', {
          venue_id: trigger.venueId,
          trigger_id: trigger.id,
          error: String(err),
        })
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
          if (result.value.status === 'failed') {
            failed++
            Sentry.captureException(
              new Error(result.value.errorMessage ?? 'Crawl failed'),
              { extra: { venueId: batch[idx]?.id, name: batch[idx]?.name } },
            )
            Sentry.logger.warn('crawl.failed', {
              venue_id: batch[idx]?.id,
              venue_name: batch[idx]?.name,
              status: 'failed',
              error_message: result.value.errorMessage ?? null,
              events_found: result.value.eventsFound,
              duration_ms: result.value.durationMs,
            })
            logger.error(
              { venueId: batch[idx]?.id, name: batch[idx]?.name },
              'Crawl failed',
            )
          } else {
            succeeded++
            Sentry.logger.info('crawl.complete', {
              venue_id: batch[idx]?.id,
              venue_name: batch[idx]?.name,
              status: 'success',
              events_found: result.value.eventsFound,
              events_inserted: result.value.eventsInserted,
              events_updated: result.value.eventsUpdated ?? 0,
              duration_ms: result.value.durationMs,
              extraction_strategy: result.value.extractionStrategyUsed ?? null,
              llm_cost_usd: result.value.llmCostUsd ?? null,
            })
            logger.info(
              { venueId: batch[idx]?.id, name: batch[idx]?.name },
              'Crawl succeeded',
            )
          }
          if (batch[idx]?.id) {
            try {
              await tagEventsWithGenres(batch[idx].id, result.value.id)
            } catch (tagErr) {
              logger.error(
                { tagErr, venueId: batch[idx]?.id },
                'Genre tagging failed — crawl data saved, genres skipped',
              )
            }
            if (result.value.status !== 'failed') {
              await runPricesForVenue(batch[idx].id)
            }
          }
        } else {
          failed++
          Sentry.captureException(result.reason, {
            extra: { venueId: batch[idx]?.id, name: batch[idx]?.name },
          })
          Sentry.logger.error('crawl.error', {
            venue_id: batch[idx]?.id,
            venue_name: batch[idx]?.name,
            error: String(result.reason),
          })
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
