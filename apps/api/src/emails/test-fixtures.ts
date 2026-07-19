// apps/api/src/emails/test-fixtures.ts
//
// Backs the Admin > Settings "send a test email" picker. Enumerates every
// email the application can send and provides a realistic mock payload for
// each, so an admin can send any template to ADMIN_EMAIL and review how it
// renders in a real inbox before launch.
//
// Comprehensiveness guarantee: TRANSACTIONAL_TEST_VARS is a mapped type over
// EmailTemplateKey, so adding a new transactional template without a fixture
// fails to compile. The operational entries (admin alert, invite, crawler
// alerts) are enumerated explicitly below.

import type { EmailTemplateKey } from '@concert-crawl/db'
import { getTemplateRenderer } from './registry.js'
import type { EmailTemplateVars } from './types.js'

// Operational (non-transactional) sends the app makes outside the template
// registry. crawl_failure / event_count_drop mirror the crawler-side alerts
// in packages/crawler-core/src/lib/email.ts — kept as faithful samples here
// so the API doesn't need to depend on crawler-core (Playwright et al).
// Completeness is enforced by OPERATIONAL_BUILDERS below: it's a
// Record<OperationalTestKey, …>, so every key here needs a builder to compile.
type OperationalTestKey =
  'admin_alert' | 'invite_code' | 'crawl_failure' | 'event_count_drop'

export type TestEmailKey = EmailTemplateKey | OperationalTestKey

// From-address category — sendTestEmail maps this to the real sender so the
// test exercises the same domain/identity the live send would use.
export type TestEmailFromCategory = 'transactional' | 'alert' | 'invite'

export interface BuiltTestEmail {
  subject: string
  html: string
  text: string
  fromCategory: TestEmailFromCategory
}

export interface TestEmailOption {
  key: TestEmailKey
  label: string
  group: 'Customer' | 'Operational'
}

// Drives the picker dropdown (via GET /v1/admin/notifications/test-email/options).
// Sourced from the same key set the send path validates, so the menu can never
// list a key the backend can't build, or omit one it can.
export const TEST_EMAIL_OPTIONS: readonly TestEmailOption[] = [
  { key: 'welcome_paid', label: 'Welcome — paid', group: 'Customer' },
  { key: 'welcome_gifted', label: 'Welcome — gifted', group: 'Customer' },
  {
    key: 'renewal_receipt_monthly',
    label: 'Renewal receipt (monthly)',
    group: 'Customer',
  },
  {
    key: 'renewal_receipt_annual',
    label: 'Renewal receipt (annual)',
    group: 'Customer',
  },
  {
    key: 'dunning_1_card_declined',
    label: 'Dunning 1 — card declined',
    group: 'Customer',
  },
  {
    key: 'dunning_2_still_declined',
    label: 'Dunning 2 — still declined',
    group: 'Customer',
  },
  {
    key: 'dunning_3_final_warning',
    label: 'Dunning 3 — final warning',
    group: 'Customer',
  },
  {
    key: 'card_expiring_soon',
    label: 'Card expiring soon',
    group: 'Customer',
  },
  {
    key: 'cancellation_ack',
    label: 'Cancellation acknowledgement',
    group: 'Customer',
  },
  {
    key: 'gifting_ending_notice',
    label: 'Gift ending notice',
    group: 'Customer',
  },
  { key: 'winback', label: 'Win-back', group: 'Customer' },
  {
    key: 'spotify_digest',
    label: 'Spotify weekly digest',
    group: 'Customer',
  },
  { key: 'admin_alert', label: 'Admin alert (generic)', group: 'Operational' },
  { key: 'invite_code', label: 'Invite code', group: 'Operational' },
  { key: 'crawl_failure', label: 'Crawl failure alert', group: 'Operational' },
  {
    key: 'event_count_drop',
    label: 'Event-count drop alert',
    group: 'Operational',
  },
]

// Derived from the picker options (not spread from EMAIL_TEMPLATE_KEYS) so this
// module loads without evaluating a db export at import time — full-app tests
// mock @concert-crawl/db with partial factories, and a top-level spread of a
// missing export crashes them. Comprehensiveness is still enforced: the
// TRANSACTIONAL_TEST_VARS mapped type is a compile error if a template lacks a
// fixture, and test-fixtures.test.ts asserts every template key is listed here.
export const TEST_EMAIL_KEYS: readonly TestEmailKey[] = TEST_EMAIL_OPTIONS.map(
  (option) => option.key,
)

// Realistic sample vars for each transactional template. Mapped over
// EmailTemplateKey so a new template without a fixture is a compile error.
const TRANSACTIONAL_TEST_VARS: {
  [K in EmailTemplateKey]: EmailTemplateVars[K]
} = {
  welcome_paid: { tier: 'premium' },
  welcome_gifted: {
    gifterName: 'Alex Rivera',
    giftEndsAt: '2026-08-15T00:00:00.000Z',
  },
  renewal_receipt_monthly: {
    periodLabel: 'July 2026',
    amount: '$5.00',
    tierName: 'Premium',
    periodEnd: '2026-08-13T00:00:00.000Z',
    chargeDate: '2026-07-13T00:00:00.000Z',
    customerId: 'cus_TEST0000000000',
    stripeReceiptUrl: 'https://pay.stripe.com/receipts/test_sample',
  },
  renewal_receipt_annual: {
    periodLabel: 'July 2026 – July 2027',
    amount: '$50.00',
    tierName: 'Premium',
    periodEnd: '2027-07-13T00:00:00.000Z',
    chargeDate: '2026-07-13T00:00:00.000Z',
    customerId: 'cus_TEST0000000000',
    stripeReceiptUrl: 'https://pay.stripe.com/receipts/test_sample',
  },
  dunning_1_card_declined: {
    tierName: 'Premium',
    portalUrl: 'https://billing.stripe.com/p/session/test_sample',
  },
  dunning_2_still_declined: {
    tierName: 'Premium',
    portalUrl: 'https://billing.stripe.com/p/session/test_sample',
  },
  dunning_3_final_warning: {
    tierName: 'Premium',
    portalUrl: 'https://billing.stripe.com/p/session/test_sample',
  },
  card_expiring_soon: {
    tierName: 'Premium',
    daysRemaining: 6,
    card: { brand: 'visa', last4: '4242', expMonth: 8, expYear: 2026 },
  },
  cancellation_ack: {
    tierName: 'Premium',
    accessEndsAt: '2026-08-13T00:00:00.000Z',
  },
  gifting_ending_notice: {
    gifterName: 'Alex Rivera',
    giftEndsAt: '2026-07-20T00:00:00.000Z',
  },
  winback: { tierName: 'Premium' },
  spotify_digest: {
    shows: [
      {
        artist: 'Sleep Token',
        tourName: 'Even In Arcadia Tour',
        venue: 'Fillmore Auditorium',
        dateLabel: 'Thu · Jul 17',
        priceLabel: '$42',
        url: 'https://concertcrawl.app/events/sample-1',
      },
      {
        artist: 'Wednesday',
        tourName: 'with Lightning Bug',
        venue: 'Mission Ballroom',
        dateLabel: 'Fri · Jul 18',
        priceLabel: '$30',
        url: 'https://concertcrawl.app/events/sample-2',
      },
      {
        artist: 'Geese',
        tourName: '3D Country Tour',
        venue: 'Ogden Theatre',
        dateLabel: 'Sat · Jul 19',
        priceLabel: '$25',
        url: 'https://concertcrawl.app/events/sample-3',
      },
      {
        artist: 'Mannequin Pussy',
        tourName: 'I Got Heaven Tour',
        venue: 'Bluebird Theater',
        dateLabel: 'Sun · Jul 20',
        priceLabel: '$28',
        url: 'https://concertcrawl.app/events/sample-4',
      },
      {
        artist: 'Turnstile',
        tourName: null,
        venue: 'Mission Ballroom',
        dateLabel: 'Mon · Jul 21',
        priceLabel: null,
        url: 'https://concertcrawl.app/events/sample-5',
      },
      {
        artist: 'Hop Along',
        tourName: null,
        venue: 'Larimer Lounge',
        dateLabel: 'Tue · Jul 22',
        priceLabel: '$22',
        url: 'https://concertcrawl.app/events/sample-6',
      },
    ],
    tastePicks: [],
    unsubscribeUrl: null,
  },
}

// Derived from the fixture map, not a runtime @concert-crawl/db export, so this
// module evaluates even when API route tests mock that package with partial
// factories — a missing named export would otherwise break module evaluation
// before the test runs. The mapped type on TRANSACTIONAL_TEST_VARS already
// guarantees these keys are exactly EmailTemplateKey.
const TRANSACTIONAL_KEYS: ReadonlySet<string> = new Set(
  Object.keys(TRANSACTIONAL_TEST_VARS),
)

function isTransactionalKey(key: TestEmailKey): key is EmailTemplateKey {
  return TRANSACTIONAL_KEYS.has(key)
}

// Faithful samples of the crawler-side admin alerts (source of truth:
// packages/crawler-core/src/lib/email.ts). Duplicated intentionally to keep
// the API decoupled from the crawler package.
// Env-driven so staging/dev test emails link to that environment's admin, not
// prod. Mirrors the ADMIN_URL ?? prod fallback in the notifications route.
const SAMPLE_ADMIN_URL = process.env.ADMIN_URL ?? 'https://concertcrawl.app'

function buildAdminAlertSample(): BuiltTestEmail {
  return {
    fromCategory: 'alert',
    subject: 'Concert Crawl — test alert',
    html: `
      <p>This is a test of the Concert Crawl admin notifications pipeline.</p>
      <p>If you received this, the alert pipeline is healthy end-to-end: Resend API key, sender domain, and delivery to ADMIN_EMAIL are all working.</p>
      <p><a href="${SAMPLE_ADMIN_URL}/admin/settings">Admin settings</a></p>
    `,
    text: [
      'This is a test of the Concert Crawl admin notifications pipeline.',
      '',
      'If you received this, the alert pipeline is healthy end-to-end.',
    ].join('\n'),
  }
}

function buildInviteCodeSample(): BuiltTestEmail {
  const code = 'SAMPLE-CODE-1234'
  return {
    fromCategory: 'invite',
    subject: "You're invited to Concert Crawl",
    html: '',
    text: [
      "You've been invited to join Concert Crawl — Denver's live music calendar.",
      '',
      `Your invite code: ${code}`,
      '',
      'Use it at: https://concertcrawl.app/invite',
    ].join('\n'),
  }
}

function buildCrawlFailureSample(): BuiltTestEmail {
  const venueName = 'Ogden Theatre'
  const url = `${SAMPLE_ADMIN_URL}/admin/crawl?venueId=sample-venue-id`
  return {
    fromCategory: 'alert',
    subject: `Crawl failing: ${venueName}`,
    html: `
      <p><strong>${venueName}</strong> has failed 3 consecutive crawls.</p>
      <p>The venue has been flagged for review. Visit the
      <a href="${url}">admin crawl dashboard</a>
      to investigate and take action.</p>
    `,
    text: `${venueName} has failed 3 consecutive crawls. Visit ${url} to investigate.`,
  }
}

function buildEventCountDropSample(): BuiltTestEmail {
  const venueName = 'Ogden Theatre'
  const url = `${SAMPLE_ADMIN_URL}/admin/crawl?venueId=sample-venue-id`
  return {
    fromCategory: 'alert',
    subject: `Event count dropped sharply: ${venueName}`,
    html: `
      <p><strong>${venueName}</strong> dropped sharply on the latest crawl.</p>
      <ul>
        <li>Events on this run: <strong>2</strong></li>
        <li>Rolling baseline: <strong>18.0</strong></li>
        <li>Drop: <strong>89%</strong></li>
      </ul>
      <p>This usually means the venue's site changed shape and the crawler is no longer pulling events.</p>
      <p><a href="${url}">Admin crawl dashboard</a></p>
    `,
    text: `${venueName} dropped sharply: 2 events vs 18.0 baseline (89% drop). See ${url}.`,
  }
}

const OPERATIONAL_BUILDERS: Record<OperationalTestKey, () => BuiltTestEmail> = {
  admin_alert: buildAdminAlertSample,
  invite_code: buildInviteCodeSample,
  crawl_failure: buildCrawlFailureSample,
  event_count_drop: buildEventCountDropSample,
}

/**
 * Render a test email for the given key using its sample payload. Transactional
 * keys route through the shared template registry; operational keys use the
 * faithful samples above. Throws only if a transactional key is somehow not
 * registered (a wiring bug that should surface loudly).
 */
export function buildTestEmail(key: TestEmailKey): BuiltTestEmail {
  if (isTransactionalKey(key)) {
    const renderer = getTemplateRenderer(key)
    if (renderer === null) {
      throw new Error(`No renderer registered for template key: ${key}`)
    }
    const rendered = renderer(TRANSACTIONAL_TEST_VARS[key])
    return {
      fromCategory: 'transactional',
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }
  }
  return OPERATIONAL_BUILDERS[key]()
}
