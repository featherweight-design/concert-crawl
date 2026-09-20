import { describe, expect, it } from 'vitest'
import { parseMovedCandidate } from './moved-candidate'

const ID = '11111111-1111-4111-8111-111111111111'

describe('parseMovedCandidate', () => {
  it('accepts a date-move candidate', () => {
    expect(parseMovedCandidate({ id: ID, reason: 'date' })).toEqual({
      id: ID,
      reason: 'date',
    })
  })

  it('accepts a venue-move candidate', () => {
    expect(parseMovedCandidate({ id: ID, reason: 'venue' })).toEqual({
      id: ID,
      reason: 'venue',
    })
  })

  it('returns null when the matcher found nothing', () => {
    expect(parseMovedCandidate(null)).toBeNull()
    expect(parseMovedCandidate(undefined)).toBeNull()
  })

  // An unrecognised shape degrades to "no suggestion" rather than reaching an
  // admin who is about to merge user watch rows onto it.
  it('returns null for an unknown reason', () => {
    expect(parseMovedCandidate({ id: ID, reason: 'lineup' })).toBeNull()
  })

  it('returns null when the id is not a uuid', () => {
    expect(parseMovedCandidate({ id: 'not-a-uuid', reason: 'date' })).toBeNull()
  })

  it('returns null for a partial or wrongly-typed row', () => {
    expect(parseMovedCandidate({ id: ID })).toBeNull()
    expect(parseMovedCandidate({ reason: 'date' })).toBeNull()
    expect(parseMovedCandidate('date')).toBeNull()
    expect(parseMovedCandidate(42)).toBeNull()
  })
})
