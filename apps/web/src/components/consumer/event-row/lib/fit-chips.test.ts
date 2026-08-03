import { describe, it, expect } from 'vitest'
import { fitChips } from './fit-chips'

describe('fitChips', () => {
  it('keeps every chip when they all fit', () => {
    expect(fitChips([40, 50], 200, 5)).toBe(2)
  })

  it('counts the gap between chips, not before the first', () => {
    // 40 + 5 + 50 = 95. A 94px column cannot take the second chip.
    expect(fitChips([40, 50], 95, 5)).toBe(2)
    expect(fitChips([40, 50], 94, 5)).toBe(1)
  })

  it('drops the whole chip rather than slicing it', () => {
    expect(fitChips([80, 80], 120, 5)).toBe(1)
  })

  it('drops everything when even the first chip overflows', () => {
    expect(fitChips([120], 80, 5)).toBe(0)
  })

  it('tolerates sub-pixel layout rounding', () => {
    expect(fitChips([100.4], 100, 5)).toBe(1)
    expect(fitChips([100.6], 100, 5)).toBe(0)
  })

  it('keeps every chip before layout has happened', () => {
    // A zero-width box is "not measured yet", not "nothing fits" — returning 0
    // would flash the meta line empty on first paint.
    expect(fitChips([40, 50], 0, 5)).toBe(2)
  })

  it("drops provenance when Stale alone fills a 320 row's meta column", () => {
    // The handoff's stated consequence: freshness outranks provenance, and
    // `Stale · 9d ago` (~96px) fills the tightest measured meta column (106px),
    // so `Box office` (~81px) drops.
    expect(fitChips([96, 81], 106, 5)).toBe(1)
  })
})
