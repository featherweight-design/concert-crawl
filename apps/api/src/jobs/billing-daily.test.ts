// Unit tests for the daily billing job's decidable logic (§5.1). These cover
// the pure helpers — window selection, gift branch, winback gating, purge
// guard, clock-start decision, dedupe-key construction — without touching the
// DB. Idempotency of the pure guards is asserted here (running a guard twice
// with the same inputs is stable).
//
// NOT covered here: the DB-touching orchestration inside the run* functions
// (queries, event-existence checks, upserts). There is no billing-daily
// integration test yet — the run-level double-send/double-write idempotency
// rests on the email dedupe keys + subscription_events existence checks, which
// are exercised indirectly by the email pipeline's own tests but not by a
// dedicated harness for this job. Follow-up: #914.

import { describe, it, expect } from 'vitest'
import {
  cancellationStartsPurgeClock,
  cardExpiryDedupeKey,
  cardExpiryInstant,
  daysUntilCardExpiry,
  isGiftEndingSoon,
  isGiftExpired,
  isPurgeEligible,
  isWinbackDue,
  selectCardExpiryWindow,
  winbackDedupeKey,
} from './billing-daily.js'

const DAY_MS = 24 * 60 * 60 * 1000
const daysFromNow = (now: Date, days: number): Date =>
  new Date(now.getTime() + days * DAY_MS)

describe('cardExpiryInstant', () => {
  it('treats a card as valid through the end of its exp month', () => {
    // 06/2026 → expires at the start of 2026-07 (valid through Jun 30).
    expect(cardExpiryInstant(6, 2026).toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    )
  })

  it('rolls a December card into the next year', () => {
    expect(cardExpiryInstant(12, 2026).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })
})

describe('daysUntilCardExpiry', () => {
  it('floors partial days (never rounds up into an unreached window)', () => {
    const now = new Date('2026-06-24T12:00:00.000Z')
    // Expiry instant 2026-07-01T00:00:00Z is 6.5 days out → floors to 6.
    expect(daysUntilCardExpiry(6, 2026, now)).toBe(6)
  })

  it('is negative once the card has lapsed', () => {
    const now = new Date('2026-07-15T00:00:00.000Z')
    expect(daysUntilCardExpiry(6, 2026, now)).toBeLessThan(0)
  })
})

describe('selectCardExpiryWindow (30/14/7 boundaries)', () => {
  it.each([
    [31, null],
    [30, 30],
    [15, 30],
    [14, 14],
    [8, 14],
    [7, 7],
    [1, 7],
    [0, null],
    [-1, null],
  ] as const)('daysRemaining %i → window %s', (days, window) => {
    expect(selectCardExpiryWindow(days)).toBe(window)
  })

  it('picks the tightest band a card sits inside', () => {
    // A card 10 days out is inside the 14 band, not the 30 band.
    expect(selectCardExpiryWindow(10)).toBe(14)
    // A card 6 days out is inside the 7 band.
    expect(selectCardExpiryWindow(6)).toBe(7)
  })
})

describe('cardExpiryDedupeKey (CE-6 format)', () => {
  it('is {fingerprint}:{expMonth}-{expYear}:{window}', () => {
    expect(
      cardExpiryDedupeKey({
        cardFingerprint: 'fp_abc',
        expMonth: 6,
        expYear: 2026,
        window: 14,
      }),
    ).toBe('fp_abc:6-2026:14')
  })

  it('differs per window so each of the 30/14/7 sends is distinct', () => {
    const base = { cardFingerprint: 'fp_x', expMonth: 3, expYear: 2027 }
    const keys = new Set([
      cardExpiryDedupeKey({ ...base, window: 30 }),
      cardExpiryDedupeKey({ ...base, window: 14 }),
      cardExpiryDedupeKey({ ...base, window: 7 }),
    ])
    expect(keys.size).toBe(3)
  })
})

describe('isGiftEndingSoon vs isGiftExpired (gift branch)', () => {
  const now = new Date('2026-07-11T00:00:00.000Z')

  it('lifetime gift (null expiry) is neither ending-soon nor expired', () => {
    expect(isGiftEndingSoon(null, now)).toBe(false)
    expect(isGiftExpired(null, now)).toBe(false)
  })

  it('gift within 7 days is ending-soon, not expired', () => {
    const endsIn5 = daysFromNow(now, 5)
    expect(isGiftEndingSoon(endsIn5, now)).toBe(true)
    expect(isGiftExpired(endsIn5, now)).toBe(false)
  })

  it('gift exactly 7 days out is ending-soon', () => {
    const endsIn7 = daysFromNow(now, 7)
    expect(isGiftEndingSoon(endsIn7, now)).toBe(true)
  })

  it('gift more than 7 days out is neither', () => {
    const endsIn8 = daysFromNow(now, 8)
    expect(isGiftEndingSoon(endsIn8, now)).toBe(false)
    expect(isGiftExpired(endsIn8, now)).toBe(false)
  })

  it('gift past its end is expired (revoke branch), not ending-soon', () => {
    const endedYesterday = daysFromNow(now, -1)
    expect(isGiftExpired(endedYesterday, now)).toBe(true)
    expect(isGiftEndingSoon(endedYesterday, now)).toBe(false)
  })

  it('gift expiring exactly now is expired', () => {
    expect(isGiftExpired(now, now)).toBe(true)
  })
})

describe('isWinbackDue (day-60 gating)', () => {
  const now = new Date('2026-07-11T00:00:00.000Z')

  it('is not due before 60 days post-cancel', () => {
    const cancelled59 = daysFromNow(now, -59)
    expect(isWinbackDue(cancelled59, now)).toBe(false)
  })

  it('is due exactly at 60 days', () => {
    const cancelled60 = daysFromNow(now, -60)
    expect(isWinbackDue(cancelled60, now)).toBe(true)
  })

  it('is due after 60 days', () => {
    const cancelled90 = daysFromNow(now, -90)
    expect(isWinbackDue(cancelled90, now)).toBe(true)
  })

  it('gating is stable across repeated evaluation (idempotent guard)', () => {
    const cancelled70 = daysFromNow(now, -70)
    expect(isWinbackDue(cancelled70, now)).toBe(true)
    expect(isWinbackDue(cancelled70, now)).toBe(true)
  })
})

describe('winbackDedupeKey (WB-2 single-shot)', () => {
  it('is sub:{subscriptionId}', () => {
    expect(winbackDedupeKey('sub_123')).toBe('sub:sub_123')
  })
})

describe('isPurgeEligible (guard re-check at purge time)', () => {
  const now = new Date('2026-07-11T00:00:00.000Z')

  it('is not eligible when the clock has not elapsed', () => {
    expect(
      isPurgeEligible({
        premiumDataExpiresAt: daysFromNow(now, 1),
        liveTier: null,
        now,
      }),
    ).toBe(false)
  })

  it('is not eligible when premiumDataExpiresAt is null', () => {
    expect(
      isPurgeEligible({ premiumDataExpiresAt: null, liveTier: null, now }),
    ).toBe(false)
  })

  it('is eligible when the clock elapsed and the user is non-premium', () => {
    expect(
      isPurgeEligible({
        premiumDataExpiresAt: daysFromNow(now, -1),
        liveTier: null,
        now,
      }),
    ).toBe(true)
  })

  it('is eligible when downgraded to supporter (still non-premium)', () => {
    expect(
      isPurgeEligible({
        premiumDataExpiresAt: daysFromNow(now, -1),
        liveTier: 'supporter',
        now,
      }),
    ).toBe(true)
  })

  it.each(['premium', 'founder'])(
    'skips a user who re-upgraded to %s (guard re-check)',
    (tier) => {
      expect(
        isPurgeEligible({
          premiumDataExpiresAt: daysFromNow(now, -1),
          liveTier: tier,
          now,
        }),
      ).toBe(false)
    },
  )

  it('is a stable decision across repeated evaluation (idempotent)', () => {
    const input = {
      premiumDataExpiresAt: daysFromNow(now, -5),
      liveTier: null,
      now,
    }
    expect(isPurgeEligible(input)).toBe(true)
    expect(isPurgeEligible(input)).toBe(true)
  })
})

describe('cancellationStartsPurgeClock (task-6 reconcile mirrors the webhook)', () => {
  it.each(['premium', 'founder'])(
    'starts the 90-day clock for a %s cancellation',
    (tier) => {
      expect(cancellationStartsPurgeClock(tier)).toBe(true)
    },
  )

  it.each(['supporter', 'free'])(
    'does not start the clock for %s (never held premium data)',
    (tier) => {
      expect(cancellationStartsPurgeClock(tier)).toBe(false)
    },
  )

  it('does not start the clock for an unknown/null tier', () => {
    expect(cancellationStartsPurgeClock(null)).toBe(false)
  })
})
