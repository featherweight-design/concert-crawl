import { describe, expect, it } from 'vitest'
import { deriveTicketLinks } from './derive.js'

const BOXOFFICE_VENUE = {
  websiteUrl: 'https://www.larimerlounge.com/',
  ticketVendor: null,
} as const

describe('deriveTicketLinks', () => {
  it('returns null when ticketUrl is null', () => {
    expect(deriveTicketLinks(null, BOXOFFICE_VENUE)).toBeNull()
  })

  it('returns null when ticketUrl is undefined', () => {
    expect(deriveTicketLinks(undefined, BOXOFFICE_VENUE)).toBeNull()
  })

  it('returns null when ticketUrl is empty', () => {
    expect(deriveTicketLinks('', BOXOFFICE_VENUE)).toBeNull()
  })

  it('marks a URL on the venue host as boxoffice', () => {
    const result = deriveTicketLinks(
      'https://www.larimerlounge.com/events/42',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://www.larimerlounge.com/events/42',
      },
    ])
  })

  it('marks a venue-subdomain URL as boxoffice when the base host matches', () => {
    const result = deriveTicketLinks(
      'https://tickets.larimerlounge.com/event/42',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://tickets.larimerlounge.com/event/42',
      },
    ])
  })

  it('marks any URL as boxoffice when venue.ticketVendor is venue_box_office', () => {
    const result = deriveTicketLinks('https://example.com/box-office/sale', {
      websiteUrl: 'https://gothictheatre.example.com/',
      ticketVendor: 'venue_box_office',
    })
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: 'VenueBoxOffice',
        url: 'https://example.com/box-office/sale',
      },
    ])
  })

  it('marks a Ticketmaster URL as primary with vendor Ticketmaster', () => {
    const result = deriveTicketLinks(
      'https://www.ticketmaster.com/event/abc123',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: 'Ticketmaster',
        url: 'https://www.ticketmaster.com/event/abc123',
      },
    ])
  })

  it('marks an AXS URL as primary with vendor AXS', () => {
    const result = deriveTicketLinks(
      'https://www.axs.com/events/xyz',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      { kind: 'primary', vendor: 'AXS', url: 'https://www.axs.com/events/xyz' },
    ])
  })

  it('marks a StubHub URL as resale with null vendor', () => {
    const result = deriveTicketLinks(
      'https://www.stubhub.com/some-show/event/1234',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'resale',
        vendor: null,
        url: 'https://www.stubhub.com/some-show/event/1234',
      },
    ])
  })

  it('marks a VividSeats URL as resale', () => {
    const result = deriveTicketLinks(
      'https://www.vividseats.com/some-show-tickets',
      BOXOFFICE_VENUE,
    )
    expect(result?.[0]?.kind).toBe('resale')
  })

  it('falls back to venue.ticketVendor mapping when the host is unknown', () => {
    const result = deriveTicketLinks(
      'https://tickets.unknown-platform.example/event',
      { websiteUrl: 'https://larimerlounge.com/', ticketVendor: 'axs' },
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: 'AXS',
        url: 'https://tickets.unknown-platform.example/event',
      },
    ])
  })

  it('returns vendor null when the venue.ticketVendor is "unknown"', () => {
    const result = deriveTicketLinks(
      'https://tickets.unknown-platform.example/event',
      { websiteUrl: 'https://larimerlounge.com/', ticketVendor: 'unknown' },
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: null,
        url: 'https://tickets.unknown-platform.example/event',
      },
    ])
  })

  it('prefers URL-derived vendor over venue.ticketVendor when both exist', () => {
    const result = deriveTicketLinks('https://www.ticketmaster.com/event/abc', {
      websiteUrl: 'https://example.com/',
      ticketVendor: 'axs',
    })
    expect(result?.[0]?.vendor).toBe('Ticketmaster')
  })

  it('keeps a malformed-URL ticketUrl in the output (no host inference)', () => {
    // Defensive: extractors should never emit garbage, but if they do we
    // surface the value so it's visible/auditable rather than swallowed.
    const result = deriveTicketLinks('not-a-real-url', BOXOFFICE_VENUE)
    expect(result).toEqual([
      { kind: 'primary', vendor: null, url: 'not-a-real-url' },
    ])
  })
})
