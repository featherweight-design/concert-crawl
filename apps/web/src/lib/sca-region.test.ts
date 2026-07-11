import { describe, it, expect } from 'vitest'
import { isScaRegion } from './sca-region'

describe('isScaRegion', () => {
  it('is true for EEA members', () => {
    expect(isScaRegion('DE')).toBe(true)
    expect(isScaRegion('FR')).toBe(true)
    expect(isScaRegion('NO')).toBe(true)
    expect(isScaRegion('IS')).toBe(true)
    expect(isScaRegion('LI')).toBe(true)
  })

  it('is true for the UK', () => {
    expect(isScaRegion('GB')).toBe(true)
  })

  it('is false for non-SCA countries', () => {
    expect(isScaRegion('US')).toBe(false)
    expect(isScaRegion('CA')).toBe(false)
    expect(isScaRegion('AU')).toBe(false)
  })

  it('fails safe to true when the country is unknown', () => {
    expect(isScaRegion(null)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isScaRegion('gb')).toBe(true)
    expect(isScaRegion('us')).toBe(false)
  })
})
