// apps/api/src/routes/billing-founder-window.ts
//
// GET /v1/billing/founder-window (eng infra spec Part 2 §1.4; execution
// plan PR 3.2).
//
// Public read endpoint for the tier picker's Founder card — pre-launch /
// open / closed plus the scarcity numbers. Mirrors the checkout-session
// founder gates (billing.ts evaluateFounderGates) so the picker and the
// write path can never disagree about window state. Cached in-process for
// 10s — the scarcity rail polls, and per-request DB reads are unnecessary.

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, founderWindow } from '@concert-crawl/db'
import type { FounderWindowView } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'

const CACHE_TTL_MS = 10_000

export interface FounderWindowRow {
  opensAt: Date | null
  closesAt: Date | null
  seatsTotal: number
  seatsRemaining: number
}

/**
 * Pure derivation — mirrors evaluateFounderGates (billing.ts): a future
 * opensAt is pre-launch, a boundary-exact closesAt is closed, exhausted
 * seats are closed. seatsRemaining is omitted pre-launch (spec §1.4).
 */
export const resolveFounderWindowView = (
  row: FounderWindowRow,
  now: Date,
): FounderWindowView => {
  if (row.opensAt === null || row.opensAt.getTime() > now.getTime()) {
    return { state: 'pre-launch', seatsTotal: row.seatsTotal, closesAt: null }
  }
  const closesAtIso = row.closesAt === null ? null : row.closesAt.toISOString()
  if (row.closesAt !== null && row.closesAt.getTime() <= now.getTime()) {
    return {
      state: 'closed',
      seatsTotal: row.seatsTotal,
      seatsRemaining: row.seatsRemaining,
      closesAt: closesAtIso,
    }
  }
  if (row.seatsRemaining <= 0) {
    return {
      state: 'closed',
      seatsTotal: row.seatsTotal,
      seatsRemaining: 0,
      closesAt: closesAtIso,
    }
  }
  return {
    state: 'open',
    seatsTotal: row.seatsTotal,
    seatsRemaining: row.seatsRemaining,
    closesAt: closesAtIso,
  }
}

export interface FounderWindowRouterOptions {
  // Tests pass 0 so every request re-reads the DB.
  cacheTtlMs?: number
}

export const createFounderWindowRouter = (
  options: FounderWindowRouterOptions = {},
): Hono => {
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS
  const founderWindowRouter = new Hono()

  let cached: { at: number; view: FounderWindowView } | null = null

  founderWindowRouter.get('/founder-window', async (ctx) => {
    const now = new Date()
    if (cached !== null && now.getTime() - cached.at < cacheTtlMs) {
      return ctx.json({ success: true, data: cached.view })
    }

    try {
      const [windowRow] = await db
        .select()
        .from(founderWindow)
        .where(eq(founderWindow.id, 1))
        .limit(1)
      if (!windowRow) {
        apiLogger.error({}, 'founder-window: singleton row missing')
        return ctx.json({ success: false, error: 'Internal server error' }, 500)
      }
      const view = resolveFounderWindowView(windowRow, now)
      cached = { at: now.getTime(), view }
      return ctx.json({ success: true, data: view })
    } catch (err) {
      apiLogger.error({ err }, 'founder-window: read failed')
      return ctx.json({ success: false, error: 'Internal server error' }, 500)
    }
  })

  return founderWindowRouter
}
