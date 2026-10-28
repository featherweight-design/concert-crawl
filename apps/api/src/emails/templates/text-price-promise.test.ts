import { describe, expect, it, vi } from 'vitest'

// Swap the promise for a per-tier sentinel: a text array that hand-copies the
// line would keep printing the old words, which is how the two drifted (#1394).
vi.mock('../palette.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../palette.js')>()
  return {
    ...actual,
    PRICE_PROMISE: {
      premium: 'SENTINEL premium promise',
      supporter: 'SENTINEL supporter promise',
      founder: 'SENTINEL founder promise',
    },
  }
})

const { renderWelcomePaid } = await import('./welcome-paid.js')
const { renderRenewalReceiptMonthly } =
  await import('./renewal-receipt-monthly.js')

describe('plain-text price promise follows PRICE_PROMISE', () => {
  it.each(['premium', 'supporter', 'founder'] as const)(
    'in the %s welcome',
    (tier) => {
      expect(renderWelcomePaid({ tier }).text).toContain(
        `SENTINEL ${tier} promise`,
      )
    },
  )

  it('in the founder monthly receipt', () => {
    const { text } = renderRenewalReceiptMonthly({
      periodLabel: 'June 2026',
      amount: '$3.00',
      tierName: 'Founder',
      tier: 'founder',
      periodEnd: '2026-07-15T12:00:00Z',
      chargeDate: '2026-06-15T12:00:00Z',
      customerId: 'cus_test123',
      stripeReceiptUrl: null,
    })
    expect(text).toContain('SENTINEL founder promise')
  })
})
