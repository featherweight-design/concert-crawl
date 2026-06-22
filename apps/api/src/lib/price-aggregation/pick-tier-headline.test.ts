import { describe, expect, it } from 'vitest'
import { pickTierHeadline, type TierRow } from './pick-tier-headline.js'

const row = (overrides: Partial<TierRow>): TierRow => ({
  id: overrides.id ?? 'row-1',
  priceMin: overrides.priceMin ?? '30',
  priceMax: overrides.priceMax ?? null,
  vendor: overrides.vendor ?? 'Ticketmaster',
  sourceCategory: overrides.sourceCategory ?? 'standard',
  userId: overrides.userId ?? 'user-1',
  createdAt: overrides.createdAt ?? new Date('2026-06-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-06-01T00:00:00Z'),
})

describe('pickTierHeadline', () => {
  it('returns null for empty input', () => {
    expect(pickTierHeadline([])).toBeNull()
  })

  it('prefers boxoffice over standard regardless of price', () => {
    const standardCheap = row({
      id: 'std',
      sourceCategory: 'standard',
      priceMin: '15',
    })
    const boxoffice = row({
      id: 'bo',
      sourceCategory: 'boxoffice',
      vendor: 'VenueBoxOffice',
      priceMin: '40',
    })
    expect(pickTierHeadline([standardCheap, boxoffice])?.id).toBe('bo')
  })

  it('prefers standard over resale regardless of price', () => {
    const resaleCheap = row({
      id: 'resale',
      sourceCategory: 'resale',
      priceMin: '20',
    })
    const standardExpensive = row({
      id: 'std',
      sourceCategory: 'standard',
      priceMin: '45',
    })
    expect(pickTierHeadline([resaleCheap, standardExpensive])?.id).toBe('std')
  })

  it('among same source-category, prefers lower priceMin', () => {
    const cheaper = row({ id: 'cheap', priceMin: '25' })
    const pricier = row({ id: 'pricey', priceMin: '40' })
    expect(pickTierHeadline([pricier, cheaper])?.id).toBe('cheap')
  })

  it('tie-breaks equal priceMin by newest updatedAt', () => {
    const older = row({
      id: 'old',
      priceMin: '30',
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    })
    const newer = row({
      id: 'new',
      priceMin: '30',
      updatedAt: new Date('2026-06-15T00:00:00Z'),
    })
    expect(pickTierHeadline([older, newer])?.id).toBe('new')
  })

  it('treats null source-category as standard (trust = 1)', () => {
    const nullSource = row({
      id: 'null-src',
      sourceCategory: null,
      priceMin: '25',
    })
    const resale = row({
      id: 'resale',
      sourceCategory: 'resale',
      priceMin: '15',
    })
    expect(pickTierHeadline([nullSource, resale])?.id).toBe('null-src')
  })

  it('handles parseFloat comparison correctly for string priceMin', () => {
    const nine = row({ id: 'nine', priceMin: '9' })
    const ten = row({ id: 'ten', priceMin: '10' })
    expect(pickTierHeadline([ten, nine])?.id).toBe('nine')
  })
})
