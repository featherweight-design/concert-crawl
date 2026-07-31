import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getAuthUser } from '../../middleware/auth.js'
import {
  sendAdminAlertEmail,
  sendTestEmail,
  type EmailSendResult,
} from '../../lib/email.js'
import {
  TEST_EMAIL_KEYS,
  TEST_EMAIL_OPTIONS,
  type TestEmailKey,
} from '../../emails/test-fixtures.js'
import type { AdminVariables } from './index.js'

// TEST_EMAIL_KEYS (readonly TestEmailKey[]) is the single source of truth for
// the picker, the send path, and this validator. z.enum wants a literal tuple,
// so validate membership with a refine + type guard instead — no cast, and the
// list can never drift from what the send path can actually build.
function isTestEmailKey(value: string): value is TestEmailKey {
  return TEST_EMAIL_KEYS.some((key) => key === value)
}
const testEmailBodySchema = z.object({
  emailKey: z
    .string()
    .refine(isTestEmailKey, { message: 'Unknown email key' })
    .default('admin_alert'),
})

export const notificationsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/notifications/test-email/options — enumerate every email the
// app can send, grouped for the Admin > Settings picker. Sourced from the same
// key set the send path validates, so the menu can never list a key the backend
// can't build, or omit one it can.
notificationsAdminRouter.get('/test-email/options', (ctx) => {
  return ctx.json({ success: true, data: TEST_EMAIL_OPTIONS })
})

// POST /v1/admin/notifications/test-email — send a sample of any email the app
// can produce to ADMIN_EMAIL, so an admin can review how each template lands in
// a real inbox and validate the Resend pipeline (env vars, domain, delivery)
// without waiting for a real trigger. Defaults to the generic admin alert for
// backward compatibility with the original single-button caller. Audited.
notificationsAdminRouter.post(
  '/test-email',
  zValidator('json', testEmailBodySchema),
  async (ctx) => {
    const { userId } = getAuthUser(ctx)
    const { emailKey } = ctx.req.valid('json')

    // The generic admin alert keeps its richer, contextual body (who triggered
    // it and when) via the dedicated sender; every other key routes through the
    // fixture-backed sendTestEmail so the picker can preview real templates.
    const result: EmailSendResult =
      emailKey === 'admin_alert'
        ? await sendGenericAdminAlertTest(userId)
        : await sendTestEmail(emailKey)

    ctx.set('auditAction', 'notification.test_email')
    ctx.set('auditActorId', userId)
    ctx.set('auditMeta', { emailKey, result: serializeResultForAudit(result) })

    return ctx.json({ success: true, data: result })
  },
)

function sendGenericAdminAlertTest(userId: string): Promise<EmailSendResult> {
  const triggeredAt = new Date().toISOString()
  const adminUrl = process.env['ADMIN_URL'] ?? 'https://concertcrawl.app'

  return sendAdminAlertEmail({
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
}

// audit_log.metadata is jsonb, and JSON.stringify(new Error('msg')) returns
// '{}' — message + stack are non-enumerable. Flatten Error-like shapes into
// { name, message } so the audit row keeps useful context after a send_failed.
function serializeResultForAudit(
  result: EmailSendResult,
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
