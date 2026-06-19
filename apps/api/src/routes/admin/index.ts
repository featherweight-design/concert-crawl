import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog, events, priceSubmissions } from '@concert-crawl/db'
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { venuesAdminRouter } from './venues.js'
import { inviteCodesAdminRouter } from './invite-codes.js'
import { crawlAdminRouter } from './crawl.js'
import { notificationsAdminRouter } from './notifications.js'
import { eventsAdminRouter } from './events.js'
import { pricesAdminRouter } from './prices.js'
import { usersAdminRouter } from './users.js'
import { feedbackAdminRouter } from './feedback.js'

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
// admin sidebar badge. The three numbers map 1:1 to the four data-bearing
// Review tabs (the All Events tab has no pill count).
adminRouter.get('/review/counts', async (ctx) => {
  // The missing branch needs today's Denver-local date so the count matches
  // what the list endpoint shows (which filters past-date stale events out).
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Denver',
  })

  const [eventFlagsResult, pricesResult, missingResult] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, false)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.status, 'pending')),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(
        and(
          isNotNull(events.firstMissingAt),
          eq(events.status, 'upcoming'),
          gte(events.date, today),
        ),
      ),
  ])
  return ctx.json({
    success: true,
    data: {
      eventFlags: eventFlagsResult[0]?.total ?? 0,
      prices: pricesResult[0]?.total ?? 0,
      missing: missingResult[0]?.total ?? 0,
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
