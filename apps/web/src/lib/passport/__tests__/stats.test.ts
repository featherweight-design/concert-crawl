import { describe, expect, it } from 'vitest'
import { passportStats, type AttendedShow } from '../stats'

const show = (over: Partial<AttendedShow> = {}): AttendedShow => ({
  id: 'show-1',
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  genre: 'punk',
  date: '2026-03-14',
  priceFinal: 28,
  ...over,
})

describe('passportStats', () => {
  it('reports a zeroed passport for somebody with no attended shows', () => {
    expect(passportStats([])).toEqual({
      nights: 0,
      venues: 0,
      artists: 0,
      topGenre: null,
      topVenue: null,
      first: null,
      last: null,
      totalSpent: 0,
    })
  })

  it('counts a single night as its own first and last', () => {
    const only = show()
    const stats = passportStats([only])

    expect(stats.nights).toBe(1)
    expect(stats.venues).toBe(1)
    expect(stats.artists).toBe(1)
    expect(stats.first).toBe(only)
    expect(stats.last).toBe(only)
    expect(stats.topGenre).toEqual({ name: 'punk', count: 1 })
  })

  it('counts distinct venues and artists, not rows', () => {
    const stats = passportStats([
      show({ id: '1', artist: 'A', venue: 'Bluebird' }),
      show({ id: '2', artist: 'A', venue: 'Bluebird' }),
      show({ id: '3', artist: 'B', venue: 'Ogden' }),
    ])

    expect(stats.nights).toBe(3)
    expect(stats.artists).toBe(2)
    expect(stats.venues).toBe(2)
  })

  // The card prints one genre, so a tie has to resolve to something stable —
  // otherwise the same history renders a different passport on each request.
  it('breaks a top-genre tie toward the first one seen', () => {
    const stats = passportStats([
      show({ id: '1', genre: 'punk' }),
      show({ id: '2', genre: 'jazz' }),
    ])

    expect(stats.topGenre).toEqual({ name: 'punk', count: 1 })
  })

  it('picks the genre with the most nights regardless of order', () => {
    const stats = passportStats([
      show({ id: '1', genre: 'punk' }),
      show({ id: '2', genre: 'jazz' }),
      show({ id: '3', genre: 'jazz' }),
    ])

    expect(stats.topGenre).toEqual({ name: 'jazz', count: 2 })
  })

  // A missing genre is an absence, not a category. The prototype tallied it and
  // could print "null" as somebody's top genre.
  it('never lets an unknown genre become the top genre', () => {
    const stats = passportStats([
      show({ id: '1', genre: null }),
      show({ id: '2', genre: null }),
      show({ id: '3', genre: 'punk' }),
    ])

    expect(stats.topGenre).toEqual({ name: 'punk', count: 1 })
  })

  it('reports no top genre when nothing is genred', () => {
    expect(passportStats([show({ genre: null })]).topGenre).toBeNull()
  })

  it('orders first and last by date, not by input order', () => {
    const early = show({ id: '1', date: '2025-01-05' })
    const late = show({ id: '2', date: '2026-11-30' })
    const stats = passportStats([late, early])

    expect(stats.first).toBe(early)
    expect(stats.last).toBe(late)
  })

  // A double-header shares a date, so the extremes are decided by input order.
  // Locked because the min/max pass replaced a stable sort, and an inverted
  // comparison would silently swap which of the two the footer dates from.
  it('resolves a shared date toward the outermost row of the input', () => {
    const opener = show({ id: '1', date: '2026-03-14' })
    const headliner = show({ id: '2', date: '2026-03-14' })
    const stats = passportStats([opener, headliner])

    expect(stats.first).toBe(opener)
    expect(stats.last).toBe(headliner)
  })

  it('sums only the nights whose price is known', () => {
    const stats = passportStats([
      show({ id: '1', priceFinal: 28 }),
      show({ id: '2', priceFinal: null }),
      show({ id: '3', priceFinal: 12.5 }),
    ])

    expect(stats.totalSpent).toBe(40.5)
  })

  it('leaves the caller list untouched while sorting', () => {
    const list = [
      show({ id: '2', date: '2026-11-30' }),
      show({ id: '1', date: '2025-01-05' }),
    ]
    passportStats(list)

    expect(list.map((entry) => entry.id)).toEqual(['2', '1'])
  })
})
