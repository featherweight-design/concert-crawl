import { describe, expect, it } from 'vitest'

import {
  VENDOR_CATCHALL,
  VENDOR_GROUPS,
  VENDOR_PINNED,
  VENDOR_VALUES,
  isResaleVendor,
  vendorTrustRank,
} from './index'

const taxonomy = [
  ...VENDOR_PINNED,
  ...VENDOR_GROUPS.flatMap((group) => group.items),
  VENDOR_CATCHALL,
]

describe('vendor taxonomy', () => {
  // A value missing from the taxonomy is unreachable in the picker even though
  // the API accepts it — the failure is silent, so it gets a test.
  it('places every vendor value exactly once', () => {
    expect([...taxonomy].sort()).toEqual([...VENDOR_VALUES].sort())
  })

  it('pins the three highest-traffic vendors', () => {
    expect(VENDOR_PINNED).toEqual(['VenueBoxOffice', 'AXS', 'Ticketmaster'])
  })

  it('groups SeatGeek as resale, matching the price-kind fallback', () => {
    const resale = VENDOR_GROUPS.find((group) => group.id === 'resale')
    expect(resale?.items).toContain('SeatGeek')
  })

  // The API's price-trust ordering used to hardcode SeatGeek as the only
  // resale vendor. Expanding the enum without a shared predicate would let
  // StubHub outrank Ticketmaster, so the predicate is derived from the group.
  it('treats every resale-group vendor as resale', () => {
    for (const vendor of [
      'StubHub',
      'SeatGeek',
      'VividSeats',
      'Viagogo',
      'TicketNetwork',
    ] as const) {
      expect(isResaleVendor(vendor)).toBe(true)
    }
  })

  it('treats primary and pinned vendors as non-resale', () => {
    for (const vendor of [
      'VenueBoxOffice',
      'AXS',
      'Ticketmaster',
      'Etix',
      'Eventbrite',
      'DICE',
      'Other',
    ] as const) {
      expect(isResaleVendor(vendor)).toBe(false)
    }
  })

  it('ranks box office ahead of primary, and primary ahead of every resale vendor', () => {
    expect(vendorTrustRank('VenueBoxOffice')).toBe(0)
    expect(vendorTrustRank('Ticketmaster')).toBe(1)
    expect(vendorTrustRank('StubHub')).toBe(2)
    expect(vendorTrustRank('Ticketmaster')).toBeLessThan(
      vendorTrustRank('StubHub'),
    )
  })

  it('orders primary vendors by prod link frequency, Etix first', () => {
    const primary = VENDOR_GROUPS.find((group) => group.id === 'primary')
    expect(primary?.items).toEqual(['Etix', 'Eventbrite', 'DICE'])
  })
})
