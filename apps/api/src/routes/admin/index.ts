import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog } from '@concert-crawl/db'
import { venuesAdminRouter } from './venues.js'
import { inviteCodesAdminRouter } from './invite-codes.js'

export const adminRouter = new Hono()

// All admin routes require Clerk auth + admin role
adminRouter.use('*', clerkAuth)
adminRouter.use('*', requireRole('admin'))

// Write audit log entry after each mutating request
adminRouter.use('*', async (c, next) => {
  await next()

  const action = c.get('auditAction' as never) as string | undefined
  const targetId = c.get('auditTargetId' as never) as string | undefined
  const actorId = c.get('auditActorId' as never) as string | undefined

  if (action && actorId) {
    await db.insert(auditLog).values({
      actorId,
      action,
      targetId: targetId ?? null,
      metadata: null,
    })
  }
})

adminRouter.route('/venues', venuesAdminRouter)
adminRouter.route('/invite-codes', inviteCodesAdminRouter)
