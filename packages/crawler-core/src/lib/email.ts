import { Resend } from 'resend'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Log a missing-env-var warning so misconfigurations surface in Render
// logs / Sentry instead of silently dropping admin alerts.
function warnMissingEnv(varName: string, context: string): void {
  console.warn(
    JSON.stringify({
      event: 'email.skipped',
      reason: `${varName} not set`,
      context,
    }),
  )
}

export async function sendCrawlFailureEmail(
  venueName: string,
  consecutiveFailures: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey) {
    warnMissingEnv('RESEND_API_KEY', 'sendCrawlFailureEmail')
    return
  }
  if (!adminEmail) {
    warnMissingEnv('ADMIN_EMAIL', 'sendCrawlFailureEmail')
    return
  }

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Concert Crawl Alerts <alerts@concertcrawl.app>',
    to: adminEmail,
    subject: `Crawl failing: ${venueName}`,
    html: `
      <p><strong>${escapeHtml(venueName)}</strong> has failed ${consecutiveFailures} consecutive crawls.</p>
      <p>The venue has been flagged for review. Visit the
      <a href="${process.env.ADMIN_URL ?? 'https://concertcrawl.app'}/admin/crawl">admin crawl dashboard</a>
      to investigate and take action.</p>
    `,
  })
}
