import { describe, it, expect } from 'vitest'
import { rowChips, chipBudget } from './row-chips'
import type { EventRowShow } from './row-model'

const HOUR = 60 * 60 * 1000

function makeShow(partial: Partial<EventRowShow> = {}): EventRowShow {
  return {
    id: 'evt-1',
    headliner: 'Test Artist',
    fallbackTitle: 'Test Artist at Test Ballroom',
    supports: [],
    tourName: null,
    imageUrl: null,
    artistPhotoUrl: null,
    venueName: 'Test',
    venueSlug: 'test',
    dateLabel: 'Sat, Aug 15',
    timeLabel: '8:00 PM',
    price: null,
    saved: null,
    genres: [],
    isFollowed: false,
    crewGoing: null,
    isWatching: false,
    status: 'live',
    lifecycle: 'upcoming',
    ...partial,
  }
}

function priceObservedHoursAgo(hours: number, source: 'boxoffice' | null) {
  return {
    amount: 68,
    isFloor: true,
    source,
    observedAt: new Date(Date.now() - hours * HOUR).toISOString(),
  }
}

describe('rowChips', () => {
  it('offers nothing when the row has no claim to make', () => {
    expect(rowChips(makeShow(), 'browse')).toEqual([])
  })

  it('puts Following ahead of genre on Browse', () => {
    const chips = rowChips(
      makeShow({ isFollowed: true, genres: ['rock', 'punk'] }),
      'browse',
    )
    expect(chips.map((chip) => chip.key)).toEqual(['following', 'genre-rock'])
  })

  it('offers no provenance or freshness on Browse, whatever the price', () => {
    const chips = rowChips(
      makeShow({ price: priceObservedHoursAgo(48, 'boxoffice') }),
      'browse',
    )
    expect(chips).toEqual([])
  })

  it('puts freshness ahead of provenance on Watching', () => {
    const chips = rowChips(
      makeShow({ price: priceObservedHoursAgo(48, 'boxoffice') }),
      'watching',
    )
    expect(chips.map((chip) => chip.key)).toEqual(['freshness', 'provenance'])
  })

  it('offers no freshness chip for a price observed inside the stale window', () => {
    const chips = rowChips(
      makeShow({ price: priceObservedHoursAgo(2, 'boxoffice') }),
      'watching',
    )
    expect(chips.map((chip) => chip.key)).toEqual(['provenance'])
  })

  it('offers no provenance for a crawled price, which has none', () => {
    const chips = rowChips(
      makeShow({ price: priceObservedHoursAgo(2, null) }),
      'watching',
    )
    expect(chips).toEqual([])
  })

  it('labels provenance the way admin does, and tones resale as a warning', () => {
    const [chip] = rowChips(
      makeShow({ price: priceObservedHoursAgo(2, 'boxoffice') }),
      'watching',
    )
    expect(chip?.label).toBe('Box office')
    expect(chip?.tone).toBe('strong')
  })

  it('carries the provenance meaning for screen readers, not just the label', () => {
    const [chip] = rowChips(
      makeShow({ price: priceObservedHoursAgo(2, 'boxoffice') }),
      'watching',
    )
    expect(chip?.srLabel).toBe('Price source: Box office')
  })

  it('offers no crew chip on a surface with no crew context', () => {
    const chips = rowChips(
      makeShow({ crewGoing: { count: 2, names: ['ada'] } }),
      'browse',
    )
    expect(chips).toEqual([])
  })

  it('takes the first chip slot when a crew is going, dropping genre', () => {
    const chips = rowChips(
      makeShow({
        isFollowed: true,
        genres: ['rock'],
        crewGoing: { count: 3, names: ['ada', 'gil'] },
      }),
      'crewLens',
    )
    expect(chips.map((chip) => chip.key).slice(0, 2)).toEqual([
      'crew',
      'following',
    ])
    expect(chips[0]?.label).toBe('3 going')
    expect(chips[0]?.tone).toBe('signal')
  })

  it('keeps Following first on a crew row with no crew presence', () => {
    const chips = rowChips(
      makeShow({ isFollowed: true, genres: ['rock'], crewGoing: null }),
      'crewLens',
    )
    expect(chips.map((chip) => chip.key)).toEqual(['following', 'genre-rock'])
  })

  it('offers no crew chip when nobody in the crew is going', () => {
    const chips = rowChips(
      makeShow({ crewGoing: { count: 0, names: [] } }),
      'crew',
    )
    expect(chips).toEqual([])
  })

  it('names the crew for screen readers, and counts those it cannot name', () => {
    const [chip] = rowChips(
      makeShow({ crewGoing: { count: 3, names: ['ada', 'gil'] } }),
      'crew',
    )
    expect(chip?.srLabel).toBe('From your crews: ada, gil and 1 more going')
  })
})

describe('chipBudget', () => {
  it('spends the second slot on the support line when there is one', () => {
    expect(chipBudget(false)).toBe(2)
    expect(chipBudget(true)).toBe(1)
  })
})
