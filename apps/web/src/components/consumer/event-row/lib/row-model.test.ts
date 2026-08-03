import { describe, it, expect } from 'vitest'
import type {
  EventWithVenue,
  TierPriceBlock,
  TierHeadline,
  WatchingShow,
} from '@concert-crawl/types'
import { fromEventWithVenue, fromWatchingShow } from './row-model'

function makeHeadline(
  partial: Partial<TierHeadline> & Pick<TierHeadline, 'priceMin'>,
): TierHeadline {
  return {
    submissionId: 'sub-1',
    priceMax: null,
    vendor: 'VenueBoxOffice',
    sourceCategory: 'boxoffice',
    submitterHandle: null,
    observedAt: '2026-06-24T00:00:00Z',
    approvedAt: '2026-06-24T00:00:00Z',
    approvalKind: 'fan',
    confirmsCount: 2,
    ...partial,
  }
}

function makeBlock(partial: Partial<TierPriceBlock>): TierPriceBlock {
  return {
    tier: 'GA',
    headline: null,
    alternates: [],
    pending: [],
    counterSubmission: null,
    reports: 0,
    ...partial,
  }
}

const baseEvent: EventWithVenue = {
  id: 'evt-1',
  venueId: 'venue-1',
  title: 'Test Artist at Test Ballroom',
  artist: 'Test Artist',
  supportingArtists: null,
  tourName: null,
  date: '2026-08-15',
  doorsTime: null,
  showTime: '20:00:00',
  ticketUrl: null,
  eventUrl: null,
  ticketLinks: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  priceSource: null,
  pipelineExhaustedAt: null,
  description: null,
  imageUrl: null,
  genre: ['rock'],
  status: 'upcoming',
  confidenceScore: null,
  verified: false,
  sourceUrl: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  venue: {
    id: 'venue-1',
    name: 'Test Ballroom',
    slug: 'test-ballroom',
    city: 'Denver',
    timezone: 'America/Denver',
    websiteUrl: 'https://example.com',
  },
  priceVendor: null,
}

describe('fromEventWithVenue', () => {
  it('leaves the price null when the event has no price at all', () => {
    expect(fromEventWithVenue(baseEvent).price).toBeNull()
  })

  it('takes the amount and its provenance off the same headline', () => {
    const { price } = fromEventWithVenue({
      ...baseEvent,
      priceByTier: [
        makeBlock({
          headline: makeHeadline({
            priceMin: '68.00',
            sourceCategory: 'standard',
            observedAt: '2026-08-01T00:00:00Z',
          }),
        }),
      ],
    })
    expect(price).toEqual({
      amount: 68,
      isFloor: true,
      source: 'standard',
      observedAt: '2026-08-01T00:00:00Z',
    })
  })

  it('prefers the tier headline over the legacy scalar', () => {
    const { price } = fromEventWithVenue({
      ...baseEvent,
      ticketPriceMin: '25',
      priceByTier: [
        makeBlock({ headline: makeHeadline({ priceMin: '68.00' }) }),
      ],
    })
    expect(price?.amount).toBe(68)
  })

  it('falls back to the legacy scalar with no provenance and no timestamp', () => {
    // The scalar carries neither, so a bare price must not borrow a chip or
    // read as freshly observed.
    const { price } = fromEventWithVenue({
      ...baseEvent,
      ticketPriceMin: '25.40',
      priceSource: 'community',
    })
    expect(price).toEqual({
      amount: 25,
      isFloor: true,
      source: null,
      observedAt: null,
    })
  })

  it('treats a crawled headline as provenance-free rather than inventing one', () => {
    const { price } = fromEventWithVenue({
      ...baseEvent,
      priceByTier: [
        makeBlock({
          headline: makeHeadline({ priceMin: '30', sourceCategory: null }),
        }),
      ],
    })
    expect(price?.source).toBeNull()
  })

  it('ignores an unparseable legacy scalar', () => {
    expect(
      fromEventWithVenue({ ...baseEvent, ticketPriceMin: 'free' }).price,
    ).toBeNull()
  })

  it('keeps the lifecycle status separate from the price status', () => {
    const row = fromEventWithVenue({ ...baseEvent, status: 'cancelled' })
    expect(row.lifecycle).toBe('cancelled')
    // Browse payloads carry no sold-out signal.
    expect(row.status).toBe('live')
  })

  it('formats the date at full length so line 3 can shorten it in place', () => {
    expect(fromEventWithVenue(baseEvent).dateLabel).toBe('Sat, Aug 15')
  })

  it('shortens the venue name the way every other surface does', () => {
    expect(fromEventWithVenue(baseEvent).venueName).toBe('Test')
  })

  it('reads followed state as a non-empty match list', () => {
    expect(fromEventWithVenue(baseEvent).isFollowed).toBe(false)
    expect(
      fromEventWithVenue({ ...baseEvent, followedArtists: [] }).isFollowed,
    ).toBe(false)
    expect(
      fromEventWithVenue({ ...baseEvent, followedArtists: ['Test Artist'] })
        .isFollowed,
    ).toBe(true)
  })
})

const baseWatchingShow: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: 'Test Artist',
  venueName: 'Test Venue',
  venueSlug: 'test-venue',
  date: '2099-08-15',
  showTime: '20:00',
  ticketUrl: null,
  ticketLinks: null,
  savedAt: '2026-06-01T00:00:00Z',
  savedPrice: 45,
  currentPrice: 45,
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: '2026-06-24T00:00:00Z',
  priceObservedAt: null,
  imageUrl: null,
  attendingAt: null,
}

describe('fromWatchingShow', () => {
  // The row subtracts the saved price from the current one, and only hides the
  // delta when it is exactly 0. A fractional saved price against a rounded
  // current price leaves a delta that formats to "$0" but still renders an
  // arrow, so both sides have to round on the same terms.
  it('rounds the saved price on the same terms as the current one', () => {
    const row = fromWatchingShow({
      ...baseWatchingShow,
      currentPrice: 45,
      savedPrice: 45.4,
    })

    expect(row.saved?.price).toBe(45)
    expect((row.price?.amount ?? 0) - (row.saved?.price ?? 0)).toBe(0)
  })

  it('carries no price at all when the show has none', () => {
    expect(
      fromWatchingShow({ ...baseWatchingShow, currentPrice: null }).price,
    ).toBeNull()
  })

  // Every row on this list is watched, so the tick would say nothing.
  it('never reports watching state on a list that is entirely watched', () => {
    expect(fromWatchingShow(baseWatchingShow).isWatching).toBe(false)
  })
})
