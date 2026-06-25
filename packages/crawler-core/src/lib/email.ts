import { Resend } from 'resend'
import { reportFailure } from '@concert-crawl/logger'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Log a missing-env-var warning for the email-skipping case (no key, no
// recipient). When the misconfig is non-blocking (e.g. ADMIN_URL unset but
// we can fall back to the prod default), use warnMisconfigured instead so
// metrics on `email.skipped` aren't polluted with non-skip events.
function warnMissingEnv(varName: string, context: string): void {
  reportFailure({
    event: 'email.skipped',
    severity: 'warn',
    reason: `${varName} not set`,
    context,
  })
}

// Misconfiguration warning that does NOT block the email send (the alert
// still goes out, just with a fallback). Kept as a distinct event so a
// dashboard counting 'email.skipped' won't false-alarm on these.
function warnMisconfigured(varName: string, context: string): void {
  reportFailure({
    event: 'email.misconfigured',
    severity: 'warn',
    reason: `${varName} missing or invalid`,
    context,
  })
}

const ALERT_FROM = 'Concert Crawl Alerts <alerts@concertcrawl.app>'

// Environment label drives the subject prefix + body banner on alert emails.
// Reuses SENTRY_ENVIRONMENT (already set per-service in Render: 'local' /
// 'staging' / 'production') so we don't add a new env var when an existing
// one carries the same signal. Anything other than 'production' is treated
// as non-prod and is qualified in the alert so admins know not to act on it
// in the prod admin UI.
//
// Normalisation:
//   - trim whitespace and CR/LF (the latter would otherwise flow into the
//     email subject header, where Resend would reject the message or — on
//     a less strict transport — open a header-injection seam)
//   - lowercase so 'Production'/'PRODUCTION' don't slip past isProduction
//   - default empty to 'local' (the safest non-prod case)
function getEnvironmentLabel(): string {
  const raw = (process.env.SENTRY_ENVIRONMENT ?? '')
    .replace(/[\r\n]/g, '')
    .trim()
    .toLowerCase()
  return raw === '' ? 'local' : raw
}

function isProduction(): boolean {
  return getEnvironmentLabel() === 'production'
}

// Subject prefix: "[Staging] " / "[Local] " for non-prod, "" for prod.
function subjectPrefix(): string {
  if (isProduction()) return ''
  const label = getEnvironmentLabel()
  return `[${label.charAt(0).toUpperCase()}${label.slice(1)}] `
}

// Body banner: a single yellow strip rendered above the alert content so
// the email is visually distinct from a prod alert in the inbox preview.
function envBanner(): string {
  if (isProduction()) return ''
  const label = getEnvironmentLabel()
  return `
    <div style="background:#fff4cd;border:1px solid #f0d878;padding:10px 14px;border-radius:6px;font-family:sans-serif;font-size:13px;color:#5c4400;margin-bottom:16px;">
      Sent from <strong>${escapeHtml(label)}</strong> — not production. Take action in the corresponding ${escapeHtml(label)} admin UI.
    </div>
  `
}

// Build the admin-crawl deep-link. Uses the URL constructor so a trailing
// slash on ADMIN_URL (e.g. `https://concertcrawl.app/`) doesn't double-up
// into `//admin/crawl`, and searchParams handles query encoding.
// When a venueId is provided the dashboard pre-selects that venue's row
// (#608); without it the link lands on the full status list.
//
// Two failure modes are defended:
//   1. ADMIN_URL unset in a non-prod env → silently falling back to
//      concertcrawl.app would send admins to *prod* even though the email
//      is qualified [Staging] / [Local]. Log a warning so the missing
//      config surfaces (the email still sends — better an alert with a
//      slightly-wrong link than no alert).
//   2. ADMIN_URL set to a malformed value → `new URL()` would throw. Catch
//      and degrade to the production default rather than crash the entire
//      alert pipeline; the warning above already covers the diagnostic.
function adminCrawlUrl(venueId?: string): string {
  const PROD_DEFAULT = 'https://concertcrawl.app'
  const rawAdminUrl = process.env.ADMIN_URL

  if ((!rawAdminUrl || rawAdminUrl.trim() === '') && !isProduction()) {
    warnMisconfigured('ADMIN_URL', 'adminCrawlUrl (non-prod env)')
  }

  const adminUrl = rawAdminUrl?.trim() || PROD_DEFAULT

  let url: URL
  try {
    url = new URL('/admin/crawl', adminUrl)
  } catch (err) {
    // Distinct event from email.skipped — the email still sends, we just
    // can't honour the configured ADMIN_URL.
    reportFailure({
      event: 'email.misconfigured',
      severity: 'warn',
      reason: 'ADMIN_URL is not a parseable URL',
      adminUrl,
      error: String(err),
    })
    url = new URL('/admin/crawl', PROD_DEFAULT)
  }
  if (venueId) url.searchParams.set('venueId', venueId)
  return url.toString()
}

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

  // Defense-in-depth on the subject header: strip CR/LF from the final
  // string so untrusted input flowing into input.subject (venue names,
  // status strings, etc) can't open a header-injection seam or trip a
  // strict SMTP transport. SENTRY_ENVIRONMENT is already normalised at
  // its source, but this catches everything else passed by callers.
  const safeSubject = `${subjectPrefix()}${input.subject}`.replace(
    /[\r\n]+/g,
    ' ',
  )

  await resend.emails.send({
    from: ALERT_FROM,
    to: adminEmail,
    subject: safeSubject,
    html: `${envBanner()}${input.html}`,
  })
}

export interface CrawlFailureInput {
  venueName: string
  venueId: string
  consecutiveFailures: number
}

export async function sendCrawlFailureEmail(
  input: CrawlFailureInput,
): Promise<void> {
  const url = adminCrawlUrl(input.venueId)
  await sendAdminAlert('sendCrawlFailureEmail', {
    subject: `Crawl failing: ${input.venueName}`,
    html: `
      <p><strong>${escapeHtml(input.venueName)}</strong> has failed ${input.consecutiveFailures} consecutive crawls.</p>
      <p>The venue has been flagged for review. Visit the
      <a href="${url}">admin crawl dashboard</a>
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
  const url = adminCrawlUrl(input.venueId)
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
      <p><a href="${url}">Admin crawl dashboard</a></p>
    `,
  })
}
