import * as Sentry from '@sentry/node'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers, events } from '@concert-crawl/db'
import { eq, and, isNull, lt, sql } from 'drizzle-orm'
import {
  crawlVenue,
  runSpotifyFanoutSafely,
  tagEventsWithGenres,
  type CrossVenueCandidate,
} from '@concert-crawl/crawler-core'
import { runPricePipeline } from '@concert-crawl/price-pipeline'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 1

// A trigger still 'processing' after this long cannot be alive: the longest
// legitimate crawl observed in prod is ~3.5 min, and the trigger cron fires
// every 10 min. Anything past this was killed mid-flight — almost always an
// OOM, which sends SIGKILL and so can neither be caught in-process nor write a
// crawl_runs row. Reaping on the next run is the only place that death becomes
// visible (#1352, #1353).
const STALE_PROCESSING_MS = 30 * 60 * 1000

// Chromium costs ~150Mi of the cron's 512Mi, and a run of only
// `crawlMode: 'http'` venues never needs one. Launch is deferred to the first
// fetchPage that actually requires a browser (#1352).
function createLazyBrowser(): {
  get: () => Promise<Browser>
  close: () => Promise<void>
} {
  let pending: Promise<Browser> | null = null
  return {
    // A rejection is deliberately not cached — a transient launch failure would
    // otherwise poison the provider for the rest of the run.
    get: () => {
      pending ??= chromium
        .launch({ headless: true })
        .catch((launchErr: unknown) => {
          pending = null
          throw launchErr
        })
      return pending
    },
    close: async () => {
      if (pending === null) return
      try {
        const browser = await pending
        await browser.close()
      } catch (closeErr: unknown) {
        logger.warn({ closeErr }, 'Browser close failed')
      }
    },
  }
}

// Fail triggers stranded in 'processing' by a process death, and report each
// one so the kill is not silent. Runs before the claim so a crash is surfaced
// within one cron tick.
async function reapStaleProcessingTriggers(): Promise<void> {
  const reaped = await db
    .update(crawlTriggers)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(
      and(
        eq(crawlTriggers.status, 'processing'),
        lt(crawlTriggers.updatedAt, new Date(Date.now() - STALE_PROCESSING_MS)),
      ),
    )
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  for (const trigger of reaped) {
    const err = new Error(
      `Crawl trigger ${trigger.id} was stranded in 'processing' — the crawler process died mid-crawl (no crawl_runs row was written)`,
    )
    Sentry.captureException(err, {
      extra: { triggerId: trigger.id, venueId: trigger.venueId },
    })
    Sentry.logger.error('crawl.trigger_stranded', {
      trigger_id: trigger.id,
      venue_id: trigger.venueId,
    })
    logger.error(
      { triggerId: trigger.id, venueId: trigger.venueId },
      'Reaped stale processing trigger — crawler process died mid-crawl',
    )
  }
}

// Load the list of venues (id + slug + name) that the cross-venue presale
// filter checks extracted event titles against. We use the verified set so
// even a paused/blocked venue's name still suppresses duplicates on a peer's
// crawl. See issue #605 + packages/crawler-core/src/lib/cross-venue-filter.ts.
async function loadCrossVenueCandidates(): Promise<CrossVenueCandidate[]> {
  return db
    .select({ id: venues.id, slug: venues.slug, name: venues.name })
    .from(venues)
    .where(eq(venues.verified, true))
}

async function runPricesForVenue(venueId: string): Promise<void> {
  const unpricedEvents = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      artist: events.artist,
      supportingArtists: events.supportingArtists,
      tourName: events.tourName,
      date: events.date,
      ticketUrl: events.ticketUrl,
      priceUrl: venues.priceUrl,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.venueId, venueId),
        isNull(events.ticketPriceMin),
        isNull(events.pipelineExhaustedAt),
      ),
    )

  for (const event of unpricedEvents) {
    if (event.venueId === null) continue
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: event.venueId,
        artist: event.artist,
        supportingArtists: event.supportingArtists,
        tourName: event.tourName,
        date: event.date,
        ticketUrl: event.ticketUrl,
        priceUrl: event.priceUrl ?? null,
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
  await reapStaleProcessingTriggers()

  // Claim at most MAX_CONCURRENT triggers per tick. Claiming every pending row
  // meant one tick could crawl unboundedly many venues in a single 512Mi
  // process; the remainder simply wait for the next 10-minute tick. Drizzle's
  // update() has no limit(), so the bound goes in an id subquery.
  const claimed = await db
    .update(crawlTriggers)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(
      sql`${crawlTriggers.id} in (
        select ${crawlTriggers.id} from ${crawlTriggers}
        where ${crawlTriggers.status} = 'pending'
        order by ${crawlTriggers.createdAt}
        limit ${MAX_CONCURRENT}
        for update skip locked
      )`,
    )
    .returning({
      id: crawlTriggers.id,
      venueId: crawlTriggers.venueId,
      force: crawlTriggers.force,
    })

  if (claimed.length === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ count: claimed.length }, 'Processing pending crawl triggers')

  const crossVenueCandidates = await loadCrossVenueCandidates()

  // Launch is deferred: a tick of only http-mode venues never starts Chromium.
  // A launch failure now surfaces per-trigger through the catch below rather
  // than failing the whole batch up front.
  const browser = createLazyBrowser()

  try {
    for (const trigger of claimed) {
      try {
        const crawlRun = await crawlVenue(
          trigger.venueId,
          browser.get,
          undefined,
          crossVenueCandidates,
          trigger.force,
        )
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
          // #763 §10.1: Spotify new-show fan-out for this crawl's inserted
          // events. Awaited (not detached) because this process hard-exits
          // via process.exit(0) — a floating promise would be severed
          // (#649). Never throws; a fan-out bug cannot fail the trigger.
          await runSpotifyFanoutSafely(crawlRun.insertedEventIds)
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
    await browser.close()
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
    .where(
      and(
        eq(venues.active, true),
        eq(venues.verified, true),
        isNull(venues.blockedAt),
      ),
    )

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  if (activeVenues.length === 0) {
    return { succeeded: 0, failed: 0, total: 0 }
  }

  const crossVenueCandidates = await loadCrossVenueCandidates()

  let succeeded = 0
  let failed = 0

  const browser = createLazyBrowser()
  try {
    for (
      let batchStart = 0;
      batchStart < activeVenues.length;
      batchStart += MAX_CONCURRENT
    ) {
      const batch = activeVenues.slice(batchStart, batchStart + MAX_CONCURRENT)
      const results = await Promise.allSettled(
        batch.map((venue) =>
          crawlVenue(venue.id, browser.get, undefined, crossVenueCandidates),
        ),
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
              // #763 §10.1 — same awaited-never-throwing fan-out as the
              // triggered path (see comment there).
              await runSpotifyFanoutSafely(result.value.insertedEventIds)
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
    await browser.close()
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length }
}
