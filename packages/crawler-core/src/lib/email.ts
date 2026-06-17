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

const ALERT_FROM = 'Concert Crawl Alerts <alerts@concertcrawl.app>'

// Shared sender for all crawl-side admin alerts. Returns void.
//
// Missing-env-var failures (no RESEND_API_KEY or no ADMIN_EMAIL) are
// swallowed with a structured warning log, since those are configuration
// states that shouldn't block the crawler from completing.
//
// Transport errors (network, Resend API rejection) from resend.emails.send
// DO propagate to the caller — every caller is expected to .catch() and
// log them so a Resend outage can't crash the crawl. The fire-and-forget
// invocation pattern at the call sites (e.g. event-count-alert.ts and the
// crawl.failed branch in crawl.ts) handles this.
async function sendAdminAlert(
  context: string,
  input: { subject: string; html: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey) {
    warnMissingEnv('RESEND_API_KEY', context)
    return
  }
  if (!adminEmail) {
    warnMissingEnv('ADMIN_EMAIL', context)
    return
  }

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: ALERT_FROM,
    to: adminEmail,
    subject: input.subject,
    html: input.html,
  })
}

export async function sendCrawlFailureEmail(
  venueName: string,
  consecutiveFailures: number,
): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://concertcrawl.app'
  await sendAdminAlert('sendCrawlFailureEmail', {
    subject: `Crawl failing: ${venueName}`,
    html: `
      <p><strong>${escapeHtml(venueName)}</strong> has failed ${consecutiveFailures} consecutive crawls.</p>
      <p>The venue has been flagged for review. Visit the
      <a href="${adminUrl}/admin/crawl">admin crawl dashboard</a>
      to investigate and take action.</p>
    `,
  })
}

export interface EventCountDropInput {
  venueName: string
  venueId: string
  crawlRunId: string
  eventsFound: number
  baselineCount: number
  dropPercent: number
}

export async function sendEventCountDropEmail(
  input: EventCountDropInput,
): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://concertcrawl.app'
  const severity = input.eventsFound === 0 ? 'went dark' : 'dropped sharply'
  await sendAdminAlert('sendEventCountDropEmail', {
    subject: `Event count ${severity}: ${input.venueName}`,
    html: `
      <p><strong>${escapeHtml(input.venueName)}</strong> ${severity} on the latest crawl.</p>
      <ul>
        <li>Events on this run: <strong>${input.eventsFound}</strong></li>
        <li>Rolling baseline: <strong>${input.baselineCount.toFixed(1)}</strong></li>
        <li>Drop: <strong>${input.dropPercent.toFixed(0)}%</strong></li>
      </ul>
      <p>This usually means the venue's site changed shape (hydration, paywall, redesign) and the crawler is no longer pulling events. The crawl returned <code>status: success</code>, so the consecutive-failure path did <em>not</em> trigger — that's why you're getting this alert instead.</p>
      <p><a href="${adminUrl}/admin/crawl">Admin crawl dashboard</a></p>
    `,
  })
}
