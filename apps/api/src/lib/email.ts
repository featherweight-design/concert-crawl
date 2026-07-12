import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { createClerkClient } from '@clerk/backend'
import {
  db,
  emailSendLog,
  emailTemplateConfig,
  type EmailTemplateKey,
} from '@concert-crawl/db'
import { getTemplateRenderer } from '../emails/registry.js'
import type { EmailTemplateVars } from '../emails/types.js'
import { apiLogger } from './logger.js'

const ADMIN_EMAIL_FROM = 'Concert Crawl Alerts <alerts@concertcrawl.app>'
const TRANSACTIONAL_EMAIL_FROM = 'Concert Crawl <billing@concertcrawl.app>'
const TRANSACTIONAL_REPLY_TO = 'support@concertcrawl.app'

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

/**
 * Transactional send pipeline (eng infra spec Part 2 §4.3): registry lookup →
 * per-template kill switch → dedupe-key idempotency → Clerk recipient
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
}): Promise<void> {
  const { templateKey, userId, dedupeKey, vars } = params
  const logContext = { templateKey, userId, dedupeKey }

  try {
    const renderer = getTemplateRenderer(templateKey)
    if (renderer === null) {
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: template not registered — skipping without a send-log row',
      )
      return
    }

    const [config] = await db
      .select({ enabled: emailTemplateConfig.enabled })
      .from(emailTemplateConfig)
      .where(eq(emailTemplateConfig.templateKey, templateKey))
      .limit(1)
    if (config !== undefined && !config.enabled) {
      // Suppression still consumes the dedupe key — re-enabling the template
      // must not replay every send it suppressed.
      await db
        .insert(emailSendLog)
        .values({ templateKey, userId, dedupeKey, status: 'suppressed' })
        .onConflictDoNothing()
      apiLogger.info(
        logContext,
        'sendTransactionalEmail: template disabled (kill switch) — suppressed',
      )
      return
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
      return
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      apiLogger.warn(
        logContext,
        'sendTransactionalEmail: RESEND_API_KEY not set — send-log row left failed',
      )
      return
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY
    if (!clerkSecretKey) {
      apiLogger.warn(
        logContext,
        'sendTransactionalEmail: CLERK_SECRET_KEY not set — send-log row left failed',
      )
      return
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
      return
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
      return
    }

    await db
      .update(emailSendLog)
      .set({ status: 'sent', resendId: response.data?.id ?? null })
      .where(eq(emailSendLog.id, claimedRow.id))
  } catch (err) {
    apiLogger.error(
      { err, ...logContext },
      'sendTransactionalEmail: send failed — send-log row (if claimed) left failed',
    )
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
