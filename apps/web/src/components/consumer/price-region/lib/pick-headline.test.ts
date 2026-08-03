import { describe, it, expect } from 'vitest'
import type { TierPriceBlock, TierHeadline } from '@concert-crawl/types'
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
    })
  })

  it('returns null when every tier is pending-only', () => {
    const blocks: TierPriceBlock[] = [
      makeBlock({ tier: 'GA', headline: null }),
      makeBlock({ tier: 'VIP', headline: null }),
    ]
    expect(pickBrowseHeadline(blocks)).toBeNull()
  })
})
