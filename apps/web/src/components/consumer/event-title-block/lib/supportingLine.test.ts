import { describe, expect, it } from 'vitest'
import { formatMoreCount, supportingA11yLabel } from './supportingLine'

describe('supportingA11yLabel', () => {
  it('returns empty string for no artists', () => {
    expect(supportingA11yLabel('with', [])).toBe('')
  })
  it('handles one artist', () => {
    expect(supportingA11yLabel('with', ['Hotline TNT'])).toBe(
      'with Hotline TNT',
    )
  })
  it('handles two artists', () => {
    expect(supportingA11yLabel('with', ['A', 'B'])).toBe('with A and B')
  })
  it('handles three or more with Oxford comma', () => {
    expect(supportingA11yLabel('with', ['A', 'B', 'C'])).toBe(
      'with A, B, and C',
    )
  })
})

describe('formatMoreCount', () => {
  it('formats the overflow tail', () => {
    expect(formatMoreCount(3)).toBe('+3 more')
  })
})
