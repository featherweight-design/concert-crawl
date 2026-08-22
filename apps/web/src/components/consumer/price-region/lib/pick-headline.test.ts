import { describe, it, expect } from 'vitest'
import type {
  TierPriceBlock,
  TierHeadline,
  TierPending,
} from '@concert-crawl/types'
import { pickBrowseHeadline } from './pick-headline'

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

function makePending(
  partial: Partial<TierPending> & Pick<TierPending, 'priceMin'>,
): TierPending {
  return {
    id: 'pend-1',
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

describe('pickBrowseHeadline', () => {
  it('returns null for null/undefined input', () => {
    expect(pickBrowseHeadline(null)).toBeNull()
    expect(pickBrowseHeadline(undefined)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(pickBrowseHeadline([])).toBeNull()
  })

  it('maps a single boxoffice tier → sourceCategory: boxoffice', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: makeHeadline({
          priceMin: '25',
          sourceCategory: 'boxoffice',
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 25,
      sourceCategory: 'boxoffice',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('maps a single standard tier → sourceCategory: standard', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: makeHeadline({
          priceMin: '30',
          sourceCategory: 'standard',
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 30,
      sourceCategory: 'standard',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('maps a single resale tier → sourceCategory: resale', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: makeHeadline({
          priceMin: '85',
          sourceCategory: 'resale',
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 85,
      sourceCategory: 'resale',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('passes a null sourceCategory through as null', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: makeHeadline({
          priceMin: '40',
          sourceCategory: null,
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 40,
      sourceCategory: null,
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('returns the FIRST block with a non-null headline (cheapest tier — API sorts ASC)', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: makeHeadline({
          priceMin: '25',
          sourceCategory: 'boxoffice',
        }),
      }),
      makeBlock({
        tier: 'VIP',
        headline: makeHeadline({
          priceMin: '80',
          sourceCategory: 'standard',
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 25,
      sourceCategory: 'boxoffice',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('skips pending-only tier (headline null) and returns next', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({ tier: 'GA', headline: null }),
      makeBlock({
        tier: 'VIP',
        headline: makeHeadline({
          priceMin: '80',
          sourceCategory: 'boxoffice',
        }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 80,
      sourceCategory: 'boxoffice',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  it('returns null when no tier has a headline or a pending submission', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({ tier: 'GA', headline: null }),
      makeBlock({ tier: 'VIP', headline: null }),
    ]
    expect(pickBrowseHeadline(blocks)).toBeNull()
  })

  it('falls back to a pending submission when no tier has a headline', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: null,
        pending: [makePending({ priceMin: '35' })],
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 35,
      sourceCategory: 'standard',
      observedAt: '2026-06-20T00:00:00Z',
      isPending: true,
    })
  })

  // A corroborated price is the better answer even when an unconfirmed one is
  // cheaper, so the pending pass never runs while any tier has a headline.
  it('prefers an approved headline over a cheaper pending submission', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: null,
        pending: [makePending({ priceMin: '10' })],
      }),
      makeBlock({
        tier: 'VIP',
        headline: makeHeadline({ priceMin: '80' }),
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 80,
      sourceCategory: 'boxoffice',
      observedAt: '2026-06-24T00:00:00Z',
      isPending: false,
    })
  })

  // `pending[]` is ordered by recency, so the first entry is not the cheapest.
  it('takes the cheapest pending submission within a block, not the first', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: null,
        pending: [
          makePending({ id: 'recent', priceMin: '60' }),
          makePending({
            id: 'older',
            priceMin: '30',
            submittedAt: '2026-06-18T00:00:00Z',
          }),
        ],
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 30,
      sourceCategory: 'standard',
      observedAt: '2026-06-18T00:00:00Z',
      isPending: true,
    })
  })

  it('ignores a pending entry whose price does not parse', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({
        tier: 'GA',
        headline: null,
        pending: [
          makePending({ id: 'junk', priceMin: 'not-a-number' }),
          makePending({ id: 'good', priceMin: '45' }),
        ],
      }),
    ]
    expect(pickBrowseHeadline(blocks)).toEqual({
      price: 45,
      sourceCategory: 'standard',
      observedAt: '2026-06-20T00:00:00Z',
      isPending: true,
    })
  })
})
