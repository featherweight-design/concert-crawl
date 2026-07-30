import { describe, it, expect } from 'vitest'
import type { HistoryShow } from '@concert-crawl/types'
import { groupHistoryByMonth } from './buckets'

const show = (eventId: string, date: string): HistoryShow => ({
  eventId,
  artist: 'Wednesday',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: null,
  date,
  dateLabel: date,
  showTime: null,
  priceFinal: null,
  genre: null,
  attendingAt: `${date}T02:00:00.000Z`,
})

const currentYear = new Date().getFullYear()

describe('groupHistoryByMonth', () => {
  it('returns no buckets for no shows', () => {
    expect(groupHistoryByMonth([])).toEqual([])
  })

  it('groups shows in the same month into one bucket', () => {
    const buckets = groupHistoryByMonth([
      show('a', `${currentYear}-05-14`),
      show('bb', `${currentYear}-05-02`),
    ])

    expect(buckets).toHaveLength(1)
    expect(buckets[0]?.shows.map((row) => row.eventId)).toEqual(['a', 'bb'])
  })

  it('preserves the API order rather than re-sorting', () => {
    // The API already returns newest-first; the grouper must not reverse it.
    const buckets = groupHistoryByMonth([
      show('may', `${currentYear}-05-14`),
      show('mar', `${currentYear}-03-01`),
      show('jan', `${currentYear}-01-18`),
    ])

    expect(buckets.map((bucket) => bucket.shows[0]?.eventId)).toEqual([
      'may',
      'mar',
      'jan',
    ])
  })

  it('omits the year from the label in the current year', () => {
    const buckets = groupHistoryByMonth([show('a', `${currentYear}-05-14`)])

    expect(buckets[0]?.label).toBe('May')
  })

  it('appends the year once it is not the current one', () => {
    const past = currentYear - 2
    const buckets = groupHistoryByMonth([show('a', `${past}-05-14`)])

    expect(buckets[0]?.label).toBe(`May ${past}`)
  })

  it('keeps the same month in different years apart', () => {
    const buckets = groupHistoryByMonth([
      show('a', `${currentYear}-05-14`),
      show('bb', `${currentYear - 1}-05-14`),
    ])

    expect(buckets).toHaveLength(2)
    expect(new Set(buckets.map((bucket) => bucket.key)).size).toBe(2)
  })

  it('labels a first-of-month date as that month, not the one before', () => {
    // Guards the UTC day-slide: parsing '2026-05-01' as UTC then rendering in
    // Mountain Time lands on April 30.
    const buckets = groupHistoryByMonth([show('a', `${currentYear}-05-01`)])

    expect(buckets[0]?.label).toBe('May')
  })
})
