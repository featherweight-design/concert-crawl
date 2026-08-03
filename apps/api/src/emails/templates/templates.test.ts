import { describe, expect, it } from 'vitest'

import { getTemplateRenderer } from '../registry.js'
import type { RenderedEmail } from '../types.js'
import { renderCancellationAck } from './cancellation-ack.js'
import { renderCardExpiringSoon } from './card-expiring-soon.js'
import { renderDunning1CardDeclined } from './dunning-1-card-declined.js'
import { renderDunning2StillDeclined } from './dunning-2-still-declined.js'
import { renderDunning3FinalWarning } from './dunning-3-final-warning.js'
import { renderGiftingEndingNotice } from './gifting-ending-notice.js'
import { renderRenewalReceiptAnnual } from './renewal-receipt-annual.js'
import { renderRenewalReceiptMonthly } from './renewal-receipt-monthly.js'
import { renderWelcomeGifted } from './welcome-gifted.js'
import { renderWelcomePaid } from './welcome-paid.js'
import { renderSpotifyDigest } from './spotify-digest.js'
import { renderWinback } from './winback.js'

const PORTAL_URL = 'https://billing.stripe.com/p/session/test_abc123'

const DIGEST_SHOW = {
  artist: 'Sleep Token',
  tourName: 'Even In Arcadia Tour',
  venue: 'Fillmore Auditorium',
  dateLabel: 'Thu · Jul 17',
  priceLabel: '$42',
  url: 'https://concertcrawl.app/events/sample-1',
}

const digestShows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...DIGEST_SHOW,
    artist: `Artist ${i + 1}`,
    url: `https://concertcrawl.app/events/sample-${i + 1}`,
  }))

const RECEIPT_BASE = {
  periodLabel: 'June 2026',
  amount: '$5.00',
  tierName: 'Premium',
  periodEnd: '2026-07-15T12:00:00Z',
  chargeDate: '2026-06-15T12:00:00Z',
  customerId: 'cus_test123',
  stripeReceiptUrl: 'https://pay.stripe.com/receipts/abc123',
}

const ANNUAL_BASE = {
  ...RECEIPT_BASE,
  periodLabel: 'June 2026 – June 2027',
  amount: '$50.00',
  periodEnd: '2027-07-15T12:00:00Z',
}

// Bounds relaxed for the #783 branded voice — subjects and preheaders are more
// conversational than the old system's terse lines. The footer now reads
// "Turn off {family} emails" (per-family unsubscribe), not "Manage emails".
const assertShellContract = (rendered: RenderedEmail): void => {
  expect(rendered.subject.length).toBeGreaterThanOrEqual(20)
  expect(rendered.subject.length).toBeLessThanOrEqual(65)
  expect(rendered.preheader.length).toBeGreaterThanOrEqual(40)
  expect(rendered.preheader.length).toBeLessThanOrEqual(120)
  expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(rendered.subject).not.toMatch(/\[concert crawl\]/i)
  expect(rendered.html).toContain('<!doctype html>')
  expect(rendered.html).toContain('Turn off')
  expect(rendered.text).toContain('Concert Crawl · Denver, CO')
}

describe('shell contract across all templates', () => {
  const renderedEmails: [string, RenderedEmail][] = [
    ['welcome_paid (premium)', renderWelcomePaid({ tier: 'premium' })],
    ['welcome_paid (supporter)', renderWelcomePaid({ tier: 'supporter' })],
    [
      'welcome_paid (founder)',
      renderWelcomePaid({ tier: 'founder', founderSeatNumber: 7 }),
    ],
    [
      'welcome_gifted',
      renderWelcomeGifted({ gifterName: 'Sam', giftEndsAt: null }),
    ],
    ['renewal_receipt_monthly', renderRenewalReceiptMonthly(RECEIPT_BASE)],
    ['renewal_receipt_annual', renderRenewalReceiptAnnual(ANNUAL_BASE)],
    [
      'cancellation_ack',
      renderCancellationAck({ tierName: 'Premium', accessEndsAt: null }),
    ],
    [
      'dunning_1_card_declined',
      renderDunning1CardDeclined({
        tierName: 'Premium',
        portalUrl: PORTAL_URL,
      }),
    ],
    [
      'dunning_2_still_declined',
      renderDunning2StillDeclined({
        tierName: 'Premium',
        portalUrl: PORTAL_URL,
      }),
    ],
    [
      'dunning_3_final_warning',
      renderDunning3FinalWarning({
        tierName: 'Premium',
        portalUrl: PORTAL_URL,
      }),
    ],
    [
      'card_expiring_soon (30d)',
      renderCardExpiringSoon({ tierName: 'Premium', daysRemaining: 30 }),
    ],
    [
      'card_expiring_soon (1d, null tier)',
      renderCardExpiringSoon({ tierName: null, daysRemaining: 1 }),
    ],
    [
      'gifting_ending_notice',
      renderGiftingEndingNotice({
        gifterName: 'Sam',
        giftEndsAt: '2026-12-01T12:00:00Z',
      }),
    ],
    [
      'gifting_ending_notice (null gifter)',
      renderGiftingEndingNotice({
        gifterName: null,
        giftEndsAt: '2026-12-01T12:00:00Z',
      }),
    ],
    ['winback', renderWinback({ tierName: 'Premium' })],
    ['winback (null tier)', renderWinback({ tierName: null })],
    [
      'spotify_digest',
      renderSpotifyDigest({
        shows: digestShows(6),
        tastePicks: [],
        unsubscribeUrl: 'https://api.example.com/v1/email/unsubscribe?x=y',
      }),
    ],
    [
      'spotify_digest (zero week)',
      renderSpotifyDigest({
        shows: [],
        tastePicks: digestShows(2),
        unsubscribeUrl: null,
      }),
    ],
  ]

  it.each(renderedEmails)(
    '%s meets subject/preheader/html/text requirements',
    (_key, rendered) => {
      assertShellContract(rendered)
    },
  )
})

describe('welcome_paid', () => {
  it('renders the premium variant with the unlock list and price promise', () => {
    const rendered = renderWelcomePaid({ tier: 'premium' })
    expect(rendered.html).toContain(
      'Concert history — every show you attend, logged',
    )
    expect(rendered.html).toContain('Calendar export — Apple + Google, one tap')
    expect(rendered.html).toContain('Follow artists + new-show alerts')
    expect(rendered.html).toContain('Price-drop alerts + Spotify sync')
    expect(rendered.html).toContain(
      'Whatever you pay, you pay. We never raise it.',
    )
    expect(rendered.text).toContain(
      'Concert history — every show you attend, logged',
    )
  })

  it('renders the supporter variant with its two unlocks plus the badge', () => {
    const rendered = renderWelcomePaid({ tier: 'supporter' })
    expect(rendered.html).toContain('A Supporter badge on your profile')
    expect(rendered.html).toContain('Concert history')
    expect(rendered.html).toContain('Calendar export')
    // Premium-only unlocks must never appear on the Supporter welcome.
    expect(rendered.html).not.toContain('Spotify sync')
    expect(rendered.html).not.toContain('Price-drop alerts')
    expect(rendered.text).toContain('A Supporter badge on your profile')
  })

  it('renders the founder variant with the locked rate and premium unlocks', () => {
    const rendered = renderWelcomePaid({
      tier: 'founder',
      founderSeatNumber: 7,
    })
    expect(rendered.html).toContain('Founder badge — first 100 only')
    expect(rendered.html).toContain(
      'Concert history — every show you attend, logged',
    )
    expect(rendered.subject).toContain('Locked in at $3, forever')
  })

  it('renders the founder seat stamp when a seat number is present', () => {
    const rendered = renderWelcomePaid({
      tier: 'founder',
      founderSeatNumber: 7,
    })
    expect(rendered.html).toContain('#7')
    expect(rendered.html).toContain('of 100')
    expect(rendered.text).toContain('Founder #7 of 100')
  })

  it('falls back gracefully when the founder seat number is absent', () => {
    const rendered = renderWelcomePaid({ tier: 'founder' })
    expect(rendered.html).toContain('a Founder')
    expect(rendered.html).not.toContain('#undefined')
    expect(rendered.text).not.toContain('#undefined')
  })
})

describe('welcome_gifted', () => {
  it('frames comped access as lifetime, on-us Premium', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: null,
    })
    expect(rendered.html).toContain('Lifetime Premium')
    expect(rendered.text).toContain('Lifetime Premium, on us')
    expect(rendered.subject).toContain("Premium's on us")
  })

  it('lists the four core Premium unlocks', () => {
    const rendered = renderWelcomeGifted({ gifterName: null, giftEndsAt: null })
    expect(rendered.html).toContain(
      'Concert history — every show you attend, logged',
    )
    expect(rendered.html).toContain('Calendar export — Apple + Google, one tap')
  })

  it('uses a product footer with no billing links (comped — no billing relationship)', () => {
    const rendered = renderWelcomeGifted({ gifterName: null, giftEndsAt: null })
    expect(rendered.html).toContain('Turn off product emails')
    expect(rendered.html).not.toContain('manage subscription')
    expect(rendered.html).not.toContain('?section=plan')
  })

  it('points the CTA at the app', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: null,
    })
    expect(rendered.text).toContain("See everything you've got")
  })
})

describe('renewal_receipt_monthly', () => {
  it('renders the tax-record block with all rows', () => {
    const rendered = renderRenewalReceiptMonthly(RECEIPT_BASE)
    expect(rendered.html).toContain('Amount')
    expect(rendered.html).toContain('$5.00')
    expect(rendered.html).toContain('Charged')
    expect(rendered.html).toContain('Plan')
    expect(rendered.html).toContain('Premium · monthly')
    expect(rendered.html).toContain('Customer ID')
    expect(rendered.html).toContain('cus_test123')
    expect(rendered.html).toContain('View on Stripe →')
    expect(rendered.html).toContain('https://pay.stripe.com/receipts/abc123')
    expect(rendered.text).toContain('Amount: $5.00')
    expect(rendered.text).toContain('Customer ID: cus_test123')
  })

  it('formats the charge date in Denver time (UTC evening rolls back a day)', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      chargeDate: '2026-08-01T03:30:00Z',
    })
    expect(rendered.html).toContain('July 31, 2026')
    expect(rendered.text).toContain('July 31, 2026')
  })

  it('drops the receipt row and CTA when stripeReceiptUrl is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      stripeReceiptUrl: null,
    })
    expect(rendered.html).not.toContain('View on Stripe →')
    expect(rendered.html).not.toContain('View full receipt on Stripe →')
    expect(rendered.text).not.toContain('Full receipt on Stripe')
  })

  it('falls back to "See receipt" when amount is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      amount: null,
    })
    expect(rendered.html).toContain('See receipt')
    expect(rendered.text).toContain('Amount: See receipt')
  })

  it('shows the next-renewal row when periodEnd is present', () => {
    const rendered = renderRenewalReceiptMonthly(RECEIPT_BASE)
    expect(rendered.html).toContain('Next renewal')
    expect(rendered.html).toContain('July 15, 2026')
    expect(rendered.text).toContain('Next renewal: July 15, 2026')
  })

  it('omits the next-renewal row when periodEnd is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      periodEnd: null,
    })
    // The monthly preheader always reads "Next renewal soon" and the shell
    // embeds it as a hidden span, so strip that span before asserting the
    // *data row* is gone from the visible body.
    const body = rendered.html.replace(
      /<span style="display: none[\s\S]*?<\/span>/,
      '',
    )
    expect(body).not.toContain('Next renewal')
    expect(rendered.text).not.toContain('Next renewal')
  })

  it('renders the founder variant (title + price promise) when tier is founder', () => {
    const founder = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      tierName: 'Founder',
      tier: 'founder',
    })
    expect(founder.subject).toBe("Founder's paid up. $3, same as always.")
    // The title's apostrophe is HTML-escaped in the body, so assert on the
    // unescaped tail; the plain-text title is checked verbatim below.
    expect(founder.html).toContain('paid up. Same $3.')
    expect(founder.text).toContain("Founder's paid up. Same $3.")
    expect(founder.html).toContain('New folks may pay double someday')
    expect(founder.text).toContain(
      '$3 is $3. New folks may pay double someday. Never you.',
    )
  })

  it('omits the founder price promise when tier is absent', () => {
    const rendered = renderRenewalReceiptMonthly(RECEIPT_BASE)
    expect(rendered.html).not.toContain('New folks may pay double someday')
    expect(rendered.text).not.toContain('New folks may pay double someday')
  })
})

describe('renewal_receipt_annual', () => {
  it('renders the annual title, amount, and "two months on the house" note', () => {
    const rendered = renderRenewalReceiptAnnual(ANNUAL_BASE)
    expect(rendered.html).toContain('Another year of Premium. Locked in.')
    expect(rendered.html).toContain('$50.00')
    expect(rendered.html).toContain('Premium · annual')
    expect(rendered.html).toContain('Two months on the house')
    expect(rendered.text).toContain('Two months on the house')
  })

  it('uses the annual subject', () => {
    const rendered = renderRenewalReceiptAnnual(ANNUAL_BASE)
    expect(rendered.subject).toBe('Another year of Premium. Receipt inside.')
  })
})

describe('cancellation_ack', () => {
  it('states the access-until date', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: '2026-09-10T12:00:00Z',
    })
    expect(rendered.html).toContain('September 10, 2026')
    expect(rendered.text).toContain('Premium works until: September 10, 2026')
  })

  it('falls back to a neutral phrase when accessEndsAt is null', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: null,
    })
    expect(rendered.html).toContain('the end of your billing period')
    expect(rendered.html).not.toContain('null')
  })

  it('reassures that watched shows stay', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: '2026-09-10T12:00:00Z',
    })
    expect(rendered.text).toContain("Everything you're watching stays put.")
  })

  it('contains no win-back or discount language', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: '2026-09-10T12:00:00Z',
    })
    const winbackPattern = /discount|come back|miss you|resubscribe|% off/i
    expect(rendered.subject).not.toMatch(winbackPattern)
    expect(rendered.preheader).not.toMatch(winbackPattern)
    expect(rendered.html).not.toMatch(winbackPattern)
    expect(rendered.text).not.toMatch(winbackPattern)
  })
})

const NO_FRAUD = /fraud/i

describe('dunning_1_card_declined', () => {
  it('links the Stripe portal and keeps a calm tone', () => {
    const rendered = renderDunning1CardDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain(PORTAL_URL)
    expect(rendered.text).toContain(PORTAL_URL)
    expect(rendered.text).toContain('Update payment method:')
  })

  it('renders without leaking a null when tierName is null', () => {
    const rendered = renderDunning1CardDeclined({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
  })

  it('never uses the word "fraud"', () => {
    const rendered = renderDunning1CardDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.subject).not.toMatch(NO_FRAUD)
    expect(rendered.preheader).not.toMatch(NO_FRAUD)
    expect(rendered.html).not.toMatch(NO_FRAUD)
    expect(rendered.text).not.toMatch(NO_FRAUD)
  })
})

describe('dunning_2_still_declined', () => {
  it('carries the "still trying" copy and links the portal', () => {
    const rendered = renderDunning2StillDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    // HTML escapes the apostrophe; the plain-text part keeps it literal.
    expect(rendered.text).toContain("We're still trying that card.")
    expect(rendered.html).toContain('still trying that card.')
    expect(rendered.html).toContain(PORTAL_URL)
  })

  it('renders without leaking a null when tierName is null', () => {
    const rendered = renderDunning2StillDeclined({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
  })

  it('never uses the word "fraud"', () => {
    const rendered = renderDunning2StillDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.subject).not.toMatch(NO_FRAUD)
    expect(rendered.preheader).not.toMatch(NO_FRAUD)
    expect(rendered.html).not.toMatch(NO_FRAUD)
    expect(rendered.text).not.toMatch(NO_FRAUD)
  })
})

describe('dunning_3_final_warning', () => {
  it('carries the "pauses tomorrow" copy and the "if it pauses" callout', () => {
    const rendered = renderDunning3FinalWarning({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('Premium pauses tomorrow.')
    expect(rendered.text).toContain('Premium pauses tomorrow.')
    expect(rendered.html).toContain('If it pauses')
    expect(rendered.text).toContain('If it pauses')
    expect(rendered.html).toContain(PORTAL_URL)
  })

  it('renders without leaking a null when tierName is null', () => {
    const rendered = renderDunning3FinalWarning({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
  })

  it('never uses the word "fraud"', () => {
    const rendered = renderDunning3FinalWarning({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.subject).not.toMatch(NO_FRAUD)
    expect(rendered.preheader).not.toMatch(NO_FRAUD)
    expect(rendered.html).not.toMatch(NO_FRAUD)
    expect(rendered.text).not.toMatch(NO_FRAUD)
  })
})

describe('card_expiring_soon', () => {
  it('renders the days-remaining phrase and the plan CTA', () => {
    const rendered = renderCardExpiringSoon({
      tierName: 'Premium',
      daysRemaining: 14,
    })
    expect(rendered.html).toContain('in 14 days')
    expect(rendered.text).toContain('in 14 days')
    expect(rendered.html).toContain('/me?section=plan')
  })

  it('singularizes the timeframe when one day remains', () => {
    const rendered = renderCardExpiringSoon({
      tierName: 'Premium',
      daysRemaining: 1,
    })
    expect(rendered.html).toContain('in 1 day')
    expect(rendered.html).not.toContain('in 1 days')
  })

  it('falls back to a generic plan label when tierName is null', () => {
    const rendered = renderCardExpiringSoon({
      tierName: null,
      daysRemaining: 7,
    })
    expect(rendered.html).toContain('your plan')
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
  })

  it('renders the real card chip when card metadata is supplied', () => {
    const rendered = renderCardExpiringSoon({
      tierName: 'Premium',
      daysRemaining: 7,
      card: { brand: 'visa', last4: '4242', expMonth: 8, expYear: 2026 },
    })
    expect(rendered.html).toContain('Visa ·· 4242')
    expect(rendered.html).toContain('exp 08/26')
    expect(rendered.text).toContain('Card on file: Visa ·· 4242 · exp 08/26')
  })

  it('omits the card chip entirely when no card metadata is supplied', () => {
    const rendered = renderCardExpiringSoon({
      tierName: 'Premium',
      daysRemaining: 7,
    })
    expect(rendered.html).not.toContain('Card on file')
    expect(rendered.text).not.toContain('Card on file')
    expect(rendered.html).not.toContain('4242')
  })

  it('renders the tier badge when the paid tier is known', () => {
    const withTier = renderCardExpiringSoon({
      tierName: 'Founder',
      daysRemaining: 7,
      tier: 'founder',
    })
    const withoutTier = renderCardExpiringSoon({
      tierName: 'Founder',
      daysRemaining: 7,
    })
    // The founder gradient pill is unique to the tier badge atom, so its
    // presence isolates the badge from the plan-label copy.
    expect(withTier.html).toContain('linear-gradient(135deg, rgba(122,230,255')
    expect(withoutTier.html).not.toContain(
      'linear-gradient(135deg, rgba(122,230,255',
    )
  })
})

describe('gifting_ending_notice', () => {
  it('names the gifter and the end date', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: 'Sam',
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.html).toContain('Sam')
    expect(rendered.html).toContain('December 1, 2026')
    expect(rendered.text).toContain('December 1, 2026')
    expect(rendered.html).toContain('/me?section=plan')
  })

  it('falls back to a friendly label when gifterName is null', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: null,
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.html).toContain('A friend of the crawl')
    expect(rendered.text).toContain('A friend of the crawl')
  })

  it('collapses control chars in the gifter name (no injected newline in text)', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: 'Sam\nhttps://evil.example',
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.text).toContain('Sam https://evil.example')
    expect(rendered.text).not.toContain('Sam\nhttps://evil.example')
    expect(rendered.html).toContain('Sam https://evil.example')
  })

  it('escapes injected markup in the gifter name', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: '<b>Evil</b>',
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.html).toContain('&lt;b&gt;Evil&lt;/b&gt;')
    expect(rendered.html).not.toContain('<b>Evil</b>')
  })

  it('still names the gifter when the end date is unparseable', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: 'Sam',
      giftEndsAt: 'not-a-date',
    })
    expect(rendered.html).toContain('Sam')
    expect(rendered.html).not.toContain('Invalid Date')
  })
})

describe('winback', () => {
  it('carries no discount / coupon / percent-off offer', () => {
    const rendered = renderWinback({ tierName: 'Premium' })
    const offerPattern = /discount|% off|coupon|\d+% /i
    // The winback reassurance copy deliberately says "no discount gimmick";
    // strip that negation so the ban targets an *actual* offer, not the promise
    // that there isn't one. Also strip the shell's <style> media query, which
    // legitimately contains `width: 100% !important`.
    const htmlCopy = rendered.html
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/no discount gimmick/gi, '')
    const textCopy = rendered.text.replace(/no discount gimmick/gi, '')
    expect(rendered.subject).not.toMatch(offerPattern)
    expect(rendered.preheader).not.toMatch(offerPattern)
    expect(htmlCopy).not.toMatch(offerPattern)
    expect(textCopy).not.toMatch(offerPattern)
  })

  it('has exactly one CTA link in the body', () => {
    const rendered = renderWinback({ tierName: 'Premium' })
    // Body links point at the plan page; the shell footer's unsubscribe links
    // go to /me and the product footer omits the manage link, so counting
    // plan-page anchors isolates the single body CTA.
    const planLinkCount = (
      rendered.html.match(/href="[^"]*\/me\?section=plan"/g) ?? []
    ).length
    expect(planLinkCount).toBe(1)
  })

  it('renders the Premium name without leaking a null when tierName is null', () => {
    const rendered = renderWinback({ tierName: null })
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
    expect(rendered.html).toContain('Premium')
  })
})

describe('registry', () => {
  it('returns a renderer for each of the eleven shipped templates', () => {
    expect(getTemplateRenderer('welcome_paid')).toBeTypeOf('function')
    expect(getTemplateRenderer('welcome_gifted')).toBeTypeOf('function')
    expect(getTemplateRenderer('renewal_receipt_monthly')).toBeTypeOf(
      'function',
    )
    expect(getTemplateRenderer('renewal_receipt_annual')).toBeTypeOf('function')
    expect(getTemplateRenderer('cancellation_ack')).toBeTypeOf('function')
    expect(getTemplateRenderer('dunning_1_card_declined')).toBeTypeOf(
      'function',
    )
    expect(getTemplateRenderer('dunning_2_still_declined')).toBeTypeOf(
      'function',
    )
    expect(getTemplateRenderer('dunning_3_final_warning')).toBeTypeOf(
      'function',
    )
    expect(getTemplateRenderer('card_expiring_soon')).toBeTypeOf('function')
    expect(getTemplateRenderer('gifting_ending_notice')).toBeTypeOf('function')
    expect(getTemplateRenderer('winback')).toBeTypeOf('function')
    expect(getTemplateRenderer('spotify_digest')).toBeTypeOf('function')
  })
})

describe('spotify_digest (#763 §8.2)', () => {
  it('features at most 5 shows and collapses the rest into "+N more"', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(7),
      tastePicks: [],
      unsubscribeUrl: null,
    })
    expect(rendered.subject).toContain('7 shows')
    expect(rendered.html).toContain('Artist 5')
    expect(rendered.html).not.toContain('Artist 6')
    expect(rendered.html).toContain('+2 more this week')
    expect(rendered.text).toContain('+2 more this week')
  })

  it('omits the "+N more" link when 5 or fewer shows match', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(3),
      tastePicks: [],
      unsubscribeUrl: null,
    })
    expect(rendered.html).not.toContain('more this week')
    expect(rendered.text).not.toContain('more this week')
  })

  it('uses singular copy for a one-show week', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(1),
      tastePicks: [],
      unsubscribeUrl: null,
    })
    expect(rendered.subject).toContain('1 show this week')
    expect(rendered.html).toContain('1 show')
  })

  it('renders the zero-week light variant with up to 2 taste picks', () => {
    const rendered = renderSpotifyDigest({
      shows: [],
      tastePicks: digestShows(3),
      unsubscribeUrl: null,
    })
    expect(rendered.html).toContain('A quiet one for your artists.')
    expect(rendered.html).toContain('Based on your taste')
    expect(rendered.html).toContain('Artist 2')
    expect(rendered.html).not.toContain('Artist 3')
  })

  it('links the digest-family footer to the signed unsubscribe URL', () => {
    const unsubscribeUrl =
      'https://api.example.com/v1/email/unsubscribe?uid=u1&family=digest&token=abc'
    const rendered = renderSpotifyDigest({
      shows: digestShows(2),
      tastePicks: [],
      unsubscribeUrl,
    })
    expect(rendered.html).toContain('Turn off the weekly digest')
    expect(rendered.html).toContain(
      'https://api.example.com/v1/email/unsubscribe?uid=u1&amp;family=digest&amp;token=abc',
    )
    expect(rendered.text).toContain(
      `Turn off the weekly digest:  ${unsubscribeUrl}`,
    )
  })

  it('falls back to the Settings link when no unsubscribe URL is available', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(2),
      tastePicks: [],
      unsubscribeUrl: null,
    })
    expect(rendered.html).toContain('Turn off the weekly digest')
    expect(rendered.html).toContain('/me')
  })

  it('escapes artist-controlled strings', () => {
    const rendered = renderSpotifyDigest({
      shows: [
        {
          ...DIGEST_SHOW,
          artist: '<script>alert(1)</script>',
          tourName: 'Tour & <b>Bold</b>',
        },
      ],
      tastePicks: [],
      unsubscribeUrl: null,
    })
    expect(rendered.html).not.toContain('<script>alert(1)</script>')
    expect(rendered.html).toContain('&lt;script&gt;')
  })
})
