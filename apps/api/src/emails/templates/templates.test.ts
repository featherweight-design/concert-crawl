import { describe, expect, it } from 'vitest'

import { getTemplateRenderer } from '../registry.js'
import type { RenderedEmail } from '../types.js'
import { renderCancellationAck } from './cancellation-ack.js'
import { renderCardExpiringSoon } from './card-expiring-soon.js'
import { renderDunning1CardDeclined } from './dunning-1-card-declined.js'
import { renderDunning2StillDeclined } from './dunning-2-still-declined.js'
import { renderDunning3FinalWarning } from './dunning-3-final-warning.js'
import { renderGiftingEndingNotice } from './gifting-ending-notice.js'
import { renderRenewalReceiptMonthly } from './renewal-receipt-monthly.js'
import { renderWelcomeGifted } from './welcome-gifted.js'
import { renderWelcomePaid } from './welcome-paid.js'
import { renderWinback } from './winback.js'

const PORTAL_URL = 'https://billing.stripe.com/p/session/test_abc123'

const RECEIPT_BASE = {
  periodLabel: 'June 2026',
  amount: '$5.00',
  tierName: 'Premium (monthly)',
  periodEnd: '2026-07-15T12:00:00Z',
  chargeDate: '2026-06-15T12:00:00Z',
  customerId: 'cus_test123',
  stripeReceiptUrl: 'https://pay.stripe.com/receipts/abc123',
}

const assertShellContract = (rendered: RenderedEmail): void => {
  expect(rendered.subject.length).toBeGreaterThanOrEqual(35)
  expect(rendered.subject.length).toBeLessThanOrEqual(50)
  expect(rendered.preheader.length).toBeGreaterThanOrEqual(50)
  expect(rendered.preheader.length).toBeLessThanOrEqual(100)
  expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(rendered.subject).not.toMatch(/\[concert crawl\]/i)
  expect(rendered.html).toContain('<!doctype html>')
  expect(rendered.html).toContain('Manage emails')
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
      'dunning_1_card_declined (null tier)',
      renderDunning1CardDeclined({ tierName: null, portalUrl: PORTAL_URL }),
    ],
    [
      'dunning_2_still_declined',
      renderDunning2StillDeclined({
        tierName: 'Premium',
        portalUrl: PORTAL_URL,
      }),
    ],
    [
      'dunning_2_still_declined (null tier)',
      renderDunning2StillDeclined({ tierName: null, portalUrl: PORTAL_URL }),
    ],
    [
      'dunning_3_final_warning',
      renderDunning3FinalWarning({
        tierName: 'Premium',
        portalUrl: PORTAL_URL,
      }),
    ],
    [
      'dunning_3_final_warning (null tier)',
      renderDunning3FinalWarning({ tierName: null, portalUrl: PORTAL_URL }),
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
  ]

  it.each(renderedEmails)(
    '%s meets subject/preheader/html/text requirements',
    (_key, rendered) => {
      assertShellContract(rendered)
    },
  )
})

describe('welcome_paid', () => {
  it('renders the premium variant with price and unlock list', () => {
    const rendered = renderWelcomePaid({ tier: 'premium' })
    expect(rendered.html).toContain('Premium — $5/month')
    expect(rendered.html).toContain('Concert history — shows you attended')
    expect(rendered.html).toContain('Calendar export — Apple + Google')
    expect(rendered.html).toContain('Follow artists + new-show alerts')
    expect(rendered.html).toContain('Price-drop alerts + Spotify sync')
    expect(rendered.text).toContain('Premium — $5/month')
    expect(rendered.text).toContain('Concert history — shows you attended')
  })

  it('renders the supporter variant owning the no-unlocks joke', () => {
    const rendered = renderWelcomePaid({ tier: 'supporter' })
    expect(rendered.html).toContain('Supporter — $2/month')
    expect(rendered.html).toContain('Everything in Free')
    expect(rendered.html).toContain('Supporter badge on your profile')
    expect(rendered.html).toContain('The warm, smug glow of keeping us alive')
    expect(rendered.html).not.toContain('Concert history')
    expect(rendered.text).toContain('Supporter — $2/month')
  })

  it('renders the founder variant with locked rate and premium unlocks', () => {
    const rendered = renderWelcomePaid({
      tier: 'founder',
      founderSeatNumber: 7,
    })
    expect(rendered.html).toContain('Founder — $3/month, forever')
    expect(rendered.html).toContain('Concert history — shows you attended')
    expect(rendered.html).toContain('Founder badge — first 100 only')
    expect(rendered.text).toContain('Founder — $3/month, forever')
  })

  it('renders the founder seat badge when a seat number is present', () => {
    const rendered = renderWelcomePaid({
      tier: 'founder',
      founderSeatNumber: 7,
    })
    expect(rendered.html).toContain('Founder #7 of 100')
    expect(rendered.text).toContain('Founder #7 of 100')
  })

  it('falls back gracefully when the founder seat number is absent', () => {
    const rendered = renderWelcomePaid({ tier: 'founder' })
    expect(rendered.html).toContain('Founder — one of the first 100')
    expect(rendered.html).not.toContain('#undefined')
    expect(rendered.text).not.toContain('#undefined')
  })
})

describe('welcome_gifted', () => {
  it('names the gifter and escapes injected markup in html', () => {
    const rendered = renderWelcomeGifted({
      gifterName: '<b>Evil</b>',
      giftEndsAt: null,
    })
    expect(rendered.html).toContain('&lt;b&gt;Evil&lt;/b&gt;')
    expect(rendered.html).not.toContain('<b>Evil</b>')
  })

  it('collapses newlines and control chars in gifterName for both renderings', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam\nVisit https://evil.example\r\nnow',
      giftEndsAt: null,
    })
    expect(rendered.text).toContain(
      "You've got Premium, from Sam Visit https://evil.example now",
    )
    expect(rendered.html).toContain('from Sam Visit https://evil.example now')
  })

  it('falls back when gifterName is only control characters', () => {
    const rendered = renderWelcomeGifted({
      gifterName: '\n\t ',
      giftEndsAt: null,
    })
    expect(rendered.text).toContain('a friend of the crawl')
  })

  it('falls back when gifterName is null', () => {
    const rendered = renderWelcomeGifted({ gifterName: null, giftEndsAt: null })
    expect(rendered.html).toContain('a friend of the crawl')
    expect(rendered.text).toContain('a friend of the crawl')
  })

  it('states the gift end date in Denver time when present', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.html).toContain('Your gift runs through December 1, 2026.')
    expect(rendered.text).toContain('Your gift runs through December 1, 2026.')
  })

  it('omits the date sentence when giftEndsAt is null', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: null,
    })
    expect(rendered.html).not.toContain('Your gift runs through')
    expect(rendered.text).not.toContain('Your gift runs through')
  })

  it('omits the date sentence when giftEndsAt is an invalid ISO string', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: 'not-a-date',
    })
    expect(rendered.html).not.toContain('Your gift runs through')
    expect(rendered.html).not.toContain('Invalid Date')
  })

  it('includes the soft add-a-card CTA pointing at the plan page', () => {
    const rendered = renderWelcomeGifted({
      gifterName: 'Sam',
      giftEndsAt: null,
    })
    expect(rendered.html).toContain('Add a card for when this wraps')
    expect(rendered.html).toContain('/settings/plan')
    expect(rendered.text).toContain('/settings/plan')
  })
})

describe('renewal_receipt_monthly', () => {
  it('renders the tax-record block with all rows', () => {
    const rendered = renderRenewalReceiptMonthly(RECEIPT_BASE)
    expect(rendered.html).toContain('Amount')
    expect(rendered.html).toContain('$5.00')
    expect(rendered.html).toContain('Charge date')
    expect(rendered.html).toContain('Plan')
    expect(rendered.html).toContain('Premium (monthly)')
    expect(rendered.html).toContain('Customer ID')
    expect(rendered.html).toContain('cus_test123')
    expect(rendered.html).toContain('View Stripe receipt')
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

  it('keeps the Receipt row with fallback copy when stripeReceiptUrl is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      stripeReceiptUrl: null,
    })
    expect(rendered.html).not.toContain('View Stripe receipt')
    expect(rendered.html).toContain('Not available for this charge')
    expect(rendered.text).not.toContain('View Stripe receipt')
    expect(rendered.text).toContain('Receipt: Not available for this charge')
  })

  it('falls back to "See Stripe receipt" when amount is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      amount: null,
    })
    expect(rendered.html).toContain('See Stripe receipt')
    expect(rendered.text).toContain('Amount: See Stripe receipt')
  })

  it('renders the locked-in line when periodEnd is present', () => {
    const rendered = renderRenewalReceiptMonthly(RECEIPT_BASE)
    expect(rendered.html).toContain('You&#39;re locked in until July 15, 2026!')
    expect(rendered.text).toContain("You're locked in until July 15, 2026!")
  })

  it('omits the locked-in line when periodEnd is null', () => {
    const rendered = renderRenewalReceiptMonthly({
      ...RECEIPT_BASE,
      periodEnd: null,
    })
    expect(rendered.html).not.toContain('locked in until')
    expect(rendered.text).not.toContain('locked in until')
  })
})

describe('cancellation_ack', () => {
  it('confirms access until the end date', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: '2026-09-10T12:00:00Z',
    })
    expect(rendered.html).toContain(
      'Premium access continues until September 10, 2026',
    )
    expect(rendered.text).toContain(
      'Premium access continues until September 10, 2026',
    )
  })

  it('falls back to period-end wording when accessEndsAt is null', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: null,
    })
    expect(rendered.html).toContain(
      'until the end of your current billing period',
    )
  })

  it('includes the 90-day data-retention note', () => {
    const rendered = renderCancellationAck({
      tierName: 'Premium',
      accessEndsAt: '2026-09-10T12:00:00Z',
    })
    expect(rendered.html).toContain('Premium data sticks around for 90 days')
    expect(rendered.text).toContain('sticks around for 90 days')
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
  it('references the 7-day window and links the Stripe portal', () => {
    const rendered = renderDunning1CardDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('7 days')
    expect(rendered.html).toContain(PORTAL_URL)
    expect(rendered.text).toContain('7 days')
    expect(rendered.text).toContain(PORTAL_URL)
    expect(rendered.html).toContain('Premium')
  })

  it('falls back to a generic plan label when tierName is null', () => {
    const rendered = renderDunning1CardDeclined({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('your plan')
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
  it('carries the locked "we\'re still trying" phrase', () => {
    const rendered = renderDunning2StillDeclined({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    // HTML escapes the apostrophe; the plain-text part keeps it literal.
    expect(rendered.text).toContain(
      "Heads up — we're still trying to get this through.",
    )
    expect(rendered.html).toContain(
      'Heads up — we&#39;re still trying to get this through.',
    )
    expect(rendered.html).toContain(PORTAL_URL)
  })

  it('falls back to a generic plan label when tierName is null', () => {
    const rendered = renderDunning2StillDeclined({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('your plan')
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
  it('carries the "pauses tomorrow" copy shape with the tier name', () => {
    const rendered = renderDunning3FinalWarning({
      tierName: 'Premium',
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('pauses tomorrow')
    expect(rendered.text).toContain('pauses tomorrow')
    // HTML escapes both apostrophes; the plain-text part keeps them literal.
    expect(rendered.text).toContain(
      "Your card hasn't cleared — Premium pauses tomorrow if we can't get a fresh one.",
    )
    expect(rendered.html).toContain(
      'Your card hasn&#39;t cleared — Premium pauses tomorrow if we can&#39;t get a fresh one.',
    )
    expect(rendered.html).toContain(PORTAL_URL)
  })

  it('still says "pauses tomorrow" with a generic label when tierName is null', () => {
    const rendered = renderDunning3FinalWarning({
      tierName: null,
      portalUrl: PORTAL_URL,
    })
    expect(rendered.html).toContain('your plan pauses tomorrow')
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
  it('renders the days-remaining number in the body', () => {
    const rendered = renderCardExpiringSoon({
      tierName: 'Premium',
      daysRemaining: 14,
    })
    expect(rendered.html).toContain('in 14 days')
    expect(rendered.text).toContain('in 14 days')
    expect(rendered.html).toContain('/settings/plan')
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
    expect(rendered.html).toContain('/settings/plan')
  })

  it('falls back to a friendly label when gifterName is null', () => {
    const rendered = renderGiftingEndingNotice({
      gifterName: null,
      giftEndsAt: '2026-12-01T12:00:00Z',
    })
    expect(rendered.html).toContain('a friend of the crawl')
    expect(rendered.text).toContain('a friend of the crawl')
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
    // Strip the shell's <style> media query (which legitimately contains
    // `width: 100% !important`) so the ban targets template copy, not chrome.
    const htmlCopy = rendered.html.replace(/<style>[\s\S]*?<\/style>/g, '')
    expect(rendered.subject).not.toMatch(offerPattern)
    expect(rendered.preheader).not.toMatch(offerPattern)
    expect(htmlCopy).not.toMatch(offerPattern)
    expect(rendered.text).not.toMatch(offerPattern)
  })

  it('has exactly one CTA link in the body', () => {
    const rendered = renderWinback({ tierName: 'Premium' })
    // Body links point at the plan page; the shell footer's lone "manage
    // emails" link goes to /settings/notifications, so counting plan-page
    // anchors isolates the single body CTA.
    const planLinkCount = (
      rendered.html.match(/href="[^"]*\/settings\/plan"/g) ?? []
    ).length
    expect(planLinkCount).toBe(1)
  })

  it('falls back to a generic tier label when tierName is null', () => {
    const rendered = renderWinback({ tierName: null })
    expect(rendered.html).not.toContain('null')
    expect(rendered.text).not.toContain('null')
    expect(rendered.html).toContain('Premium')
  })
})

describe('registry', () => {
  it('returns a renderer for each of the ten shipped templates', () => {
    expect(getTemplateRenderer('welcome_paid')).toBeTypeOf('function')
    expect(getTemplateRenderer('welcome_gifted')).toBeTypeOf('function')
    expect(getTemplateRenderer('renewal_receipt_monthly')).toBeTypeOf(
      'function',
    )
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
  })
})
