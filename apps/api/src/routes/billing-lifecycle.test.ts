import { describe, it, expect } from 'vitest'
import {
  evaluateTierChange,
  resolveChangeDirection,
  summarizeProrationPreview,
  PRORATION_BEHAVIOR,
} from './billing-lifecycle.js'

describe('resolveChangeDirection', () => {
  it('treats supporter → premium as an upgrade', () => {
    expect(resolveChangeDirection('supporter', 'premium')).toBe('upgrade')
  })

  it('treats premium → supporter as a downgrade', () => {
    expect(resolveChangeDirection('premium', 'supporter')).toBe('downgrade')
  })

  it('treats founder → supporter as a downgrade ($3 → $2)', () => {
    expect(resolveChangeDirection('founder', 'supporter')).toBe('downgrade')
  })

  it('treats founder → premium as an upgrade ($3 → $5)', () => {
    expect(resolveChangeDirection('founder', 'premium')).toBe('upgrade')
  })
})

describe('PRORATION_BEHAVIOR', () => {
  it('upgrades invoice immediately; downgrades credit the balance (Decision 8)', () => {
    expect(PRORATION_BEHAVIOR.upgrade).toBe('always_invoice')
    expect(PRORATION_BEHAVIOR.downgrade).toBe('create_prorations')
  })
})

describe('evaluateTierChange', () => {
  it('plans a supporter → premium upgrade', () => {
    expect(evaluateTierChange('supporter', 'premium')).toEqual({
      ok: true,
      plan: {
        fromTier: 'supporter',
        toTier: 'premium',
        direction: 'upgrade',
        prorationBehavior: 'always_invoice',
      },
    })
  })

  it('plans a premium → supporter downgrade', () => {
    expect(evaluateTierChange('premium', 'supporter')).toEqual({
      ok: true,
      plan: {
        fromTier: 'premium',
        toTier: 'supporter',
        direction: 'downgrade',
        prorationBehavior: 'create_prorations',
      },
    })
  })

  it('rejects founder as a target (claim-only)', () => {
    const result = evaluateTierChange('premium', 'founder')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(409)
      expect(result.code).toBe('founder_not_switchable')
    }
  })

  it('plans a founder → supporter downgrade (#780 decision 6 retention path)', () => {
    expect(evaluateTierChange('founder', 'supporter')).toEqual({
      ok: true,
      plan: {
        fromTier: 'founder',
        toTier: 'supporter',
        direction: 'downgrade',
        prorationBehavior: 'create_prorations',
      },
    })
  })

  it('plans a founder → premium upgrade', () => {
    expect(evaluateTierChange('founder', 'premium')).toEqual({
      ok: true,
      plan: {
        fromTier: 'founder',
        toTier: 'premium',
        direction: 'upgrade',
        prorationBehavior: 'always_invoice',
      },
    })
  })

  it('rejects a same-tier no-op', () => {
    const result = evaluateTierChange('premium', 'premium')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(409)
      expect(result.code).toBe('tier_unchanged')
    }
  })

  it('rejects an inconsistent free-tier live row', () => {
    const result = evaluateTierChange('free', 'premium')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('tier_not_switchable')
    }
  })
})

describe('summarizeProrationPreview', () => {
  it('flattens amount due, credit lines, currency and period end', () => {
    const summary = summarizeProrationPreview({
      amount_due: 250,
      currency: 'usd',
      period_end: 1_780_000_000,
      lines: { data: [{ amount: -150 }, { amount: -50 }, { amount: 450 }] },
    })
    expect(summary).toEqual({
      amountDueCents: 250,
      creditCents: 200,
      currency: 'usd',
      periodEnd: new Date(1_780_000_000 * 1000).toISOString(),
    })
  })

  it('clamps a negative amount_due to zero (pure-credit preview)', () => {
    const summary = summarizeProrationPreview({
      amount_due: -300,
      currency: 'usd',
      lines: { data: [{ amount: -300 }] },
    })
    expect(summary?.amountDueCents).toBe(0)
    expect(summary?.creditCents).toBe(300)
  })

  it('handles missing lines and period_end (no credit, null periodEnd)', () => {
    const summary = summarizeProrationPreview({
      amount_due: 500,
      currency: 'usd',
    })
    expect(summary).toEqual({
      amountDueCents: 500,
      creditCents: 0,
      currency: 'usd',
      periodEnd: null,
    })
  })

  it('returns null for a payload that fails validation', () => {
    expect(summarizeProrationPreview(null)).toBeNull()
    expect(summarizeProrationPreview({ currency: 'usd' })).toBeNull()
    expect(
      summarizeProrationPreview({
        amount_due: 'not-a-number',
        currency: 'usd',
      }),
    ).toBeNull()
  })
})
