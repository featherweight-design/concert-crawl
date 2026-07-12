// apps/api/src/routes/admin/founder-window.ts
//
// Admin control panel for the founder launch window (execution plan PR 6.1).
//
//   GET  /v1/admin/founder-window         full singleton view + recent claims
//   POST /v1/admin/founder-window/open    flip opens_at → NOW() (launch!)
//   POST /v1/admin/founder-window/simulate-claim   decrement TEST counter
//   POST /v1/admin/founder-window/reset-test-seats reset TEST counter
//
// The `open` route is the real launch switch — the UI guards it behind a
// confirmation modal so a single click cannot launch the world. simulate-
// claim / reset-test-seats touch ONLY seats_remaining_test (spec §3.4), so
// pre-launch rehearsal never disturbs the real seat count.

import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, founderWindow, subscriptionEvents } from '@concert-crawl/db'
import type {
  AdminFounderClaim,
  AdminFounderWindow,
} from '@concert-crawl/types'
import type { AdminVariables } from './index.js'
import { resolveFounderWindowView } from '../billing-founder-window.js'
import { apiLogger } from '../../lib/logger.js'

const RECENT_CLAIMS_LIMIT = 20

// founder_claimed metadata carries the 1-based seat number (billing.ts). Parse
// defensively — the jsonb column is untyped, and older rows may lack it.
const claimMetadataSchema = z.object({ seatNumber: z.number().int() })

const readFounderWindowRow = async () => {
  const [row] = await db
    .select()
    .from(founderWindow)
    .where(eq(founderWindow.id, 1))
    .limit(1)
  return row
}

const loadRecentClaims = async (): Promise<AdminFounderClaim[]> => {
  const rows = await db
    .select({
      userId: subscriptionEvents.userId,
      metadata: subscriptionEvents.metadata,
      createdAt: subscriptionEvents.createdAt,
    })
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.type, 'founder_claimed'))
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(RECENT_CLAIMS_LIMIT)

  return rows.map((row) => {
    const parsed = claimMetadataSchema.safeParse(row.metadata)
    return {
      userId: row.userId,
      seatNumber: parsed.success ? parsed.data.seatNumber : null,
      claimedAt: row.createdAt.toISOString(),
    }
  })
}

export const founderWindowAdminRouter = new Hono<AdminVariables>()

founderWindowAdminRouter.get('/', async (ctx) => {
  const row = await readFounderWindowRow()
  if (!row) {
    apiLogger.error({}, 'admin founder-window: singleton row missing')
    return ctx.json({ success: false, error: 'Internal server error' }, 500)
  }

  const view = resolveFounderWindowView(row, new Date())
  const recentClaims = await loadRecentClaims()

  const data: AdminFounderWindow = {
    state: view.state,
    opensAt: row.opensAt === null ? null : row.opensAt.toISOString(),
    closesAt: row.closesAt === null ? null : row.closesAt.toISOString(),
    windowDays: row.windowDays,
    seatsTotal: row.seatsTotal,
    seatsRemaining: row.seatsRemaining,
    seatsRemainingTest: row.seatsRemainingTest,
    recentClaims,
  }
  return ctx.json({ success: true, data })
})

// POST /open — the launch switch. Flips opens_at to NOW(); closes_at is a
// generated column and follows automatically. Idempotency: refuse if the
// window is already launched so a second click can't reset the clock.
founderWindowAdminRouter.post('/open', async (ctx) => {
  const auth = getAuth(ctx)
  const row = await readFounderWindowRow()
  if (!row) {
    apiLogger.error({}, 'admin founder-window open: singleton row missing')
    return ctx.json({ success: false, error: 'Internal server error' }, 500)
  }
  if (row.opensAt !== null) {
    return ctx.json(
      {
        success: false,
        error: 'The founder window is already open',
        code: 'founder_window_already_open',
      },
      409,
    )
  }

  const opensAt = new Date()
  await db
    .update(founderWindow)
    .set({ opensAt })
    .where(and(eq(founderWindow.id, 1), sql`opens_at is null`))

  ctx.set('auditAction', 'founder_window.open')
  ctx.set('auditTargetId', 'founder_window:1')
  ctx.set('auditActorId', auth?.userId ?? 'unknown')
  ctx.set('auditMeta', { opensAt: opensAt.toISOString() })

  const updated = await readFounderWindowRow()
  if (!updated) {
    return ctx.json({ success: false, error: 'Internal server error' }, 500)
  }
  const view = resolveFounderWindowView(updated, new Date())
  const data: AdminFounderWindow = {
    state: view.state,
    opensAt: updated.opensAt === null ? null : updated.opensAt.toISOString(),
    closesAt: updated.closesAt === null ? null : updated.closesAt.toISOString(),
    windowDays: updated.windowDays,
    seatsTotal: updated.seatsTotal,
    seatsRemaining: updated.seatsRemaining,
    seatsRemainingTest: updated.seatsRemainingTest,
    recentClaims: await loadRecentClaims(),
  }
  return ctx.json({ success: true, data })
})

// POST /simulate-claim — decrement the TEST counter only. Guarded ≥ 0 in the
// UPDATE so concurrent clicks can't drive it negative; a no-op row count means
// the test seats are exhausted.
founderWindowAdminRouter.post('/simulate-claim', async (ctx) => {
  const auth = getAuth(ctx)
  const updated = await db
    .update(founderWindow)
    .set({ seatsRemainingTest: sql`${founderWindow.seatsRemainingTest} - 1` })
    .where(and(eq(founderWindow.id, 1), sql`seats_remaining_test > 0`))
    .returning({ seatsRemainingTest: founderWindow.seatsRemainingTest })

  if (updated.length === 0) {
    return ctx.json(
      {
        success: false,
        error: 'No test seats remaining — reset to run another rehearsal',
        code: 'founder_test_seats_exhausted',
      },
      409,
    )
  }

  ctx.set('auditAction', 'founder_window.simulate_claim')
  ctx.set('auditTargetId', 'founder_window:1')
  ctx.set('auditActorId', auth?.userId ?? 'unknown')
  ctx.set('auditMeta', { seatsRemainingTest: updated[0]?.seatsRemainingTest })

  return ctx.json({
    success: true,
    data: { seatsRemainingTest: updated[0]?.seatsRemainingTest ?? 0 },
  })
})

// POST /reset-test-seats — restore the TEST counter to seats_total so the
// simulate-claim rehearsal can be run repeatedly before launch.
founderWindowAdminRouter.post('/reset-test-seats', async (ctx) => {
  const auth = getAuth(ctx)
  const updated = await db
    .update(founderWindow)
    .set({ seatsRemainingTest: sql`${founderWindow.seatsTotal}` })
    .where(eq(founderWindow.id, 1))
    .returning({ seatsRemainingTest: founderWindow.seatsRemainingTest })

  if (updated.length === 0) {
    apiLogger.error({}, 'admin founder-window reset: singleton row missing')
    return ctx.json({ success: false, error: 'Internal server error' }, 500)
  }

  ctx.set('auditAction', 'founder_window.reset_test_seats')
  ctx.set('auditTargetId', 'founder_window:1')
  ctx.set('auditActorId', auth?.userId ?? 'unknown')
  ctx.set('auditMeta', { seatsRemainingTest: updated[0]?.seatsRemainingTest })

  return ctx.json({
    success: true,
    data: { seatsRemainingTest: updated[0]?.seatsRemainingTest ?? 0 },
  })
})
