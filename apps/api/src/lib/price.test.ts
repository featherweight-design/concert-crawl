import { describe, it, expect } from 'vitest'
import { parsePrice } from './price'

describe('parsePrice', () => {
  it('reads a numeric string', () => {
    expect(parsePrice('28')).toBe(28)
    expect(parsePrice('28.50')).toBe(28.5)
    expect(parsePrice('0')).toBe(0)
  })

  // Absent, empty and unparseable all read "Price TBD" downstream, so they must
  // collapse to one value rather than leaking NaN into a JSON response.
  it('returns null for anything that is not a number', () => {
    expect(parsePrice(null)).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('free')).toBeNull()
  })

  // Postgres numerics arrive as strings and the crawler stores what the venue
  // wrote, which is not always bare digits.
  it('takes the leading number when a currency symbol trails it', () => {
    expect(parsePrice('28 and up')).toBe(28)
  })
})
