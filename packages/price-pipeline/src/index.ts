import { and, eq, exists, isNull, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog, venues } from '@concert-crawl/db'
import type { PriceSource } from '@concert-crawl/types'
import { PriceFetchDeferredError } from './types.js'
import type { PipelineContext, PriceTierResult } from './types.js'
import { tier1StructuredData } from './tier1-structured-data.js'
import { tier6Community } from './tier6-community.js'

async function logAttempt(
  ctx: PipelineContext,
  source: PriceSource,
  outcome: 'hit' | 'miss' | 'error',
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await db.insert(priceRetrievalLog).values({
    eventId: ctx.eventId,
    venueId: ctx.venueId,
    source,
    outcome,
    latencyMs,
    errorMessage: errorMessage ?? null,
  })
}

export async function updateEventPrice(
  eventId: string,
  result: PriceTierResult,
): Promise<void> {
  await db
    .update(events)
    .set({
      ticketPriceMin: String(result.priceMin),
      ticketPriceMax: result.priceMax != null ? String(result.priceMax) : null,
      priceSource: result.source,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(events.id, eventId),
        // Checked at write time, not only when the run picked the venue: a run
        // walks a venue's shows for minutes, and an admin can pause or remove
        // the venue partway through. A removed venue's prices must not refill.
        exists(
          db
            .select({ one: sql`1` })
            .from(venues)
            .where(
              and(
                eq(venues.id, events.venueId),
                eq(venues.active, true),
                isNull(venues.crawlPausedAt),
              ),
            )
            // Waits out an uncommitted removal or pause, then re-reads the
            // venue, so the check never sees the state that removal replaced.
            .for('share'),
        ),
      ),
    )
}

async function runTier(
  ctx: PipelineContext,
  source: PriceSource,
  fn: (ctx: PipelineContext) => Promise<PriceTierResult | null>,
): Promise<{ result: PriceTierResult | null; deferred: boolean }> {
  const start = Date.now()
  let result: PriceTierResult | null = null
  let outcome: 'hit' | 'miss' | 'error' = 'miss'
  let errorMessage: string | undefined
  let deferred = false

  try {
    result = await fn(ctx)
    outcome = result ? 'hit' : 'miss'
  } catch (err) {
    outcome = 'error'
    errorMessage = err instanceof Error ? err.message : String(err)
    deferred = err instanceof PriceFetchDeferredError
  }

  await logAttempt(ctx, source, outcome, Date.now() - start, errorMessage)
  return { result, deferred }
}

export async function runPricePipeline(ctx: PipelineContext): Promise<void> {
  const t1 = await runTier(ctx, 'structured_data', tier1StructuredData)
  if (t1.result) {
    await updateEventPrice(ctx.eventId, t1.result)
    return
  }

  const t6 = await runTier(ctx, 'community', tier6Community)
  if (t6.result) {
    await updateEventPrice(ctx.eventId, t6.result)
    return
  }

  // A tier that could not try this run (robots.txt did not answer) has not
  // missed. Leave the event unstamped so the next run asks again.
  if (t1.deferred || t6.deferred) return

  await db
    .update(events)
    .set({ pipelineExhaustedAt: sql`now()` })
    .where(eq(events.id, ctx.eventId))
}

export type { PipelineContext, PriceTierResult } from './types.js'
export { PriceFetchDeferredError } from './types.js'
export type { PriceSource } from '@concert-crawl/types'
