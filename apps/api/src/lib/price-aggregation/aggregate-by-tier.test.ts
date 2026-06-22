import { describe, expect, it } from 'vitest'
import {
  aggregateByTier,
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
})
