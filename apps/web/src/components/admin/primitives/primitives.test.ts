import { describe, it, expect } from 'vitest'
import { formatCost, confidenceColor } from './utils'

describe('formatCost', () => {
  it('formats zero as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00')
  })
  it('formats positive value with 2 decimal places', () => {
    expect(formatCost(28.7)).toBe('$28.70')
    expect(formatCost(28.74)).toBe('$28.74')
  })
  it('formats sub-cent values rounded', () => {
    expect(formatCost(0.001)).toBe('$0.00')
    expect(formatCost(0.005)).toBe('$0.01')
  })
})

describe('confidenceColor', () => {
  it('returns success for >= 0.80', () => {
    expect(confidenceColor(0.8)).toBe('success')
    expect(confidenceColor(1.0)).toBe('success')
  })
  it('returns signal for >= 0.70', () => {
    expect(confidenceColor(0.7)).toBe('signal')
    expect(confidenceColor(0.79)).toBe('signal')
  })
  it('returns warning for >= 0.60', () => {
    expect(confidenceColor(0.6)).toBe('warning')
    expect(confidenceColor(0.69)).toBe('warning')
  })
  it('returns danger for < 0.60', () => {
    expect(confidenceColor(0.59)).toBe('danger')
    expect(confidenceColor(0)).toBe('danger')
  })
})
