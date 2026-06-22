import { describe, expect, it } from 'vitest'
import {
  aggregateByTier,
  pickHeadlinesByTier,
  type AggregateByTierInput,
  type CorroboratedTierRow,
  type PendingTierRow,
} from './aggregate-by-tier.js'

const corrob = (
  overrides: Partial<CorroboratedTierRow>,
): CorroboratedTierRow => ({
  id: overrides.id ?? 'corrob-1',
  tier: overrides.tier ?? 'GA',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  userId: overrides.userId ?? 'submitter-1',
  createdAt: overrides.createdAt ?? new Date('2026-06-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-06-02T00:00:00Z'),
  confirmsCount: overrides.confirmsCount ?? 1,
})

const pendingRow = (overrides: Partial<PendingTierRow>): PendingTierRow => ({
  id: overrides.id ?? 'pending-1',
  tier: overrides.tier ?? 'GA',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  howFound: overrides.howFound ?? 'saw_listing',
  note: overrides.note ?? null,
  userId: overrides.userId ?? 'submitter-2',
  createdAt: overrides.createdAt ?? new Date('2026-06-10T00:00:00Z'),
  confirmsCount: overrides.confirmsCount ?? 0,
})

const baseInput: AggregateByTierInput = {
  corroborated: [],
  pending: [],
  counters: [],
  handles: new Map(),
  reportsByTier: new Map(),
  confirmsNeeded: 2,
  viewerUserId: null,
}

describe('aggregateByTier', () => {
  it('returns empty array when no submissions exist', () => {
    expect(aggregateByTier(baseInput)).toEqual([])
  })

  it('emits one block per tier with the cheapest headline first', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({ id: 'vip', tier: 'VIP', priceMin: '100' }),
        corrob({ id: 'ga', tier: 'GA', priceMin: '25' }),
      ],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.tier).toBe('GA')
    expect(blocks[1]?.tier).toBe('VIP')
  })

  it('boxoffice wins over standard within same tier', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({
          id: 'std',
          tier: 'GA',
          sourceCategory: 'standard',
          priceMin: '20',
        }),
        corrob({
          id: 'bo',
          tier: 'GA',
          sourceCategory: 'boxoffice',
          vendor: 'VenueBoxOffice',
          priceMin: '35',
        }),
      ],
      reportsByTier: new Map([['GA', 2]]),
    })
    expect(blocks[0]?.headline?.submissionId).toBe('bo')
    expect(blocks[0]?.alternates).toHaveLength(1)
    expect(blocks[0]?.alternates[0]?.submissionId).toBe('std')
  })

  it('resolves submitter handle via the handles map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', userId: 'user-1' })],
      handles: new Map([['user-1', 'price-watcher']]),
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.headline?.submitterHandle).toBe('price-watcher')
  })

  it('sets approvalKind to fan when confirmsCount > 0, admin otherwise', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [
        corrob({ id: 'fan-confirmed', tier: 'GA', confirmsCount: 1 }),
        corrob({ id: 'admin-only', tier: 'VIP', confirmsCount: 0 }),
      ],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    const ga = blocks.find((block) => block.tier === 'GA')
    const vip = blocks.find((block) => block.tier === 'VIP')
    expect(ga?.headline?.approvalKind).toBe('fan')
    expect(vip?.headline?.approvalKind).toBe('admin')
  })

  it('emits pending rows per tier with confirmsNeeded threaded through', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      pending: [
        pendingRow({ id: 'pen-1', tier: 'GA' }),
        pendingRow({ id: 'pen-2', tier: 'VIP' }),
      ],
      confirmsNeeded: 3,
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks.find((block) => block.tier === 'GA')?.pending).toHaveLength(1)
    expect(
      blocks.find((block) => block.tier === 'GA')?.pending[0]?.confirmsNeeded,
    ).toBe(3)
  })

  it('marks isSubmitter true when pending row userId matches viewer', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      pending: [pendingRow({ id: 'pen', tier: 'GA', userId: 'viewer-1' })],
      viewerUserId: 'viewer-1',
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.pending[0]?.isSubmitter).toBe(true)
  })

  it('attaches counter-submission to its parent tier', () => {
    const headline = corrob({ id: 'head', tier: 'GA' })
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [headline],
      counters: [
        {
          id: 'counter-1',
          parentSubmissionId: 'head',
          tier: 'GA',
          priceMin: '20',
          priceMax: null,
          userId: 'challenger',
          createdAt: new Date('2026-06-12T00:00:00Z'),
        },
      ],
      handles: new Map([['challenger', 'fan-2']]),
      reportsByTier: new Map([['GA', 1]]),
    })
    expect(blocks[0]?.counterSubmission?.id).toBe('counter-1')
    expect(blocks[0]?.counterSubmission?.parentSubmissionId).toBe('head')
    expect(blocks[0]?.counterSubmission?.floor).toBe(20)
    expect(blocks[0]?.counterSubmission?.submitter?.handle).toBe('fan-2')
  })

  it('includes pending-only tiers after corroborated-headline tiers', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA', priceMin: '80' })],
      pending: [pendingRow({ id: 'vip-pen', tier: 'VIP', priceMin: '20' })],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 1],
      ]),
    })
    expect(blocks.map((block) => block.tier)).toEqual(['GA', 'VIP'])
  })

  it('surfaces reports count from the input map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA' })],
      reportsByTier: new Map([['GA', 5]]),
    })
    expect(blocks[0]?.reports).toBe(5)
  })

  it('defaults reports to 0 when tier missing from map', () => {
    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [corrob({ id: 'ga', tier: 'GA' })],
      reportsByTier: new Map(),
    })
    expect(blocks[0]?.reports).toBe(0)
  })

  it('emits alternates in deterministic trust-then-price order regardless of input order', () => {
    // Input order is intentionally scrambled — the composer should still emit
    // alternates sorted by trust (boxoffice → standard → resale) then by price
    // ascending so the API response is stable across runs.
    const boxoffice = corrob({
      id: 'bo',
      tier: 'GA',
      sourceCategory: 'boxoffice',
      vendor: 'VenueBoxOffice',
      priceMin: '40',
    })
    const resale = corrob({
      id: 'resale',
      tier: 'GA',
      sourceCategory: 'resale',
      priceMin: '80',
    })
    const standardCheap = corrob({
      id: 'std-cheap',
      tier: 'GA',
      sourceCategory: 'standard',
      priceMin: '45',
    })
    const standardPricey = corrob({
      id: 'std-pricey',
      tier: 'GA',
      sourceCategory: 'standard',
      priceMin: '60',
    })

    const blocks = aggregateByTier({
      ...baseInput,
      corroborated: [resale, standardPricey, boxoffice, standardCheap],
      reportsByTier: new Map([['GA', 4]]),
    })

    expect(blocks[0]?.headline?.submissionId).toBe('bo')
    expect(blocks[0]?.alternates.map((alt) => alt.submissionId)).toEqual([
      'std-cheap',
      'std-pricey',
      'resale',
    ])
  })

  it('sorts pending-only tiers by min pending price (not pending[0] which is VenueBoxOffice-first)', () => {
    // pending[] sorts VenueBoxOffice-first + newest-first for display, so
    // pending[0] is NOT guaranteed to be the cheapest. Tier ordering still has
    // to use the actual minimum across the tier's pending rows.
    const blocks = aggregateByTier({
      ...baseInput,
      pending: [
        pendingRow({
          id: 'vip-bo-expensive',
          tier: 'VIP',
          vendor: 'VenueBoxOffice',
          sourceCategory: 'boxoffice',
          priceMin: '200',
        }),
        pendingRow({
          id: 'vip-std-cheap',
          tier: 'VIP',
          vendor: 'Ticketmaster',
          sourceCategory: 'standard',
          priceMin: '120',
        }),
        pendingRow({
          id: 'ga-std',
          tier: 'GA',
          vendor: 'Ticketmaster',
          sourceCategory: 'standard',
          priceMin: '150',
        }),
      ],
      reportsByTier: new Map([
        ['GA', 1],
        ['VIP', 2],
      ]),
    })

    // VIP's cheapest pending is $120; GA's only pending is $150. VIP should
    // lead because its min is lower — even though the VIP pending list's
    // pending[0] is the $200 VenueBoxOffice row (sorted VenueBoxOffice-first
    // for display). compareBlocks has to scan all pending rows for the true
    // min, not trust pending[0].
    expect(blocks.map((block) => block.tier)).toEqual(['VIP', 'GA'])
  })
})

describe('pickHeadlinesByTier', () => {
  it('returns empty map for empty input', () => {
    expect(pickHeadlinesByTier([])).toEqual(new Map())
  })

  it('returns one headline per tier present in the input', () => {
    const heads = pickHeadlinesByTier([
      corrob({ id: 'ga-row', tier: 'GA' }),
      corrob({ id: 'vip-row', tier: 'VIP' }),
    ])
    expect(heads.size).toBe(2)
    expect(heads.get('GA')?.id).toBe('ga-row')
    expect(heads.get('VIP')?.id).toBe('vip-row')
  })

  it('within a tier picks the boxoffice row over a cheaper standard row (trust > price)', () => {
    const heads = pickHeadlinesByTier([
      corrob({
        id: 'ga-std-cheap',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '20',
      }),
      corrob({
        id: 'ga-bo',
        tier: 'GA',
        sourceCategory: 'boxoffice',
        vendor: 'VenueBoxOffice',
        priceMin: '40',
      }),
    ])
    expect(heads.get('GA')?.id).toBe('ga-bo')
  })

  it('within a tier picks the cheaper row when trust is equal (price tie-break)', () => {
    const heads = pickHeadlinesByTier([
      corrob({
        id: 'ga-std-50',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '50',
      }),
      corrob({
        id: 'ga-std-30',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '30',
      }),
    ])
    expect(heads.get('GA')?.id).toBe('ga-std-30')
  })

  it('within a tier breaks a trust+price tie by newest updatedAt', () => {
    const heads = pickHeadlinesByTier([
      corrob({
        id: 'ga-old',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '30',
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      }),
      corrob({
        id: 'ga-new',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '30',
        updatedAt: new Date('2026-06-15T00:00:00Z'),
      }),
    ])
    expect(heads.get('GA')?.id).toBe('ga-new')
  })

  it('selects the right headline per tier independently when multiple tiers each have multiple rows', () => {
    const heads = pickHeadlinesByTier([
      corrob({
        id: 'ga-std',
        tier: 'GA',
        sourceCategory: 'standard',
        priceMin: '25',
      }),
      corrob({
        id: 'ga-bo',
        tier: 'GA',
        sourceCategory: 'boxoffice',
        vendor: 'VenueBoxOffice',
        priceMin: '35',
      }),
      corrob({
        id: 'vip-resale',
        tier: 'VIP',
        sourceCategory: 'resale',
        priceMin: '100',
      }),
      corrob({
        id: 'vip-std',
        tier: 'VIP',
        sourceCategory: 'standard',
        priceMin: '180',
      }),
    ])
    // GA boxoffice wins over cheaper standard
    expect(heads.get('GA')?.id).toBe('ga-bo')
    // VIP standard wins over cheaper resale
    expect(heads.get('VIP')?.id).toBe('vip-std')
  })
})
