import { describe, expect, it } from 'vitest'
import { classifyMissing } from './classify-missing'

describe('classifyMissing', () => {
  it('returns duplicate when a live sibling exists, regardless of horizon', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: true,
      }),
    ).toBe('duplicate')
  })

  it('returns crawl_gap when the event is beyond the venue horizon', () => {
    expect(
      classifyMissing({
        date: '2026-12-15',
        venueHorizon: '2026-11-30',
        hasLiveSibling: false,
      }),
    ).toBe('crawl_gap')
  })

  it('returns crawl_gap when the venue has no currently-seen future events', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: null,
        hasLiveSibling: false,
      }),
    ).toBe('crawl_gap')
  })

  it('returns removed when the crawl reaches past this date but dropped the show', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
      }),
    ).toBe('removed')
  })

  it('treats an event on the horizon date itself as removed', () => {
    expect(
      classifyMissing({
        date: '2026-12-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
      }),
    ).toBe('removed')
  })
})
