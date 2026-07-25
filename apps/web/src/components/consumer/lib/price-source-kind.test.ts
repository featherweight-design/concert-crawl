import { describe, expect, it } from 'vitest'
import { resolveAlternateKind, resolveSourceKind } from './price-source-kind'

// The submit form asks "Where's the price from?" (box office / standard /
// resale) and stores the answer as sourceCategory. These resolvers decide
// which trust mark the price card shows. Before this fix they read the
// vendor string instead, so a fan-submitted resale price rendered as
// "Community" and every vendor outside the original six did too.

describe('resolveSourceKind', () => {
  it('marks a community-submitted resale price as resale', () => {
    expect(resolveSourceKind('community', 'StubHub', 'resale')).toBe('resale')
  })

  it('marks a community-submitted box-office price as boxoffice', () => {
    expect(resolveSourceKind('community', 'VenueBoxOffice', 'boxoffice')).toBe(
      'boxoffice',
    )
  })

  it('marks a community-submitted standard price as community', () => {
    expect(resolveSourceKind('community', 'AXS', 'standard')).toBe('community')
  })

  it('marks a vendor outside the original six as community, not resale', () => {
    expect(resolveSourceKind('community', 'Etix', 'standard')).toBe('community')
  })

  it('honours the submitted category over the vendor for SeatGeek', () => {
    expect(resolveSourceKind('community', 'SeatGeek', 'standard')).toBe(
      'community',
    )
  })

  it('falls back to the vendor when sourceCategory is null', () => {
    expect(resolveSourceKind('community', 'VenueBoxOffice', null)).toBe(
      'boxoffice',
    )
    expect(resolveSourceKind('community', 'SeatGeek', null)).toBe('resale')
  })

  // The legacy fallback named SeatGeek alone; #1193 added four more resale
  // marketplaces, which would otherwise fall through to the community mark.
  it.each(['StubHub', 'VividSeats', 'Viagogo', 'TicketNetwork'])(
    'falls back to the resale mark for %s',
    (vendor) => {
      expect(resolveSourceKind('community', vendor, null)).toBe('resale')
    },
  )

  it('keeps the community mark for a primary vendor with no category', () => {
    expect(resolveSourceKind('community', 'Etix', null)).toBe('community')
    expect(resolveSourceKind('community', 'AXS', null)).toBe('community')
  })

  it('leaves crawled prices as primary regardless of category', () => {
    expect(resolveSourceKind('structured_data', 'AXS', null)).toBe('primary')
  })

  it('keeps the seatgeek price source as resale', () => {
    expect(resolveSourceKind('seatgeek', null, null)).toBe('resale')
  })
})

describe('resolveAlternateKind', () => {
  it('marks a resale alternate as resale', () => {
    expect(resolveAlternateKind('StubHub', 'resale')).toBe('resale')
  })

  it('marks a box-office alternate as boxoffice', () => {
    expect(resolveAlternateKind('VenueBoxOffice', 'boxoffice')).toBe(
      'boxoffice',
    )
  })

  it('marks a standard alternate as community', () => {
    expect(resolveAlternateKind('SeatGeek', 'standard')).toBe('community')
  })

  it('falls back to the vendor when sourceCategory is null', () => {
    expect(resolveAlternateKind('VenueBoxOffice', null)).toBe('boxoffice')
    expect(resolveAlternateKind('SeatGeek', null)).toBe('resale')
    expect(resolveAlternateKind('Etix', null)).toBe('community')
  })
})
