import { Resend } from 'resend'

export async function sendCrawlFailureEmail(
  venueName: string,
  consecutiveFailures: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey || !adminEmail) return

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Concert Crawl Alerts <alerts@concertcrawl.app>',
    to: adminEmail,
    subject: `Crawl failing: ${venueName}`,
    html: `
      <p><strong>${venueName}</strong> has failed ${consecutiveFailures} consecutive crawls.</p>
      <p>The venue has been flagged for review. Visit the
      <a href="${process.env.ADMIN_URL ?? 'https://concertcrawl.app'}/admin/crawl">admin crawl dashboard</a>
      to investigate and take action.</p>
    `,
  })
}
