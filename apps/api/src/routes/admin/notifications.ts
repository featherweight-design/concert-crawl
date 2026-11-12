import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { and, count, eq, gte, lte, max, ne, or } from 'drizzle-orm';
import { db, emailSendLog } from '@concert-crawl/db';
import type { AdminEmailDelivery } from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import {
  sendAdminAlertEmail,
  sendTestEmail,
  type EmailSendResult,
} from '../../lib/email.js';
import {
  TEST_EMAIL_KEYS,
  TEST_EMAIL_OPTIONS,
  type TestEmailKey,
} from '../../emails/test-fixtures.js';
import type { AdminVariables } from './index.js';

// TEST_EMAIL_KEYS (readonly TestEmailKey[]) is the single source of truth for
// the picker, the send path, and this validator. z.enum wants a literal tuple,
// so validate membership with a refine + type guard instead — no cast, and the
// list can never drift from what the send path can actually build.
function isTestEmailKey(value: string): value is TestEmailKey {
  return TEST_EMAIL_KEYS.some((key) => key === value);
}
const testEmailBodySchema = z.object({
  emailKey: z
    .string()
    .refine(isTestEmailKey, { message: 'Unknown email key' })
    .default('admin_alert'),
});

const deliveryQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24),
});

// The send path claims its email_send_log row as 'failed' before calling
// Resend and flips it to 'sent' (with the Resend id) in one update once Resend
// answers, so a 'failed' row never carries a Resend id and an in-flight claim
// looks exactly like a real failure. Any 'failed' row younger than this is
// held back from the delivery counts, so a send that failed outright also
// shows up only after the grace period. That lag is accepted.
export const IN_FLIGHT_SEND_GRACE_MS = 2 * 60_000;

const KNOWN_DELIVERY_STATUSES = new Set(['sent', 'failed', 'suppressed']);

export const notificationsAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/notifications/delivery?hours=24 — transactional email outcomes
// for the Health page's "The site" tile. Counts come from email_send_log by
// status inside the window; lastSentAt is the newest 'sent' row at any age.
// A row's created_at is when the send was claimed (it is written 'failed'
// first and flipped to 'sent' on success), so it trails the real send by the
// length of the Resend call, and a 'failed' row younger than
// IN_FLIGHT_SEND_GRACE_MS is not yet counted. Any status beyond the three known ones lands
// in `other`. Read-only, so it writes no audit row.
notificationsAdminRouter.get(
  '/delivery',
  zValidator('query', deliveryQuerySchema, validationHook),
  async (ctx) => {
    const { hours } = ctx.req.valid('query');
    const now = Date.now();
    const since = new Date(now - hours * 3_600_000);
    const inFlightSince = new Date(now - IN_FLIGHT_SEND_GRACE_MS);

    const [byStatus, lastSent] = await Promise.all([
      db
        .select({ status: emailSendLog.status, total: count() })
        .from(emailSendLog)
        .where(
          and(
            gte(emailSendLog.createdAt, since),
            // Not a possible in-flight claim: not (failed and younger
            // than the grace period).
            or(
              ne(emailSendLog.status, 'failed'),
              lte(emailSendLog.createdAt, inFlightSince),
            ),
          ),
        )
        .groupBy(emailSendLog.status),
      db
        .select({ at: max(emailSendLog.createdAt) })
        .from(emailSendLog)
        .where(eq(emailSendLog.status, 'sent')),
    ]);

    const totalFor = (status: string): number =>
      byStatus.find((row) => row.status === status)?.total ?? 0;
    const lastSentAt = lastSent[0]?.at ?? null;

    const data: AdminEmailDelivery = {
      lastSentAt: lastSentAt === null ? null : lastSentAt.toISOString(),
      sent: totalFor('sent'),
      failed: totalFor('failed'),
      suppressed: totalFor('suppressed'),
      other: byStatus
        .filter((row) => !KNOWN_DELIVERY_STATUSES.has(row.status))
        .reduce((sum, row) => sum + row.total, 0),
      hours,
    };
    return ctx.json({ success: true, data });
  },
);

// GET /v1/admin/notifications/test-email/options — enumerate every email the
// app can send, grouped for the Admin > Settings picker. Sourced from the same
// key set the send path validates, so the menu can never list a key the backend
// can't build, or omit one it can.
notificationsAdminRouter.get('/test-email/options', (ctx) => {
  return ctx.json({ success: true, data: TEST_EMAIL_OPTIONS });
});

// POST /v1/admin/notifications/test-email — send a sample of any email the app
// can produce to ADMIN_EMAIL, so an admin can review how each template lands in
// a real inbox and validate the Resend pipeline (env vars, domain, delivery)
// without waiting for a real trigger. Defaults to the generic admin alert for
// backward compatibility with the original single-button caller. Audited.
notificationsAdminRouter.post(
  '/test-email',
  zValidator('json', testEmailBodySchema, validationHook),
  async (ctx) => {
    const { userId } = getAuthUser(ctx);
    const { emailKey } = ctx.req.valid('json');

    // The generic admin alert keeps its richer, contextual body (who triggered
    // it and when) via the dedicated sender; every other key routes through the
    // fixture-backed sendTestEmail so the picker can preview real templates.
    const result: EmailSendResult =
      emailKey === 'admin_alert'
        ? await sendGenericAdminAlertTest(userId)
        : await sendTestEmail(emailKey);

    ctx.set('auditAction', 'notification.test_email');
    ctx.set('auditActorId', userId);
    ctx.set('auditMeta', { emailKey, result: serializeResultForAudit(result) });

    return ctx.json({ success: true, data: result });
  },
);

function sendGenericAdminAlertTest(userId: string): Promise<EmailSendResult> {
  const triggeredAt = new Date().toISOString();
  const adminUrl = process.env['ADMIN_URL'] ?? 'https://concertcrawl.app';

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
  });
}

// audit_log.metadata is jsonb, and JSON.stringify(new Error('msg')) returns
// '{}' — message + stack are non-enumerable. Flatten Error-like shapes into
// { name, message } so the audit row keeps useful context after a send_failed.
function serializeResultForAudit(
  result: EmailSendResult,
): Record<string, unknown> {
  if (result.sent) return { sent: true, resendId: result.resendId };
  const base: Record<string, unknown> = { sent: false, reason: result.reason };
  if (result.error !== undefined)
    base.error = serializeErrorForAudit(result.error);
  return base;
}

function serializeErrorForAudit(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  if (err && typeof err === 'object') return err;
  return String(err);
}
