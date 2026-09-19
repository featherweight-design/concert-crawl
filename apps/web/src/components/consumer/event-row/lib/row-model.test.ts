import { describe, it, expect } from 'vitest'
import type {
  CrewShow,
  EventWithVenue,
  TierPriceBlock,
  TierHeadline,
  TierPending,
  WatchingShow,
} from '@concert-crawl/types'
import { fromCrewShow, fromEventWithVenue, fromWatchingShow } from './row-model'

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

function makePending(): TierPending {
  return {
    id: 'pend-1',
    priceMin: '35',
    priceMax: null,
    vendor: 'VenueBoxOffice',
    howFound: 'saw_listing',
    sourceCategory: 'standard',
    note: null,
    submitterHandle: null,
    submittedAt: '2026-06-20T00:00:00Z',
    confirmsCount: 0,
    confirmsNeeded: 2,
    isSubmitter: false,
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
      isPending: false,
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
      isPending: false,
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

  it('carries the pending flag through from a headline-less tier', () => {
    const { price } = fromEventWithVenue({
      ...baseEvent,
      priceByTier: [makeBlock({ headline: null, pending: [makePending()] })],
    })
    expect(price?.amount).toBe(35)
    expect(price?.isPending).toBe(true)
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
  artistPhotoUrl: null,
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

  // Dropping the portrait here sent every artwork-less watched show to
  // IdentityArt while Browse rendered the same show with a real face.
  it('carries the headliner portrait so the row matches Browse', () => {
    const portrait = 'https://i.scdn.co/image/headliner'

    expect(
      fromWatchingShow({ ...baseWatchingShow, artistPhotoUrl: portrait })
        .artistPhotoUrl,
    ).toBe(portrait)
  })
})

describe('fromCrewShow', () => {
  const crewShow: CrewShow = {
    eventId: 'evt-1',
    iso: '2026-08-15',
    showTime: '20:00:00',
    title: 'Test Artist at Test Ballroom',
    artist: 'Test Artist',
    imageUrl: null,
    artistPhotoUrl: null,
    venue: 'Test Ballroom',
    venueSlug: 'test-ballroom',
    goingCount: 2,
    going: [],
  }

  // `headliner` seeds the row's title line AND its generated identity art, so
  // a crew row built from `title` drew a different mark from every other
  // surface showing the same show. Comparing the two adapters is the assertion
  // — checking the string alone would pass on a payload that stopped deriving
  // the headliner at all.
  it('names the act, matching what Browse builds for the same event', () => {
    expect(fromCrewShow(crewShow).headliner).toBe(
      fromEventWithVenue(baseEvent).headliner,
    )
  })

  it('keeps the billing string as the fallback title', () => {
    expect(fromCrewShow(crewShow).fallbackTitle).toBe(
      'Test Artist at Test Ballroom',
    )
  })
})
