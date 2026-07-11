import { describe, it, expect } from 'vitest'
import {
  PROVISION_PRICES,
  assertKeyMatchesMode,
  parseMode,
  planPriceAction,
  type ProvisionPriceSpec,
} from './stripe-provision-helpers.js'

const SUPPORTER: ProvisionPriceSpec = {
  lookupKey: 'supporter_monthly',
  productName: 'Concert Crawl Supporter',
  unitAmountCents: 200,
  interval: 'month',
  currency: 'usd',
}

describe('PROVISION_PRICES', () => {
  it('carries the #781 locked pricing table', () => {
    expect(
      PROVISION_PRICES.map((price) => [
        price.lookupKey,
        price.unitAmountCents,
        price.interval,
        price.currency,
      ]),
    ).toEqual([
      ['supporter_monthly', 200, 'month', 'usd'],
      ['premium_monthly', 500, 'month', 'usd'],
      ['founder_monthly', 300, 'month', 'usd'],
    ])
  })
})

describe('parseMode', () => {
  it('parses --mode test and --mode live (space form)', () => {
    expect(parseMode(['node', 'script.ts', '--mode', 'test'])).toBe('test')
    expect(parseMode(['node', 'script.ts', '--mode', 'live'])).toBe('live')
  })

  it('parses --mode=test (equals form)', () => {
    expect(parseMode(['--mode=test'])).toBe('test')
    expect(parseMode(['--mode=live'])).toBe('live')
  })

  it('throws when --mode is absent', () => {
    expect(() => parseMode(['--commit'])).toThrow(/--mode/)
  })

  it('throws on an invalid mode value', () => {
    expect(() => parseMode(['--mode', 'prod'])).toThrow(/--mode/)
    expect(() => parseMode(['--mode='])).toThrow(/--mode/)
    expect(() => parseMode(['--mode'])).toThrow(/--mode/)
  })
})

describe('assertKeyMatchesMode', () => {
  it('accepts sk_test_ keys in test mode', () => {
    expect(() => assertKeyMatchesMode('sk_test_abc', 'test')).not.toThrow()
  })

  it('accepts sk_live_ keys in live mode', () => {
    expect(() => assertKeyMatchesMode('sk_live_abc', 'live')).not.toThrow()
  })

  it('rejects a live key under --mode test', () => {
    expect(() => assertKeyMatchesMode('sk_live_abc', 'test')).toThrow(
      /sk_test_/,
    )
  })

  it('rejects a test key under --mode live', () => {
    expect(() => assertKeyMatchesMode('sk_test_abc', 'live')).toThrow(
      /sk_live_/,
    )
  })

  it('rejects an empty key', () => {
    expect(() => assertKeyMatchesMode('', 'test')).toThrow(/STRIPE_SECRET_KEY/)
  })
})

describe('planPriceAction', () => {
  it('returns create when no price exists for the lookup key', () => {
    expect(planPriceAction(null, SUPPORTER)).toEqual({ action: 'create' })
  })

  it('returns noop when the existing price matches amount + interval + currency', () => {
    expect(
      planPriceAction(
        { id: 'price_1', unitAmount: 200, interval: 'month', currency: 'usd' },
        SUPPORTER,
      ),
    ).toEqual({ action: 'noop', priceId: 'price_1' })
  })

  it('returns mismatch on a different amount (prices are immutable)', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 250, interval: 'month', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
    if (result.action === 'mismatch') {
      expect(result.detail).toContain('unit_amount')
    }
  })

  it('returns mismatch on a different interval', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 200, interval: 'year', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })

  it('returns mismatch on a different currency', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: 200, interval: 'month', currency: 'eur' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })

  it('returns mismatch when unitAmount is null', () => {
    const result = planPriceAction(
      { id: 'price_1', unitAmount: null, interval: 'month', currency: 'usd' },
      SUPPORTER,
    )
    expect(result.action).toBe('mismatch')
  })
})
