import { describe, expect, it } from 'vitest'
import { parseMovedCandidate } from './moved-candidate'

const ID = '11111111-1111-4111-8111-111111111111'

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  reason: 'date',
  title: 'Moved Artist Live',
  date: '2026-10-12',
  venueName: 'Bluebird Theater',
  ...overrides,
})

describe('parseMovedCandidate', () => {
  it('accepts a date-move candidate', () => {
    expect(parseMovedCandidate(candidate())).toEqual({
      id: ID,
      reason: 'date',
      title: 'Moved Artist Live',
      date: '2026-10-12',
      venueName: 'Bluebird Theater',
    })
  })

  it('accepts a venue-move candidate', () => {
    expect(parseMovedCandidate(candidate({ reason: 'venue' }))?.reason).toBe(
      'venue',
    )
  })

  // A venue row can be missing its join, so the name is nullable rather than
  // absent — the confirm dialog renders a placeholder for it.
  it('accepts a candidate whose venue name is null', () => {
    expect(parseMovedCandidate(candidate({ venueName: null }))).toMatchObject({
      venueName: null,
    })
  })

  it('returns null when the matcher found nothing', () => {
    expect(parseMovedCandidate(null)).toBeNull()
    expect(parseMovedCandidate(undefined)).toBeNull()
  })

  // An unrecognised shape degrades to "no suggestion" rather than reaching an
  // admin who is about to merge user watch rows onto it.
  it('returns null for an unknown reason', () => {
    expect(parseMovedCandidate(candidate({ reason: 'lineup' }))).toBeNull()
  })

  it('returns null when the id is not a uuid', () => {
    expect(parseMovedCandidate(candidate({ id: 'not-a-uuid' }))).toBeNull()
  })

  // The confirm dialog names the show it is about to merge onto, so a payload
  // that cannot name it must not produce a confirmable suggestion.
  it('returns null when the naming fields are missing', () => {
    expect(parseMovedCandidate({ id: ID, reason: 'date' })).toBeNull()
    expect(parseMovedCandidate(candidate({ title: undefined }))).toBeNull()
    expect(parseMovedCandidate(candidate({ date: 42 }))).toBeNull()
  })

  it('returns null for a wrongly-typed row', () => {
    expect(parseMovedCandidate('date')).toBeNull()
    expect(parseMovedCandidate(42)).toBeNull()
  })
})
