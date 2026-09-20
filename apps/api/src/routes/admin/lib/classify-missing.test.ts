import { describe, expect, it } from 'vitest'
import { classifyMissing } from './classify-missing'

describe('classifyMissing', () => {
  it('returns duplicate when a live sibling exists, regardless of horizon', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: true,
        movedCandidateId: null,
      }),
    ).toBe('duplicate')
  })

  it('returns crawl_gap when the event is beyond the venue horizon', () => {
    expect(
      classifyMissing({
        date: '2026-12-15',
        venueHorizon: '2026-11-30',
        hasLiveSibling: false,
        movedCandidateId: null,
      }),
    ).toBe('crawl_gap')
  })

  it('returns crawl_gap when the venue has no currently-seen future events', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: null,
        hasLiveSibling: false,
        movedCandidateId: null,
      }),
    ).toBe('crawl_gap')
  })

  it('returns removed when the crawl reaches past this date but dropped the show', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
        movedCandidateId: null,
      }),
    ).toBe('removed')
  })

  it('treats an event on the horizon date itself as removed', () => {
    expect(
      classifyMissing({
        date: '2026-12-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
        movedCandidateId: null,
      }),
    ).toBe('removed')
  })

  it('returns moved when a relocation candidate was matched', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
        movedCandidateId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toBe('moved')
  })

  it('prefers duplicate over moved when both signals fire', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: true,
        movedCandidateId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toBe('duplicate')
  })

  it('prefers moved over crawl_gap when the event is beyond the horizon', () => {
    expect(
      classifyMissing({
        date: '2026-12-15',
        venueHorizon: '2026-11-30',
        hasLiveSibling: false,
        movedCandidateId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toBe('moved')
  })

  it('prefers moved over crawl_gap when the venue horizon is unknown', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: null,
        hasLiveSibling: false,
        movedCandidateId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toBe('moved')
  })
})
