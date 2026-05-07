import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { db, notifications } from '@concert-crawl/db'
import type { AdminVariables } from './index.js'

const notifIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const notificationsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/notifications — list recent admin alerts
notificationsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { limit } = ctx.req.valid('query')

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'admin_alert'))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    return ctx.json({ success: true, data: rows })
  },
)

// POST /v1/admin/notifications/read-all — mark all unread admin alerts as read
// NOTE: registered before /:id/read to prevent Hono matching "read-all" as an :id param
notificationsAdminRouter.post('/read-all', async (ctx) => {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.type, 'admin_alert'), isNull(notifications.readAt)),
    )

  return ctx.json({ success: true })
})

// PATCH /v1/admin/notifications/:id/read — mark single notification as read
notificationsAdminRouter.patch(
  '/:id/read',
  zValidator('param', notifIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), isNull(notifications.readAt)))
      .returning()

    if (!updated) {
      return ctx.json(
        { success: false, error: 'Notification not found or already read' },
        404,
      )
    }

    return ctx.json({ success: true, data: updated })
  },
)
