import * as Sentry from '@sentry/node'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers, events } from '@concert-crawl/db'
import { eq, and, isNull, lt, sql } from 'drizzle-orm'
import {
  crawlVenue,
  runArtistFanoutSafely,
  crawlFailureGrouping,
  evaluateRunHealth,
  reportRunHealth,
  sweepStaleEvents,
  tagEventsWithGenres,
  type CrossVenueCandidate,
  type VenueRunOutcome,
} from '@concert-crawl/crawler-core'
import { runPricePipeline } from '@concert-crawl/price-pipeline'
import { requestLandingRevalidationSafely } from './revalidate.js'

const logger = createLogger('crawler')
// Triggers are claimed one at a time, so a single process never holds more
// than one in 'processing'. A run then drains the queue claim by claim, bounded
// by CRAWL_TRIGGER_DRAIN_MAX and CRAWL_TRIGGER_BUDGET_MS (see
// triggerDrainLimits). The default of one trigger per run keeps the Render
// cron's behaviour: its 512Mi process was OOM-killed when one tick crawled
// unboundedly many venues (#1352, #1353).
const MAX_CONCURRENT = 1
const DEFAULT_TRIGGER_DRAIN_MAX = 1
// Sized for a job timeout of 60 minutes (the planned GitHub Actions triggers
// job; Render crons have no such limit). The budget only stops new claims, so
// the 20 minutes left are for the trigger in flight: its crawl (longest
// observed ~6 min), then its price pipeline and Spotify fan-out.
const DEFAULT_TRIGGER_BUDGET_MS = 40 * 60 * 1000

// A trigger still 'processing' after this long is assumed dead. Each trigger
// is claimed immediately before it is worked, so it sits in 'processing' for
// one venue's crawl, prices and fan-out only (the longest crawl observed in
// prod is ~6 min), however long the run that claimed it keeps draining. Anything past this was killed
// mid-flight: an OOM or a job timeout, which can neither be caught in-process
// nor write a crawl_runs row. Reaping at the start of the next run is the only
// place that death becomes visible (#1352, #1353).
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
    // otherwise poison the provider for the rest of the run. Nor is a browser
    // that has died: a drain crawls many venues on one browser, and a crash
    // part-way would otherwise fail every later browser-mode trigger.
    get: () => {
      if (pending !== null) return pending
      const launching = chromium
        .launch({ headless: true })
        .then((browser) => {
          browser.on('disconnected', () => {
            if (pending === launching) pending = null
          })
          return browser
        })
        .catch((launchErr: unknown) => {
          logger.error({ launchErr }, 'Chromium launch failed')
          pending = null
          throw launchErr
        })
      pending = launching
      return launching
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
// one so the kill is not silent. Runs before the first claim so a crash is
// surfaced by the next run.
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

async function isCrawlPaused(venueId: string): Promise<boolean> {
  const [row] = await db
    .select({ crawlPausedAt: venues.crawlPausedAt })
    .from(venues)
    .where(eq(venues.id, venueId))
  return row?.crawlPausedAt != null
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
        // A paused venue's pages are not fetched at all, prices included.
        isNull(venues.crawlPausedAt),
      ),
    )

  for (const event of unpricedEvents) {
    if (event.venueId === null) continue
    // Each pipeline run can take a while, so a pause made while this batch is
    // under way has to stop the events still waiting in it.
    if (await isCrawlPaused(venueId)) return
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

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    logger.warn({ name, raw, fallback }, 'Ignoring invalid crawler setting')
    return fallback
  }
  return value
}

/**
 * How far one triggers-mode run drains the queue: at most `maxTriggers`
 * triggers, and no new claim once `budgetMs` has passed since the run began.
 * Read per call so tests and hosts can set the environment late.
 */
export function triggerDrainLimits(): {
  maxTriggers: number
  budgetMs: number
} {
  return {
    maxTriggers: parsePositiveInt(
      'CRAWL_TRIGGER_DRAIN_MAX',
      DEFAULT_TRIGGER_DRAIN_MAX,
    ),
    budgetMs: parsePositiveInt(
      'CRAWL_TRIGGER_BUDGET_MS',
      DEFAULT_TRIGGER_BUDGET_MS,
    ),
  }
}

// Claim the oldest pending trigger (MAX_CONCURRENT is 1). Drizzle's update() has no limit(), so
// the bound goes in an id subquery; `skip locked` hands each row to exactly one
// claimer when two crawler processes overlap.
async function claimPendingTriggers(): Promise<
  { id: string; venueId: string; force: boolean }[]
> {
  return db
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
}

// Crawl one claimed trigger and record its outcome. Never throws: a failure
// marks this trigger failed and the drain moves on to the next one. Returns the
// number of new events the crawl inserted.
async function processTrigger(
  trigger: { id: string; venueId: string; force: boolean },
  getBrowser: () => Promise<Browser>,
  crossVenueCandidates: CrossVenueCandidate[],
): Promise<number> {
  let eventsInserted = 0
  try {
    const crawlRun = await crawlVenue(
      trigger.venueId,
      getBrowser,
      undefined,
      crossVenueCandidates,
      trigger.force,
    )
    if (crawlRun.status === 'failed') {
      const message = crawlRun.errorMessage ?? 'Crawl failed'
      const grouping = crawlFailureGrouping(message)
      // Grouped by cause, not by this call site.
      Sentry.captureException(new Error(message), {
        fingerprint: grouping.fingerprint,
        tags: { crawl_error_kind: grouping.errorKind },
        extra: { venueId: trigger.venueId, triggerId: trigger.id },
      })
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
      eventsInserted = crawlRun.eventsInserted ?? 0
      await runPricesForVenue(trigger.venueId)
      // #763 §10.1: Spotify new-show fan-out for this crawl's inserted
      // events. Awaited (not detached) because this process hard-exits
      // via process.exit(0) — a floating promise would be severed
      // (#649). Never throws; a fan-out bug cannot fail the trigger.
      await runArtistFanoutSafely(crawlRun.insertedEventIds)
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
    try {
      await db
        .update(crawlTriggers)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(crawlTriggers.id, trigger.id))
    } catch (markErr: unknown) {
      // The reaper fails the row on a later run; the drain carries on.
      logger.error(
        { markErr, triggerId: trigger.id },
        'Could not mark the trigger failed',
      )
    }
  }
  return eventsInserted
}

export async function runTriggeredCrawls(): Promise<{ processed: number }> {
  await reapStaleProcessingTriggers()

  const { maxTriggers, budgetMs } = triggerDrainLimits()
  const deadline = Date.now() + budgetMs

  let processed = 0
  // #847 — total new events across this run, used to decide whether the
  // landing page's ISR cache is worth busting proactively.
  let eventsInserted = 0
  let crossVenueCandidates: CrossVenueCandidate[] | null = null

  // Launch is deferred: a run of only http-mode venues never starts Chromium,
  // and every trigger in the drain shares the one browser. A launch failure
  // surfaces per trigger through processTrigger rather than ending the drain.
  const browser = createLazyBrowser()

  try {
    while (processed < maxTriggers) {
      if (processed > 0 && Date.now() >= deadline) {
        logger.info(
          { processed, budgetMs },
          'Trigger drain budget spent; leaving the rest for the next run',
        )
        break
      }
      const claimed = await claimPendingTriggers()
      if (claimed.length === 0) break

      crossVenueCandidates ??= await loadCrossVenueCandidates()
      for (const trigger of claimed) {
        eventsInserted += await processTrigger(
          trigger,
          browser.get,
          crossVenueCandidates,
        )
      }
      processed += claimed.length
    }
  } finally {
    await browser.close()
  }

  if (processed === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ processed }, 'Processed crawl triggers')
  await requestLandingRevalidationSafely(eventsInserted)

  return { processed }
}

export async function runDailyCrawl(): Promise<{
  succeeded: number
  failed: number
  total: number
  /** True when the run-level health check found a failure shared across venues. */
  degraded: boolean
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
        isNull(venues.crawlPausedAt),
      ),
    )

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  if (activeVenues.length === 0) {
    return { succeeded: 0, failed: 0, total: 0, degraded: false }
  }

  const crossVenueCandidates = await loadCrossVenueCandidates()

  let succeeded = 0
  let failed = 0
  // One per venue, for the run-level health check after the loop.
  const outcomes: VenueRunOutcome[] = []
  // #847 — see the triggered path.
  let eventsInserted = 0

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
        const venue = batch[idx]
        if (result.status === 'fulfilled') {
          if (result.value.status === 'failed') {
            failed++
            if (venue) {
              outcomes.push({
                venueId: venue.id,
                venueName: venue.name,
                errorMessage: result.value.errorMessage ?? 'Crawl failed',
              })
            }
            const message = result.value.errorMessage ?? 'Crawl failed'
            const grouping = crawlFailureGrouping(message)
            // Grouped by cause, not by this call site.
            Sentry.captureException(new Error(message), {
              fingerprint: grouping.fingerprint,
              tags: { crawl_error_kind: grouping.errorKind },
              extra: { venueId: batch[idx]?.id, name: batch[idx]?.name },
            })
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
            if (venue) {
              outcomes.push({
                venueId: venue.id,
                venueName: venue.name,
                errorMessage: null,
              })
            }
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
              eventsInserted += result.value.eventsInserted ?? 0
              await runPricesForVenue(batch[idx].id)
              // #763 §10.1 — same awaited-never-throwing fan-out as the
              // triggered path (see comment there).
              await runArtistFanoutSafely(result.value.insertedEventIds)
            }
          }
        } else {
          failed++
          if (venue) {
            outcomes.push({
              venueId: venue.id,
              venueName: venue.name,
              errorMessage: String(result.reason),
            })
          }
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

  // #675 — runs after every venue has been crawled, so a row seen on today's
  // page has already had `firstMissingAt` cleared and cannot be swept.
  try {
    await sweepStaleEvents()
  } catch (sweepErr: unknown) {
    Sentry.captureException(sweepErr)
    logger.error(
      { sweepErr },
      'Stale event sweep failed — crawl data unaffected',
    )
  }

  await requestLandingRevalidationSafely(eventsInserted)

  // Run-level health: the only check that sees a failure shared across venues
  // on the night it happens. Evaluation sits inside the try too; monitoring
  // must never break the crawl.
  let degraded = false
  try {
    const degradations = evaluateRunHealth(outcomes)
    degraded = degradations.length > 0
    await reportRunHealth(degradations, { failed, total: activeVenues.length })
  } catch (healthErr: unknown) {
    Sentry.captureException(healthErr)
    logger.error(
      { healthErr },
      'Run-health check failed — crawl data unaffected',
    )
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length, degraded },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length, degraded }
}
