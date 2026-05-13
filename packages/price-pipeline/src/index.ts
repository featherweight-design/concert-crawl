import { eq, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog } from '@concert-crawl/db'
import type { PriceSource } from '@concert-crawl/types'
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

  const t6 = await runTier(ctx, 'community', tier6Community)
  if (t6) {
    await updateEventPrice(ctx.eventId, t6)
    return
  }

  await db
    .update(events)
    .set({ pipelineExhaustedAt: sql`now()` })
    .where(eq(events.id, ctx.eventId))
}

export type { PipelineContext, PriceTierResult } from './types.js'
export type { PriceSource } from '@concert-crawl/types'
