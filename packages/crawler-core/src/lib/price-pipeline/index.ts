import { eq, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog } from '@concert-crawl/db'
import type { PipelineContext, PriceTierResult, PriceSource } from './types.js'
import { tier1StructuredData } from './tier1-structured-data.js'
import { tier2Ticketmaster } from './tier2-ticketmaster.js'
import { tier3EventbriteDice } from './tier3-eventbrite-dice.js'
import { tier4SongkickBandsintown } from './tier4-songkick-bandsintown.js'
import { tier5SeatGeek } from './tier5-seatgeek.js'
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

async function updateEventPrice(
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
    .where(eq(events.id, eventId))
}

async function runTier(
  ctx: PipelineContext,
  source: PriceSource,
  fn: (ctx: PipelineContext) => Promise<PriceTierResult | null>,
): Promise<PriceTierResult | null> {
  const start = Date.now()
  let result: PriceTierResult | null = null
  let outcome: 'hit' | 'miss' | 'error' = 'miss'
  let errorMessage: string | undefined

  try {
    result = await fn(ctx)
    outcome = result ? 'hit' : 'miss'
  } catch (err) {
    outcome = 'error'
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  await logAttempt(ctx, source, outcome, Date.now() - start, errorMessage)
  return result
}

export async function runPricePipeline(ctx: PipelineContext): Promise<void> {
  const t1 = await runTier(ctx, 'structured_data', tier1StructuredData)
  if (t1) {
    await updateEventPrice(ctx.eventId, t1)
    return
  }

  const t2 = await runTier(ctx, 'ticketmaster', tier2Ticketmaster)
  if (t2) {
    await updateEventPrice(ctx.eventId, t2)
    return
  }

  // Tier 3 — run Eventbrite + Dice in parallel, log both before any early return
  const t3Start = Date.now()
  const tier3 = await tier3EventbriteDice(ctx).catch(() => ({
    eventbrite: null,
    dice: null,
  }))
  const t3Latency = Date.now() - t3Start
  await Promise.all([
    logAttempt(ctx, 'eventbrite', tier3.eventbrite ? 'hit' : 'miss', t3Latency),
    logAttempt(ctx, 'dice', tier3.dice ? 'hit' : 'miss', t3Latency),
  ])
  if (tier3.eventbrite) {
    await updateEventPrice(ctx.eventId, tier3.eventbrite)
    return
  }
  if (tier3.dice) {
    await updateEventPrice(ctx.eventId, tier3.dice)
    return
  }

  // Tier 4 — run Songkick + Bandsintown in parallel, log both before any early return
  const t4Start = Date.now()
  const tier4 = await tier4SongkickBandsintown(ctx).catch(() => ({
    songkick: null,
    bandsintown: null,
  }))
  const t4Latency = Date.now() - t4Start
  await Promise.all([
    logAttempt(ctx, 'songkick', tier4.songkick ? 'hit' : 'miss', t4Latency),
    logAttempt(
      ctx,
      'bandsintown',
      tier4.bandsintown ? 'hit' : 'miss',
      t4Latency,
    ),
  ])
  if (tier4.songkick) {
    await updateEventPrice(ctx.eventId, tier4.songkick)
    return
  }
  if (tier4.bandsintown) {
    await updateEventPrice(ctx.eventId, tier4.bandsintown)
    return
  }

  const t5 = await runTier(ctx, 'seatgeek', tier5SeatGeek)
  if (t5) {
    await updateEventPrice(ctx.eventId, t5)
    return
  }

  const t6 = await runTier(ctx, 'community', tier6Community)
  if (t6) {
    await updateEventPrice(ctx.eventId, t6)
    return
  }
}

export type { PipelineContext, PriceTierResult, PriceSource } from './types.js'
