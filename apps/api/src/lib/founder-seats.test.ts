// Unit tests for parseFounderSeatNumber (restoreFounderSeat is DB-backed and
// covered by the webhook + billing-manage integration suites).

import { describe, it, expect } from 'vitest'
import { parseFounderSeatNumber } from './founder-seats.js'

describe('parseFounderSeatNumber', () => {
  it('parses the stamped seat number', () => {
    expect(parseFounderSeatNumber({ founderSeatNumber: '42' })).toBe(42)
  })

  it('returns null when metadata is absent', () => {
    expect(parseFounderSeatNumber(null)).toBeNull()
    expect(parseFounderSeatNumber(undefined)).toBeNull()
  })

  it('returns null when the key is missing', () => {
    expect(parseFounderSeatNumber({ userId: 'user_1' })).toBeNull()
  })

  it('returns null for a non-numeric value', () => {
    expect(
      parseFounderSeatNumber({ founderSeatNumber: 'not-a-number' }),
    ).toBeNull()
  })
})
