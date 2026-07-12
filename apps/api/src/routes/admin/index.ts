import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog, events, priceSubmissions } from '@concert-crawl/db'
import { and, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm'
import { venuesAdminRouter } from './venues.js'
import { inviteCodesAdminRouter } from './invite-codes.js'
import { crawlAdminRouter } from './crawl.js'
import { notificationsAdminRouter } from './notifications.js'
import { eventsAdminRouter } from './events.js'
import { pricesAdminRouter } from './prices.js'
import { usersAdminRouter } from './users.js'
import { feedbackAdminRouter } from './feedback.js'
import { contestsAdminRouter } from './contests.js'
import { costsAdminRouter } from './costs.js'
import { founderWindowAdminRouter } from './founder-window.js'

export type AdminVariables = {
  Variables: {
    auditAction?: string
    auditTargetId?: string
    auditActorId?: string
    auditMeta?: Record<string, unknown>
  }
}

export const adminRouter = new Hono<AdminVariables>()

// All admin routes require Clerk auth + admin role
adminRouter.use('*', clerkAuth)
adminRouter.use('*', requireRole('admin'))

// Write audit log entry after each mutating request
adminRouter.use('*', async (ctx, next) => {
  await next()

  // Only write audit log for mutating requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(ctx.req.method)) return

  const action = ctx.get('auditAction')
  const targetId = ctx.get('auditTargetId')
  const actorId = ctx.get('auditActorId')
  const auditMeta = ctx.get('auditMeta') ?? null

  if (action && actorId) {
    try {
      await db.insert(auditLog).values({
        actorId,
        action,
        targetId: targetId ?? null,
        metadata: auditMeta,
      })
    } catch (error) {
      console.error('Failed to write admin audit log', {
        actorId,
        action,
        targetId: targetId ?? null,
        error,
      })
    }
  }
})

// GET /v1/admin/review/counts — tab-pill counts for /admin/review and the
// admin sidebar badge. Four of the five data-bearing Review tabs render
// a pill count (All Events has none); this endpoint returns one number per
// pill so the SSR initial paint shows them without activating each tab.
//
// Each branch's WHERE clause MUST stay in lock-step with the corresponding
// list endpoint's default filter — otherwise the pill says "X items" while
// the tab renders "Queue clear" (issues #708, #709, #712). The semantics:
//
//   eventFlags    → /v1/admin/events?verified=false   (defaults to date >= today)
//   prices        → /v1/admin/prices/submissions      (defaults to status=pending)
//   missing       → /v1/admin/events?missing=true     (excludes hidden_from_consumer)
//   priceContests → /v1/admin/contests/prices         (pending counter rows;
//                   §4.6 partial unique index guarantees one per parent)
//
// priceContests' WHERE clause (status='pending' AND disputed_submission_id IS
// NOT NULL) mirrors the list endpoint in apps/api/src/routes/admin/contests.ts
// exactly. Deferred counters (lastAdminActionKind='defer') are still pending —
// defer is an engagement signal, not a state flip — so they correctly stay in
// the count.
adminRouter.get('/review/counts', async (ctx) => {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Denver',
  })

  const [eventFlagsResult, pricesResult, missingResult, priceContestsResult] =
    await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(events)
        .where(and(eq(events.verified, false), gte(events.date, today))),
      // `prices` counts pending submissions awaiting an admin decision in
      // the legacy queue at /admin/review > Prices. Contest counter rows
      // (`disputed_submission_id IS NOT NULL`) get their own pill via
      // `priceContests` below — including them here would double-count
      // them in BOTH pills AND violate the lock-step contract with
      // /v1/admin/prices/submissions (which now also excludes them).
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.status, 'pending'),
            isNull(priceSubmissions.disputedSubmissionId),
          ),
        ),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(events)
        .where(
          and(
            isNotNull(events.firstMissingAt),
            eq(events.status, 'upcoming'),
            gte(events.date, today),
            eq(events.hiddenFromConsumer, false),
          ),
        ),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.status, 'pending'),
            isNotNull(priceSubmissions.disputedSubmissionId),
          ),
        ),
    ])
  return ctx.json({
    success: true,
    data: {
      eventFlags: eventFlagsResult[0]?.total ?? 0,
      prices: pricesResult[0]?.total ?? 0,
      missing: missingResult[0]?.total ?? 0,
      priceContests: priceContestsResult[0]?.total ?? 0,
    },
  })
})

adminRouter.route('/venues', venuesAdminRouter)
adminRouter.route('/invite-codes', inviteCodesAdminRouter)
adminRouter.route('/crawl', crawlAdminRouter)
adminRouter.route('/notifications', notificationsAdminRouter)
adminRouter.route('/events', eventsAdminRouter)
adminRouter.route('/prices', pricesAdminRouter)
adminRouter.route('/users', usersAdminRouter)
adminRouter.route('/feedback', feedbackAdminRouter)
adminRouter.route('/contests', contestsAdminRouter)
adminRouter.route('/costs', costsAdminRouter)
adminRouter.route('/founder-window', founderWindowAdminRouter)
