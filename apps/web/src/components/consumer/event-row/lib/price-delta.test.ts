import { describe, it, expect } from 'vitest'
import { deltaClass } from './price-delta'

describe('deltaClass', () => {
  it('reads a real fall as a drop and a real rise as a spike', () => {
    expect(deltaClass(-12)).toBe('drop')
    expect(deltaClass(12)).toBe('spike')
  })

  it('calls a move of a dollar or two flat in both directions', () => {
    expect(deltaClass(0)).toBe('flat')
    expect(deltaClass(-1.99)).toBe('flat')
    expect(deltaClass(1.99)).toBe('flat')
  })

  it('puts the band edge itself on the reporting side', () => {
    expect(deltaClass(-2)).toBe('drop')
    expect(deltaClass(2)).toBe('spike')
  })
})
