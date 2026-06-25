import { describe, it, expect, vi } from 'vitest'
import {
  buildBatches,
  formatCsvRow,
  type EventForClassification,
  type ClassificationResult,
} from './2026-06-24-isconcert-review-needed-backfill-helpers.js'

describe('isconcert-review-needed-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events: EventForClassification[] = Array.from(
      { length: 53 },
      (_, idx) => ({
        id: `evt-${idx}`,
        title: `Show ${idx}`,
        artist: `Artist ${idx}`,
        description: null,
        date: '2026-08-01',
        venueName: 'Test Venue',
        currentHidden: true,
        currentReviewNeeded: false,
      }),
    )
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('isconcert-review-needed-backfill — formatCsvRow', () => {
  const baseResult: ClassificationResult = {
    eventId: 'abc-123',
    title: 'Borderline Show',
    artist: 'PRESIDENT',
    date: '2026-08-01',
    venueName: 'Test Venue',
    currentHiddenFromConsumer: true,
    llmIsConcert: true,
    llmReviewNeeded: true,
    action: 'disagrees-with-prior',
  }

  it('quotes fields containing commas', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show, with, commas' })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show "with" quotes' })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('includes the action label in the trailing column', () => {
    const row = formatCsvRow({ ...baseResult, action: 'flag-for-review' })
    expect(row.trimEnd().endsWith(',flag-for-review')).toBe(true)
  })
})
