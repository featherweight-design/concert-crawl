import { describe, it, expect } from 'vitest'
import {
  buildBatches,
  formatCsvRow,
} from './2026-06-19-non-concert-backfill.js'

describe('non-concert-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events = Array.from({ length: 53 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `Artist ${idx}`,
      description: null,
      date: '2026-08-01',
      venueName: 'Test Venue',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3) // 25 + 25 + 3
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns single batch when input fits in one batch', () => {
    const events = Array.from({ length: 10 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `A`,
      description: null,
      date: '2026-08-01',
      venueName: 'V',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(10)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('non-concert-backfill — formatCsvRow', () => {
  it('quotes fields containing commas', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show, with, commas',
      artist: 'Artist A',
      date: '2026-08-01',
      venueName: 'Venue Name',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show "with" quotes',
      artist: 'Artist',
      date: '2026-08-01',
      venueName: 'Venue',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('marks wouldChange=true when currentHidden differs from llmIsConcert', () => {
    // currentHidden=false + llmIsConcert=false → would change (hide)
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Bingo Night',
      artist: 'BASS BINGO',
      date: '2026-08-01',
      venueName: 'Larimer',
      currentHidden: false,
      llmIsConcert: false,
      wouldChange: true,
    })
    expect(row).toContain(',true\n')
  })
})
