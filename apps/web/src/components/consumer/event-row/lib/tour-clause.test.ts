import { describe, it, expect } from 'vitest'
import { tourClauseFits } from './tour-clause'

const GAP = 7

describe('tourClauseFits', () => {
  it('keeps the clause when the headliner, the gap and the clause all fit', () => {
    expect(tourClauseFits(120, 60, 200, GAP)).toBe(true)
  })

  it('drops the clause when the pair overruns the column', () => {
    expect(tourClauseFits(120, 60, 180, GAP)).toBe(false)
  })

  it('counts the gap, so a pair that fits only without it is refused', () => {
    // 120 + 60 = 180 exactly; the 7px gap is what pushes it over.
    expect(tourClauseFits(120, 60, 180.5, GAP)).toBe(false)
    expect(tourClauseFits(120, 60, 187, GAP)).toBe(true)
  })

  it('refuses the clause when the headliner alone overruns the column', () => {
    // The headliner truncates on its own; it never gives up more width to a
    // tour name.
    expect(tourClauseFits(400, 10, 200, GAP)).toBe(false)
  })

  it('tolerates half a pixel of layout rounding', () => {
    expect(tourClauseFits(100, 50, 156.5, GAP)).toBe(true)
    expect(tourClauseFits(100, 50, 156.4, GAP)).toBe(false)
  })

  it('renders optimistically before layout, when the column measures zero', () => {
    expect(tourClauseFits(500, 500, 0, GAP)).toBe(true)
    expect(tourClauseFits(500, 500, -1, GAP)).toBe(true)
  })

  it('is unaffected by a zero-width clause, which always fits', () => {
    expect(tourClauseFits(100, 0, 107, GAP)).toBe(true)
  })
})
