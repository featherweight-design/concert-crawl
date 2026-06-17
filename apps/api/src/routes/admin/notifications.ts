import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { db, notifications } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import { sendAdminAlertEmail } from '../../lib/email.js'
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

// POST /v1/admin/notifications/test-email — send a test alert email to ADMIN_EMAIL
// to validate the Resend pipeline (env vars, domain verification, deliverability)
// without waiting for a real alert condition to fire. Audited.
notificationsAdminRouter.post('/test-email', async (ctx) => {
  const { userId } = getAuthUser(ctx)
  const triggeredAt = new Date().toISOString()
  const adminUrl = process.env['ADMIN_URL'] ?? 'https://concertcrawl.app'

  const result = await sendAdminAlertEmail({
    subject: 'Concert Crawl — test alert',
    html: `
      <p>This is a test email from the Concert Crawl admin notifications pipeline.</p>
      <ul>
        <li><strong>Triggered at:</strong> ${triggeredAt}</li>
        <li><strong>Triggered by:</strong> admin user ${userId}</li>
      </ul>
      <p>If you received this, the alert pipeline is working end-to-end: Resend API key, sender domain, and delivery to ADMIN_EMAIL are all healthy.</p>
      <p><a href="${adminUrl}/admin/settings">Admin settings</a></p>
    `,
    text: [
      'This is a test email from the Concert Crawl admin notifications pipeline.',
      '',
      `Triggered at: ${triggeredAt}`,
      `Triggered by: admin user ${userId}`,
      '',
      'If you received this, the alert pipeline is working end-to-end.',
    ].join('\n'),
  })

  ctx.set('auditAction', 'notification.test_email')
  ctx.set('auditActorId', userId)
  ctx.set('auditMeta', { result: serializeResultForAudit(result) })

  return ctx.json({ success: true, data: result })
})

// audit_log.metadata is jsonb, and JSON.stringify(new Error('msg')) returns
// '{}' — message + stack are non-enumerable. Flatten Error-like shapes into
// { name, message } so the audit row keeps useful context after a send_failed.
function serializeResultForAudit(
  result: Awaited<ReturnType<typeof sendAdminAlertEmail>>,
): Record<string, unknown> {
  if (result.sent) return { sent: true, resendId: result.resendId }
  const base: Record<string, unknown> = { sent: false, reason: result.reason }
  if (result.error !== undefined)
    base.error = serializeErrorForAudit(result.error)
  return base
}

function serializeErrorForAudit(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message }
  }
  if (err && typeof err === 'object') return err
  return String(err)
}

// POST /v1/admin/notifications/read-all — mark all unread admin alerts as read
// NOTE: registered before /:id/read to prevent Hono matching "read-all" as an :id param
notificationsAdminRouter.post('/read-all', async (ctx) => {
  const { userId } = getAuthUser(ctx)

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.type, 'admin_alert'), isNull(notifications.readAt)),
    )

  ctx.set('auditAction', 'notification.read_all')
  ctx.set('auditActorId', userId)

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

    const { userId } = getAuthUser(ctx)
    ctx.set('auditAction', 'notification.mark_read')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', userId)

    return ctx.json({ success: true, data: updated })
  },
)
