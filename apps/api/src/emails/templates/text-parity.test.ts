import { describe, expect, it } from 'vitest'

import { buildTestEmail } from '../test-fixtures.js'
import type { TestEmailKey } from '../test-fixtures.js'

const RULE = '----------------------------------------'

// The footer note each template passes to the HTML footerRow. Plain-text
// readers used to lose all but the digest's (#1386).
const FOOTER_NOTES: ReadonlyArray<[TestEmailKey, string]> = [
  [
    'cancellation_ack',
    "If this cancel was a surprise, reply to this email and we'll sort it out.",
  ],
  ['card_expiring_soon', "Already updated it? You're set. Ignore this one."],
  [
    'dunning_1_card_declined',
    'Already fixed it? Ignore this. The next retry will pick it up automatically.',
  ],
  [
    'renewal_receipt_monthly',
    'Questions about a charge? Reply to this email. A human reads it.',
  ],
  [
    'spotify_digest',
    'You get this because you follow artists and turned on the weekly digest.',
  ],
]

describe('plain-text emails match their HTML', () => {
  it.each(FOOTER_NOTES)(
    '%s carries its footer note above the footer rule, once',
    (key, note) => {
      const { html, text } = buildTestEmail(key)
      expect(html).toContain(note.replace(/'/g, '&#39;'))
      expect(text.split(note)).toHaveLength(2)
      expect(text.indexOf(note)).toBeLessThan(text.indexOf(RULE))
    },
  )

  it('lists receipt rows in the HTML order, Plan first (#1394)', () => {
    const { text } = buildTestEmail('renewal_receipt_monthly')
    const order = ['Plan:', 'Amount:', 'Charged:', 'Customer ID:'].map(
      (label) => text.indexOf(label),
    )
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((left, right) => left - right)).toEqual(order)
  })
})
