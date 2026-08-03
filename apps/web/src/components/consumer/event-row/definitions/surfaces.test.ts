import { describe, it, expect } from 'vitest'
import {
  SURFACES,
  whenWhereUnits,
  WHEN_WHERE_UNITS,
  type RowSurface,
} from './surfaces'
import { chipBudget } from '../lib/row-chips'

const SURFACE_NAMES = Object.keys(SURFACES) as RowSurface[]

describe('whenWhereUnits', () => {
  it('derives line 3 by subtracting what the surface carries', () => {
    for (const surface of SURFACE_NAMES) {
      const expected = WHEN_WHERE_UNITS.filter(
        (unit) =>
          !SURFACES[surface].carries.some((carried) => carried === unit),
      )
      expect(whenWhereUnits(surface)).toEqual(expected)
    }
  })

  it('subtracts the date under Browse group headers and the venue on a venue page', () => {
    expect(whenWhereUnits('browse')).toEqual(['time', 'venue'])
    expect(whenWhereUnits('venue')).toEqual(['date', 'time'])
  })

  it('carries nothing on Watching, whose group headers are loose windows', () => {
    expect(whenWhereUnits('watching')).toEqual(['date', 'time', 'venue'])
  })

  it('keeps the time on every surface', () => {
    for (const surface of SURFACE_NAMES) {
      expect(whenWhereUnits(surface)).toContain('time')
    }
  })

  // Rule 2 caps what the row *renders*, not what a surface may rank. A surface
  // is free to list a fallback kind it will usually never reach; the budget and
  // the measure pass are what keep the line to two.
  it('caps the rendered chips at two however long a priority list gets', () => {
    for (const surface of SURFACE_NAMES) {
      const chips = SURFACES[surface].chipPriority.slice(0, chipBudget(false))
      expect(chips.length).toBeLessThanOrEqual(2)
      expect(
        SURFACES[surface].chipPriority.slice(0, chipBudget(true)).length,
      ).toBeLessThanOrEqual(1)
    }
  })

  it('never ranks the same chip kind twice on a surface', () => {
    for (const surface of SURFACE_NAMES) {
      const kinds = SURFACES[surface].chipPriority
      expect(new Set(kinds).size).toBe(kinds.length)
    }
  })
})
