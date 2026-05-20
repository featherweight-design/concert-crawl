import { Resend } from 'resend'
import { apiLogger } from './logger.js'

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
