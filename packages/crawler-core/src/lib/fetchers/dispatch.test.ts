import { describe, it, expect } from 'vitest'
import { dispatch } from './dispatch.js'
import type { Venue } from '@concert-crawl/db'

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: 'test-venue',
    websiteUrl: 'https://example.com/',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    platform: null,
    platformVenueId: null,
    ...overrides,
  } as Venue
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
    expect(fetcher?.platform).toBe('aeg')
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
})
