import { describe, it, expect } from 'vitest'
import { computePendingCount } from './review-pending'

describe('computePendingCount (#711 + #697)', () => {
  // Pins the header-pill formula. If a future change drops one of the
  // four triage counts (e.g. reverts to `eventFlags + prices` without
  // missing or priceContests), this assertion fails — the mobile-subtitle
  // test alone wouldn't catch that since the subtitle caller passes
  // counts explicitly.
  it('sums Event Flags + Prices + Missing + Contests', () => {
    expect(
      computePendingCount({
        eventFlags: 5,
        prices: 3,
        missing: 7,
        priceContests: 2,
      }),
    ).toBe(17)
  })

  it('returns 0 when every tab is empty', () => {
    expect(
      computePendingCount({
        eventFlags: 0,
        prices: 0,
        missing: 0,
        priceContests: 0,
      }),
    ).toBe(0)
  })

  it('contributes from each tab independently', () => {
    expect(
      computePendingCount({
        eventFlags: 10,
        prices: 0,
        missing: 0,
        priceContests: 0,
      }),
    ).toBe(10)
    expect(
      computePendingCount({
        eventFlags: 0,
        prices: 10,
        missing: 0,
        priceContests: 0,
      }),
    ).toBe(10)
    expect(
      computePendingCount({
        eventFlags: 0,
        prices: 0,
        missing: 10,
        priceContests: 0,
      }),
    ).toBe(10)
    // Spec §18 lock #1: priceContests rolls into the same "pending" sum
    // so the sidebar badge + header pill move together with the new tab.
    expect(
      computePendingCount({
        eventFlags: 0,
        prices: 0,
        missing: 0,
        priceContests: 10,
      }),
    ).toBe(10)
  })
})
