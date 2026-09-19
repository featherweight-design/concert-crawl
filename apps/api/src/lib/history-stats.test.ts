import { describe, it, expect } from 'vitest'
import type { HistoryShow } from '@concert-crawl/types'
import { computeHistoryStats } from './history-stats.js'

const show = (overrides: Partial<HistoryShow> = {}): HistoryShow => ({
  eventId: 'evt-1',
  artist: 'Khruangbin',
  artistPhotoUrl: null,
  venueName: 'Ogden Theatre',
  venueSlug: 'ogden-theatre',
  neighborhood: 'Capitol Hill',
  date: '2026-06-01',
  dateLabel: 'Mon, Jun 1',
  showTime: '8:00 PM',
  priceFinal: 45,
  genre: 'psych',
  attendingAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

describe('computeHistoryStats', () => {
  it('returns zeros and nulls for an empty history', () => {
    expect(computeHistoryStats([])).toEqual({
      nights: 0,
      venues: 0,
      artists: 0,
      topGenre: null,
      topVenue: null,
      first: null,
      last: null,
      totalSpent: null,
    })
  })

  it('summarizes a single show', () => {
    expect(computeHistoryStats([show()])).toEqual({
      nights: 1,
      venues: 1,
      artists: 1,
      topGenre: 'psych',
      topVenue: 'Ogden Theatre',
      first: '2026-06-01',
      last: '2026-06-01',
      totalSpent: 45,
    })
  })

  it('counts distinct venues and artists, not rows', () => {
    const stats = computeHistoryStats([
      show({ eventId: 'a', date: '2026-06-01' }),
      show({ eventId: 'b', date: '2026-06-02' }),
      show({
        eventId: 'c',
        artist: 'Idles',
        venueName: 'Bluebird Theater',
        venueSlug: 'bluebird-theater',
        date: '2026-06-03',
      }),
    ])
    expect(stats.nights).toBe(3)
    expect(stats.venues).toBe(2)
    expect(stats.artists).toBe(2)
  })

  it('breaks a genre tie by most recent attendance', () => {
    const stats = computeHistoryStats([
      show({
        eventId: 'a',
        genre: 'punk',
        attendingAt: '2026-05-10T00:00:00.000Z',
      }),
      show({
        eventId: 'b',
        genre: 'psych',
        attendingAt: '2026-05-01T00:00:00.000Z',
      }),
    ])
    expect(stats.topGenre).toBe('punk')
  })

  it('prefers the higher count over recency', () => {
    const stats = computeHistoryStats([
      show({
        eventId: 'a',
        genre: 'punk',
        attendingAt: '2026-05-10T00:00:00.000Z',
      }),
      show({
        eventId: 'b',
        genre: 'psych',
        attendingAt: '2026-05-02T00:00:00.000Z',
      }),
      show({
        eventId: 'c',
        genre: 'psych',
        attendingAt: '2026-05-01T00:00:00.000Z',
      }),
    ])
    expect(stats.topGenre).toBe('psych')
  })

  it('ignores null genres when picking the top one', () => {
    const stats = computeHistoryStats([
      show({ eventId: 'a', genre: null }),
      show({ eventId: 'b', genre: null }),
      show({ eventId: 'c', genre: 'folk' }),
    ])
    expect(stats.topGenre).toBe('folk')
  })

  it('returns null topGenre when no show carries one', () => {
    expect(computeHistoryStats([show({ genre: null })]).topGenre).toBeNull()
  })

  it('returns null totalSpent when every price is null', () => {
    const stats = computeHistoryStats([
      show({ eventId: 'a', priceFinal: null }),
      show({ eventId: 'b', priceFinal: null }),
    ])
    expect(stats.totalSpent).toBeNull()
  })

  it('sums only the non-null prices', () => {
    const stats = computeHistoryStats([
      show({ eventId: 'a', priceFinal: 45 }),
      show({ eventId: 'b', priceFinal: null }),
      show({ eventId: 'c', priceFinal: 30.5 }),
    ])
    expect(stats.totalSpent).toBe(75.5)
  })

  it('reports the earliest and latest show dates regardless of input order', () => {
    const stats = computeHistoryStats([
      show({ eventId: 'a', date: '2026-06-10' }),
      show({ eventId: 'b', date: '2026-01-02' }),
      show({ eventId: 'c', date: '2026-03-05' }),
    ])
    expect(stats.first).toBe('2026-01-02')
    expect(stats.last).toBe('2026-06-10')
  })
})
