import { describe, it, expect } from 'vitest'
import { dispatch } from './dispatch.js'
import type { Venue } from '@concert-crawl/db'

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: 'test-venue',
    websiteUrl: 'https://example.com/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    verifiedBy: null,
    verifiedAt: null,
    lastCrawledAt: null,
    crawlNotes: null,
    crawlDelayMs: 3000,
    robotsTxtAllowed: null,
    robotsTxtCheckedAt: null,
    consecutiveFailures: 0,
    blockedAt: null,
    lastEventCountAlertAt: null,
    platform: null,
    platformVenueId: null,
    extractionStrategy: null,
    crawlWaitUntil: 'networkidle',
    crawlWaitForSelector: null,
    crawlMode: 'browser',
    address: null,
    capacity: null,
    venueType: null,
    about: null,
    neighborhood: null,
    featured: false,
    lat: null,
    lng: null,
    contactEmail: null,
    priceUrl: null,
    ticketVendor: null,
    apiProvider: null,
    apiAccountId: null,
    debugCaptureHtml: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Venue
}

describe('dispatch', () => {
  it('returns null when venue.platform is null', () => {
    expect(dispatch(makeVenue())).toBeNull()
  })

  it('returns the AEG fetcher for an AEG-configured venue', () => {
    const fetcher = dispatch(
      makeVenue({ platform: 'aeg', platformVenueId: '2' }),
    )
    expect(fetcher).not.toBeNull()
    expect(fetcher?.source).toBe('aeg')
  })

  it('returns null when AEG fetcher rejects via canHandle (missing platformVenueId)', () => {
    expect(
      dispatch(makeVenue({ platform: 'aeg', platformVenueId: null })),
    ).toBeNull()
  })

  it('returns null when platform value has no registered fetcher (defensive)', () => {
    expect(
      dispatch(
        makeVenue({
          platform: 'not-a-real-platform' as unknown as 'aeg',
          platformVenueId: '1',
        }),
      ),
    ).toBeNull()
  })

  it('routes a venuepilot venue to the VenuePilot fetcher', () => {
    const fetcher = dispatch(
      makeVenue({ apiProvider: 'venuepilot', apiAccountId: '1105' }),
    )
    expect(fetcher).not.toBeNull()
    expect(fetcher?.source).toBe('venuepilot')
  })

  it('returns null for a venuepilot venue with no apiAccountId', () => {
    expect(
      dispatch(makeVenue({ apiProvider: 'venuepilot', apiAccountId: null })),
    ).toBeNull()
  })

  it('still routes an AEG venue to the AEG fetcher (regression)', () => {
    const fetcher = dispatch(
      makeVenue({ platform: 'aeg', platformVenueId: '2' }),
    )
    expect(fetcher?.source).toBe('aeg')
  })

  it('returns null for a venue with neither platform nor apiProvider', () => {
    expect(dispatch(makeVenue())).toBeNull()
  })

  it('prefers VenuePilot when both platform and apiProvider are set (misconfig)', () => {
    const fetcher = dispatch(
      makeVenue({
        platform: 'aeg',
        platformVenueId: '2',
        apiProvider: 'venuepilot',
        apiAccountId: '1105',
      }),
    )
    expect(fetcher?.source).toBe('venuepilot')
  })
})
