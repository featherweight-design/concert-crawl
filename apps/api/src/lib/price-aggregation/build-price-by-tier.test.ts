import { describe, it, expect } from 'vitest'
import {
  buildPriceByTierMap,
  lowestHeadlineObservedAt,
  lowestHeadlineSourceCategory,
  lowestHeadlinePrice,
  resolveDisplayPrice,
  type CorroboratedSubmissionRow,
} from './build-price-by-tier.js'

const baseRow = {
  priceMax: null,
  sourceCategory: 'standard' as const,
  howFound: 'saw_listing' as const,
  userId: 'user-1',
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
  lastSeenAt: null,
  corroborationCount: 3,
}

function row(
  over: Partial<CorroboratedSubmissionRow> &
    Pick<CorroboratedSubmissionRow, 'id' | 'eventId' | 'tier' | 'priceMin'>,
): CorroboratedSubmissionRow {
  return { vendor: 'AXS', ...baseRow, ...over }
}

describe('buildPriceByTierMap', () => {
  it('returns an empty map for no rows', () => {
    expect(buildPriceByTierMap([]).size).toBe(0)
  })

  it('groups rows by event so one event never sees another event tiers', () => {
    const map = buildPriceByTierMap([
      row({ id: 'a', eventId: 'evt-1', tier: 'GA', priceMin: '68' }),
      row({ id: 'b', eventId: 'evt-2', tier: 'GA', priceMin: '12' }),
    ])

    expect(map.size).toBe(2)
    expect(lowestHeadlinePrice(map.get('evt-1') ?? [])).toBe(68)
    expect(lowestHeadlinePrice(map.get('evt-2') ?? [])).toBe(12)
  })

  // This is the Hermanos Gutiérrez case from #1365: the event carries a cheap
  // GA tier and a pricier Reserved tier, and the surfaces that read the
  // denormalized events.ticketPriceMin scalar were showing the Reserved price.
  it('puts the cheapest tier first so the headline is the floor, not an arbitrary tier', () => {
    const blocks = buildPriceByTierMap([
      row({ id: 'a', eventId: 'evt-1', tier: 'Reserved', priceMin: '125' }),
      row({ id: 'b', eventId: 'evt-1', tier: 'GA', priceMin: '68' }),
    ]).get('evt-1')

    expect(blocks?.[0]?.tier).toBe('GA')
    expect(lowestHeadlinePrice(blocks ?? [])).toBe(68)
  })

  it('infers sourceCategory for legacy rows that predate the column', () => {
    const blocks = buildPriceByTierMap([
      row({
        id: 'a',
        eventId: 'evt-1',
        tier: 'GA',
        priceMin: '40',
        vendor: 'VenueBoxOffice',
        sourceCategory: null,
      }),
    ]).get('evt-1')

    expect(blocks?.[0]?.headline?.sourceCategory).toBe('boxoffice')
  })

  it('excludes the submitter from confirmsCount', () => {
    const blocks = buildPriceByTierMap([
      row({
        id: 'a',
        eventId: 'evt-1',
        tier: 'GA',
        priceMin: '40',
        corroborationCount: 1,
      }),
    ]).get('evt-1')

    expect(blocks?.[0]?.headline?.confirmsCount).toBe(0)
  })
})

describe('lowestHeadlinePrice', () => {
  it('is null when there are no blocks', () => {
    expect(lowestHeadlinePrice([])).toBeNull()
  })

  it('skips leading blocks that have no headline', () => {
    const blocks = buildPriceByTierMap([
      row({ id: 'a', eventId: 'evt-1', tier: 'GA', priceMin: '68' }),
    ]).get('evt-1')

    expect(
      lowestHeadlinePrice([
        { ...blocks![0]!, tier: 'Lawn', headline: null },
        blocks![0]!,
      ]),
    ).toBe(68)
  })
})

describe('resolveDisplayPrice', () => {
  const blocks = () =>
    buildPriceByTierMap([
      row({ id: 'a', eventId: 'evt-1', tier: 'GA', priceMin: '68' }),
    ]).get('evt-1') ?? []

  it('prefers the aggregated floor over the scalar', () => {
    expect(resolveDisplayPrice(blocks(), '125.00')).toBe('68.00')
  })

  // Crawler-sourced prices have no corroborated submissions to aggregate, so
  // the scalar is the only price those events have.
  it('falls back to the scalar when nothing is corroborated', () => {
    expect(resolveDisplayPrice([], '125.00')).toBe('125.00')
  })

  it('is null when there is neither a headline nor a scalar', () => {
    expect(resolveDisplayPrice([], null)).toBeNull()
  })

  // The numeric columns are strings with 2 decimals; the aggregated floor has
  // to match or a surface comparing against the scalar sees spurious drift.
  it('formats the aggregated floor to two decimals', () => {
    const map = buildPriceByTierMap([
      row({ id: 'a', eventId: 'evt-1', tier: 'GA', priceMin: '68.5' }),
    ])
    expect(resolveDisplayPrice(map.get('evt-1') ?? [], null)).toBe('68.50')
  })
})

describe('lowestHeadlineObservedAt', () => {
  it('is null when nothing is corroborated', () => {
    expect(lowestHeadlineObservedAt([])).toBeNull()
  })

  // The staleness marker has to age the price a surface actually shows, so the
  // timestamp must come from the same block the headline price does (#1366).
  it('reads the timestamp off the cheapest tier, not an arbitrary one', () => {
    const blocks =
      buildPriceByTierMap([
        row({
          id: 'a',
          eventId: 'evt-1',
          tier: 'Reserved',
          priceMin: '125',
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-01T00:00:00Z'),
        }),
        row({
          id: 'b',
          eventId: 'evt-1',
          tier: 'GA',
          priceMin: '68',
          createdAt: new Date('2026-06-01T00:00:00Z'),
          updatedAt: new Date('2026-06-01T00:00:00Z'),
        }),
      ]).get('evt-1') ?? []

    expect(lowestHeadlinePrice(blocks)).toBe(68)
    expect(lowestHeadlineObservedAt(blocks)).toBe('2026-06-01T00:00:00.000Z')
  })
})

describe('lowestHeadlineSourceCategory', () => {
  it('is null when nothing is corroborated', () => {
    expect(lowestHeadlineSourceCategory([])).toBeNull()
  })

  // Null means "no corroborated submission" — a crawled price, the handoff's
  // `primary`, which renders no chip. It never means "a submission that forgot
  // its category": a legacy null is backfilled by `deriveSourceCategory`, so
  // any headline that exists at all carries one.
  it('still resolves a category when the submission predates the column', () => {
    const blocks =
      buildPriceByTierMap([
        row({
          id: 'a',
          eventId: 'evt-1',
          tier: 'GA',
          priceMin: '68',
          sourceCategory: null,
        }),
      ]).get('evt-1') ?? []

    expect(lowestHeadlineSourceCategory(blocks)).not.toBeNull()
  })

  it('reads boxoffice off the cheapest tier', () => {
    const blocks =
      buildPriceByTierMap([
        row({
          id: 'a',
          eventId: 'evt-1',
          tier: 'GA',
          priceMin: '68',
          sourceCategory: 'boxoffice',
        }),
      ]).get('evt-1') ?? []

    expect(lowestHeadlineSourceCategory(blocks)).toBe('boxoffice')
  })

  // The chip must describe the price beside it. All three helpers read the same
  // headline, so they can never disagree about which price they are describing
  // — the bug this replaces sourced the price and its provenance separately.
  it('describes the same block lowestHeadlinePrice picked', () => {
    const blocks =
      buildPriceByTierMap([
        row({
          id: 'a',
          eventId: 'evt-1',
          tier: 'Reserved',
          priceMin: '125',
          sourceCategory: 'resale',
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-01T00:00:00Z'),
        }),
        row({
          id: 'b',
          eventId: 'evt-1',
          tier: 'GA',
          priceMin: '68',
          sourceCategory: 'boxoffice',
          createdAt: new Date('2026-06-01T00:00:00Z'),
          updatedAt: new Date('2026-06-01T00:00:00Z'),
        }),
      ]).get('evt-1') ?? []

    expect(lowestHeadlinePrice(blocks)).toBe(68)
    expect(lowestHeadlineObservedAt(blocks)).toBe('2026-06-01T00:00:00.000Z')
    expect(lowestHeadlineSourceCategory(blocks)).toBe('boxoffice')
  })
})
