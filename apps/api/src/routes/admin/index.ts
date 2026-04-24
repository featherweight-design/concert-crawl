import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog } from '@concert-crawl/db'
import { venuesAdminRouter } from './venues.js'
import { inviteCodesAdminRouter } from './invite-codes.js'

export type AdminVariables = {
  Variables: {
    auditAction?: string
    auditTargetId?: string
    auditActorId?: string
  }
}

export const adminRouter = new Hono<AdminVariables>()

// All admin routes require Clerk auth + admin role
adminRouter.use('*', clerkAuth)
adminRouter.use('*', requireRole('admin'))

// Write audit log entry after each mutating request
adminRouter.use('*', async (c, next) => {
  await next()

  // Only write audit log for mutating requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return

  const action = c.get('auditAction')
  const targetId = c.get('auditTargetId')
  const actorId = c.get('auditActorId')

  if (action && actorId) {
    try {
      await db.insert(auditLog).values({
        actorId,
        action,
        targetId: targetId ?? null,
        metadata: null,
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

adminRouter.route('/venues', venuesAdminRouter)
adminRouter.route('/invite-codes', inviteCodesAdminRouter)
