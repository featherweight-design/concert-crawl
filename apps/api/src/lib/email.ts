import { Resend } from 'resend'
import { eq, sql } from 'drizzle-orm'
import { createClerkClient } from '@clerk/backend'
import * as Sentry from '@sentry/hono/node'
import {
  db,
  emailSendLog,
  emailTemplateConfig,
  userNotificationPreferences,
  type EmailTemplateKey,
} from '@concert-crawl/db'
import { getTemplateRenderer } from '../emails/registry.js'
import type { EmailTemplateVars } from '../emails/types.js'
import {
  buildTestEmail,
  type TestEmailFromCategory,
  type TestEmailKey,
} from '../emails/test-fixtures.js'
import { apiLogger } from './logger.js'

const ADMIN_EMAIL_FROM = 'Concert Crawl Alerts <alerts@concertcrawl.app>'
const TRANSACTIONAL_EMAIL_FROM = 'Concert Crawl <billing@concertcrawl.app>'
const TRANSACTIONAL_REPLY_TO = 'support@concertcrawl.app'
const INVITE_EMAIL_FROM = 'Concert Crawl <noreply@concertcrawl.app>'

function testEmailFrom(category: TestEmailFromCategory): string {
  if (category === 'transactional') return TRANSACTIONAL_EMAIL_FROM
  if (category === 'invite') return INVITE_EMAIL_FROM
  return ADMIN_EMAIL_FROM
}

// Standard result envelope for email sends — callers can branch on .sent
// instead of relying on thrown exceptions.
export type EmailSendResult =
  | { sent: true; resendId: string | null }
  | {
      sent: false
      reason: 'missing_api_key' | 'missing_admin_email' | 'send_failed'
      error?: unknown
    }

interface AdminAlertEmailInput {
  subject: string
  html: string
  text?: string
}

/**
 * Send an alert email to the admin (ADMIN_EMAIL env). Used by the admin
 * test endpoint and any code that needs to surface an operational signal
 * (e.g. event-count drops in #624).
 *
 * Returns a structured result instead of throwing — most callers want to
 * log/audit the outcome but not blow up the request.
 *
 * Logs a warning when env vars are missing so that misconfigurations are
 * visible in the API log stream (not silently dropped).
 */
export async function sendAdminAlertEmail(
  input: AdminAlertEmailInput,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey) {
    apiLogger.warn('RESEND_API_KEY not set — admin alert email skipped')
    return { sent: false, reason: 'missing_api_key' }
  }

  if (!adminEmail) {
    apiLogger.warn('ADMIN_EMAIL not set — admin alert email skipped')
    return { sent: false, reason: 'missing_admin_email' }
  }

  const resend = new Resend(apiKey)

  try {
    const response = await resend.emails.send({
      from: ADMIN_EMAIL_FROM,
      to: adminEmail,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    })

    // Resend's send() can return either { data, error } or throw. When
    // it returns a structured error, surface that as a send failure.
    if (response.error) {
      apiLogger.error(
        { resendError: response.error },
        'Resend rejected admin alert email',
      )
      return { sent: false, reason: 'send_failed', error: response.error }
    }

    return { sent: true, resendId: response.data?.id ?? null }
  } catch (err) {
    apiLogger.error({ err }, 'Admin alert email send threw')
    return { sent: false, reason: 'send_failed', error: err }
  }
}

// Outcome of a transactional send attempt. Only 'sent' means an email
// actually left via Resend — callers that count deliveries (e.g. the
// spotify-weekly summary) must check for it rather than assuming a resolved
// promise implies a send.
export type TransactionalSendOutcome =
  'sent' | 'not-registered' | 'suppressed' | 'deduped' | 'failed'

// The 'product' email family (#967) — the templates whose footers carry the
// signed one-click unsubscribe. The gate lives here rather than at each call
// site because an unsubscribe link that records a preference nothing reads is
// worse than no link at all, and a fourth product template added later would
// otherwise ship unguarded.
//
// Billing templates are deliberately absent: receipts and dunning are
// transactional and stop only by cancelling the subscription.
const PRODUCT_FAMILY_TEMPLATES: ReadonlySet<EmailTemplateKey> = new Set([
  'winback',
  'gifting_ending_notice',
  'welcome_gifted',
])

// Absent row means the user never touched their preferences, which is the
// default-on state — only an explicit false suppresses.
const productEmailsAllowed = async (userId: string): Promise<boolean> => {
  const [prefs] = await db
    .select({ enabled: userNotificationPreferences.productEmailsEnabled })
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1)
  return prefs?.enabled ?? true
}

/**
 * Transactional send pipeline (eng infra spec Part 2 §4.3): registry lookup →
 * product-family opt-out → per-template kill switch → dedupe-key idempotency →
 * Clerk recipient
 * resolution → Resend send. NEVER throws — callers are webhook handlers whose
 * responses must not depend on email delivery.
 */
export async function sendTransactionalEmail<
  K extends EmailTemplateKey,
>(params: {
  templateKey: K
  userId: string
  dedupeKey: string
  vars: EmailTemplateVars[K]
}): Promise<TransactionalSendOutcome> {
  const { templateKey, userId, dedupeKey, vars } = params
  const logContext = { templateKey, userId, dedupeKey }

  try {
    const renderer = getTemplateRenderer(templateKey)
    if (renderer === null) {
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: template not registered — skipping without a send-log row',
      )
      return 'not-registered'
    }

    if (
      PRODUCT_FAMILY_TEMPLATES.has(templateKey) &&
      !(await productEmailsAllowed(userId))
    ) {
      // Same claim-then-suppress shape as the kill switch: consuming the
      // dedupe key means re-subscribing does not replay months of skipped
      // winbacks at them.
      await db
        .insert(emailSendLog)
        .values({ templateKey, userId, dedupeKey, status: 'suppressed' })
        .onConflictDoUpdate({
          target: [emailSendLog.templateKey, emailSendLog.dedupeKey],
          set: { status: 'suppressed' },
          setWhere: sql`${emailSendLog.status} = 'failed'`,
        })
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: user unsubscribed from product emails — suppressed',
      )
      return 'suppressed'
    }

    const [config] = await db
      .select({ enabled: emailTemplateConfig.enabled })
      .from(emailTemplateConfig)
      .where(eq(emailTemplateConfig.templateKey, templateKey))
      .limit(1)
    if (config !== undefined && !config.enabled) {
      // Suppression still consumes the dedupe key — re-enabling the template
      // must not replay every send it suppressed. A pre-existing 'failed'
      // claim flips to 'suppressed' so the daily retry sweep skips it; a
      // 'sent' row is never rewritten.
      await db
        .insert(emailSendLog)
        .values({ templateKey, userId, dedupeKey, status: 'suppressed' })
        .onConflictDoUpdate({
          target: [emailSendLog.templateKey, emailSendLog.dedupeKey],
          set: { status: 'suppressed' },
          setWhere: sql`${emailSendLog.status} = 'failed'`,
        })
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: template disabled (kill switch) — suppressed',
      )
      return 'suppressed'
    }

    // Claim-then-flip: the row is inserted as 'failed' to consume the dedupe
    // key before the send, then flipped to 'sent' on success — a crash
    // mid-send leaves 'failed', which the daily-job retry sweep handles.
    const claimed = await db
      .insert(emailSendLog)
      .values({ templateKey, userId, dedupeKey, status: 'failed' })
      .onConflictDoNothing()
      .returning({ id: emailSendLog.id })
    const claimedRow = claimed[0]
    if (claimedRow === undefined) {
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: dedupe key already consumed — skipping',
      )
      return 'deduped'
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      apiLogger.warn(
        logContext,
        'sendTransactionalEmail: RESEND_API_KEY not set — send-log row left failed',
      )
      return 'failed'
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY
    if (!clerkSecretKey) {
      apiLogger.warn(
        logContext,
        'sendTransactionalEmail: CLERK_SECRET_KEY not set — send-log row left failed',
      )
      return 'failed'
    }

    const clerkClient = createClerkClient({ secretKey: clerkSecretKey })
    const clerkUser = await clerkClient.users.getUser(userId)
    const primaryAddress = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )
    const recipient =
      primaryAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null
    if (recipient === null) {
      apiLogger.warn(
        logContext,
        'sendTransactionalEmail: no Clerk email address — send-log row left failed',
      )
      return 'failed'
    }

    const rendered = renderer(vars)
    const resend = new Resend(apiKey)
    const response = await resend.emails.send({
      from: TRANSACTIONAL_EMAIL_FROM,
      replyTo: TRANSACTIONAL_REPLY_TO,
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    if (response.error) {
      apiLogger.error(
        { ...logContext, resendError: response.error },
        'sendTransactionalEmail: Resend rejected send — send-log row left failed',
      )
      return 'failed'
    }

    await db
      .update(emailSendLog)
      .set({ status: 'sent', resendId: response.data?.id ?? null })
      .where(eq(emailSendLog.id, claimedRow.id))
    return 'sent'
  } catch (err) {
    apiLogger.error(
      { err, ...logContext },
      'sendTransactionalEmail: send failed — send-log row (if claimed) left failed',
    )
    return 'failed'
  }
}

/**
 * Send a rendered sample of any email the app can produce to ADMIN_EMAIL, for
 * pre-launch review of how each template lands in a real inbox. Backs the
 * Admin > Settings email picker.
 *
 * Deliberately NOT the transactional pipeline: no email_send_log row, no Clerk
 * recipient lookup, no per-template kill switch — so the same template can be
 * re-sent freely and even a disabled one can be previewed. The subject is
 * prefixed with [TEST] and delivery always goes to the admin, never a user.
 *
 * Returns a structured result (never throws). A real send failure is captured
 * to Sentry so a broken Resend/domain config surfaces instead of failing
 * silently.
 */
export async function sendTestEmail(
  key: TestEmailKey,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey) {
    apiLogger.warn({ key }, 'RESEND_API_KEY not set — test email skipped')
    return { sent: false, reason: 'missing_api_key' }
  }
  if (!adminEmail) {
    apiLogger.warn({ key }, 'ADMIN_EMAIL not set — test email skipped')
    return { sent: false, reason: 'missing_admin_email' }
  }

  const resend = new Resend(apiKey)

  try {
    // Inside the try so a build failure (e.g. an unregistered template key)
    // returns { sent:false } like every other failure, honouring the
    // never-throws contract instead of bubbling up as a 500.
    const built = buildTestEmail(key)
    const response = await resend.emails.send({
      from: testEmailFrom(built.fromCategory),
      to: adminEmail,
      subject: `[TEST] ${built.subject}`,
      text: built.text,
      // Omit html entirely for text-only samples (e.g. invite_code) — sending
      // the plain text as html collapses whitespace/newlines in many clients.
      ...(built.html.trim() === '' ? {} : { html: built.html }),
    })

    if (response.error) {
      apiLogger.error(
        { key, resendError: response.error },
        'Resend rejected test email',
      )
      Sentry.captureException(response.error, {
        tags: { email_test_send: 'resend_rejected' },
        extra: { key },
      })
      return { sent: false, reason: 'send_failed', error: response.error }
    }

    return { sent: true, resendId: response.data?.id ?? null }
  } catch (err) {
    apiLogger.error({ err, key }, 'Test email send threw')
    Sentry.captureException(err, {
      tags: { email_test_send: 'threw' },
      extra: { key },
    })
    return { sent: false, reason: 'send_failed', error: err }
  }
}

export async function sendInviteCodeEmail(
  recipientEmail: string,
  code: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    apiLogger.warn('RESEND_API_KEY not set — skipping invite code email')
    return
  }

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Concert Crawl <noreply@concertcrawl.app>',
    to: recipientEmail,
    subject: "You're invited to Concert Crawl",
    text: [
      "You've been invited to join Concert Crawl — Denver's live music calendar.",
      '',
      `Your invite code: ${code}`,
      '',
      'Use it at: https://concertcrawl.app/invite',
    ].join('\n'),
  })
}
