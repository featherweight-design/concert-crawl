import { Resend } from 'resend'
import { apiLogger } from './logger.js'

const ADMIN_EMAIL_FROM = 'Concert Crawl Alerts <alerts@concertcrawl.app>'

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
