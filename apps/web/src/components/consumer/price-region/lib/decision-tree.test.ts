import { describe, it, expect } from 'vitest'
import type {
  TierHeadline,
  TierAlternate,
  TierPriceBlock,
  TicketLink,
  EventDetailResponse,
} from '@concert-crawl/types'
import { decidePriceRegion } from './decision-tree'

type PickInput = Pick<
  EventDetailResponse,
  'priceByTier' | 'priceStatus' | 'status' | 'ticketLinks' | 'priceVendor'
>

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

function makeAlternate(
  partial: Partial<TierAlternate> & Pick<TierAlternate, 'priceMin'>,
): TierAlternate {
  return {
    submissionId: 'alt-1',
    priceMax: null,
    vendor: 'Ticketmaster',
    sourceCategory: 'resale',
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

function makeInput(partial: Partial<PickInput>): PickInput {
  return {
    priceByTier: null,
    priceStatus: 'live',
    status: 'upcoming',
    ticketLinks: null,
    priceVendor: null,
    ...partial,
  }
}

describe('decidePriceRegion', () => {
  it('sold-out + resale link → sold-out-resale with vendor', () => {
    const resaleLink: TicketLink = {
      kind: 'resale',
      vendor: 'StubHub',
      url: 'https://stubhub.com/x',
    }
    const result = decidePriceRegion({
      event: makeInput({
        priceStatus: 'soldout',
        ticketLinks: [resaleLink],
      }),
    })
    expect(result.kind).toBe('sold-out-resale')
    if (result.kind === 'sold-out-resale') {
      expect(result.resaleLink).toBe(resaleLink)
      expect(result.faceValueResaleVendor).toBe('StubHub')
    }
  })

  it('sold-out + no resale link → sold-out-contribute (LOCKED §9 Q1)', () => {
    const result = decidePriceRegion({
      event: makeInput({
        priceStatus: 'soldout',
        ticketLinks: null,
      }),
    })
    expect(result.kind).toBe('sold-out-contribute')
  })

  it('sold-out + ticketLinks without resale → sold-out-contribute', () => {
    const result = decidePriceRegion({
      event: makeInput({
        priceStatus: 'soldout',
        ticketLinks: [
          { kind: 'boxoffice', vendor: 'Venue', url: 'https://venue/x' },
        ],
      }),
    })
    expect(result.kind).toBe('sold-out-contribute')
  })

  it('no priceByTier + resale link → no-price-resale', () => {
    const resaleLink: TicketLink = {
      kind: 'resale',
      vendor: 'SeatGeek',
      url: 'https://seatgeek/x',
    }
    const result = decidePriceRegion({
      event: makeInput({
        priceByTier: null,
        ticketLinks: [resaleLink],
      }),
    })
    expect(result.kind).toBe('no-price-resale')
    if (result.kind === 'no-price-resale') {
      expect(result.faceValueResaleVendor).toBe('SeatGeek')
    }
  })

  it('no priceByTier + no links → no-price-empty (LOCKED §9 Q2-eng)', () => {
    const result = decidePriceRegion({
      event: makeInput({
        priceByTier: null,
        ticketLinks: null,
      }),
    })
    expect(result.kind).toBe('no-price-empty')
  })

  it('null priceByTier + no soldout → no-price-empty (legacy fallback)', () => {
    const result = decidePriceRegion({
      event: makeInput({
        priceByTier: null,
        priceStatus: 'live',
        ticketLinks: null,
      }),
    })
    expect(result.kind).toBe('no-price-empty')
  })

  it('priceByTier with entry tier mixed sources (boxoffice headline + resale alt) → multi-source-mixed', () => {
    const entryBlock = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '20',
        sourceCategory: 'boxoffice',
        vendor: 'VenueBoxOffice',
      }),
      alternates: [
        makeAlternate({
          priceMin: '35',
          sourceCategory: 'resale',
          vendor: 'Ticketmaster',
        }),
      ],
    })
    const otherTier = makeBlock({
      tier: 'VIP',
      headline: makeHeadline({
        priceMin: '80',
        sourceCategory: 'boxoffice',
      }),
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [entryBlock, otherTier] }),
    })
    expect(result.kind).toBe('multi-source-mixed')
    if (result.kind === 'multi-source-mixed') {
      expect(result.entryBlock).toBe(entryBlock)
      expect(result.crossSourceAlt.sourceCategory).toBe('resale')
      expect(result.otherTiers).toEqual([otherTier])
    }
  })

  it('priceByTier with sole resale headline (no boxoffice/standard headline anywhere) → resale-headline with vendor (STATE #3)', () => {
    const resaleBlock = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '85',
        sourceCategory: 'resale',
        vendor: 'SeatGeek',
      }),
    })
    const pendingOnlyTier = makeBlock({
      tier: 'VIP',
      headline: null,
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [resaleBlock, pendingOnlyTier] }),
    })
    expect(result.kind).toBe('resale-headline')
    if (result.kind === 'resale-headline') {
      expect(result.priceByTier).toHaveLength(2)
      expect(result.faceValueResaleVendor).toBe('SeatGeek')
    }
  })

  it('priceByTier with resale headline + LEGACY null-category headline on another tier → multi-tier-shipped (Copilot R12 regression — null is "standard" per API convention, NOT a missing headline)', () => {
    const resaleBlock = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '85',
        sourceCategory: 'resale',
        vendor: 'SeatGeek',
      }),
    })
    const legacyNullBlock = makeBlock({
      tier: 'VIP',
      headline: makeHeadline({
        priceMin: '120',
        // Legacy row (pre PR 3 backfill) — sourceCategory column was null.
        // API treats null as 'standard'; the decision tree must treat it
        // the same way so a real box-office/standard tier doesn't get
        // misrouted into the face-value-pedagogy state.
        sourceCategory: null,
        vendor: 'VenueBoxOffice',
      }),
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [resaleBlock, legacyNullBlock] }),
    })
    expect(result.kind).toBe('multi-tier-shipped')
  })

  it('priceByTier with boxoffice headline + resale headline on another tier → multi-tier-shipped (NOT resale-headline)', () => {
    const boxOfficeBlock = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
    })
    const resaleBlock = makeBlock({
      tier: 'VIP',
      headline: makeHeadline({
        priceMin: '120',
        sourceCategory: 'resale',
      }),
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [boxOfficeBlock, resaleBlock] }),
    })
    expect(result.kind).toBe('multi-tier-shipped')
  })

  it('priceByTier with entry tier single boxoffice source → multi-tier-shipped', () => {
    const block = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [block] }),
    })
    expect(result.kind).toBe('multi-tier-shipped')
  })

  it('STATE #6 — priceByTier with one headline tier + one pending-only tier → mixed-tier', () => {
    const headlineBlock = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
    })
    const pendingOnlyBlock = makeBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p1',
          priceMin: '80',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 1,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [headlineBlock, pendingOnlyBlock] }),
    })
    expect(result.kind).toBe('mixed-tier')
    if (result.kind === 'mixed-tier') {
      expect(result.priceByTier).toHaveLength(2)
    }
  })

  it('STATE #6 regression — headline tier WITH pending alongside + pending-only sibling still routes to mixed-tier', () => {
    // Regression for the Copilot R5 finding: the original mixed-tier check
    // required headline.pending.length === 0, so a headline tier with new
    // submissions arriving alongside it (very common) misrouted the
    // pending-only sibling to multi-tier-shipped where it would render as
    // a muted $0. The corrected check just looks for "any headline tier"
    // and "any pending-only tier".
    const headlineWithPending = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
      pending: [
        {
          id: 'ga-pending',
          priceMin: '26',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'sam',
          submittedAt: '2026-06-22T01:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const pendingOnlyBlock = makeBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'vip-pending',
          priceMin: '90',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 1,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const result = decidePriceRegion({
      event: makeInput({
        priceByTier: [headlineWithPending, pendingOnlyBlock],
      }),
    })
    expect(result.kind).toBe('mixed-tier')
  })

  it('STATE #7 — priceByTier where every tier is pending-only → all-tiers-pending', () => {
    const first = makeBlock({
      tier: 'GA',
      headline: null,
      pending: [
        {
          id: 'p1',
          priceMin: '40',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const second = makeBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p2',
          priceMin: '90',
          priceMax: null,
          vendor: 'Ticketmaster',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'kim',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [first, second] }),
    })
    expect(result.kind).toBe('all-tiers-pending')
    if (result.kind === 'all-tiers-pending') {
      expect(result.priceByTier).toHaveLength(2)
    }
  })

  it('STATE #6 — mixed-tier wins over multi-tier-shipped only when a pending-only tier exists', () => {
    // Two headline tiers, both with pending corroborators — NOT mixed-tier
    // (no pending-only tier).
    const ga = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
      pending: [
        {
          id: 'p-ga',
          priceMin: '26',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 1,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const vip = makeBlock({
      tier: 'VIP',
      headline: makeHeadline({
        priceMin: '80',
        sourceCategory: 'boxoffice',
      }),
    })
    const result = decidePriceRegion({
      event: makeInput({ priceByTier: [ga, vip] }),
    })
    expect(result.kind).toBe('multi-tier-shipped')
  })

  it('soldout trumps priceByTier (priceByTier present + priceStatus=soldout → soldout branch)', () => {
    const block = makeBlock({
      tier: 'GA',
      headline: makeHeadline({
        priceMin: '25',
        sourceCategory: 'boxoffice',
      }),
    })
    const resaleLink: TicketLink = {
      kind: 'resale',
      vendor: 'StubHub',
      url: 'https://stubhub/x',
    }
    const result = decidePriceRegion({
      event: makeInput({
        priceByTier: [block],
        priceStatus: 'soldout',
        ticketLinks: [resaleLink],
      }),
    })
    expect(result.kind).toBe('sold-out-resale')
  })
})
