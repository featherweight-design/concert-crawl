import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog, events, priceSubmissions } from '@concert-crawl/db'
import { eq, sql } from 'drizzle-orm'
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

// GET /v1/admin/review/counts — pending events + price submissions for sidebar badge
adminRouter.get('/review/counts', async (ctx) => {
  const [eventsResult, pricesResult] = await Promise.all([
    db
      .select({ pending: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, false)),
    db
      .select({ pending: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.status, 'pending')),
  ])
  return ctx.json({
    success: true,
    data: {
      pendingEvents: eventsResult[0]?.pending ?? 0,
      pendingPrices: pricesResult[0]?.pending ?? 0,
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
