/* eslint id-length: ["error", { "min": 2, "exceptions": ["i", "j", "k", "x", "y", "z", "_"], "properties": "never" }] */
import { describe, it, expect } from 'vitest'
import {
  ymdKey,
  isoOf,
  addMonths,
  monthMatrix,
  pickerWindow,
  weekOffsetForDate,
} from './date-math'

describe('isoOf / ymdKey', () => {
  it('formats a zero-indexed month to ISO', () => {
    expect(isoOf(2026, 3, 28)).toBe('2026-04-28')
    expect(isoOf(2026, 11, 1)).toBe('2026-12-01')
  })
  it('produces a monotonic integer key', () => {
    expect(ymdKey(2026, 3, 28)).toBe(20260428)
    expect(ymdKey(2026, 4, 1)).toBeGreaterThan(ymdKey(2026, 3, 28))
  })
})

describe('addMonths', () => {
  it('rolls the year forward', () => {
    expect(addMonths({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 })
  })
  it('rolls the year backward', () => {
    expect(addMonths({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 })
  })
})

describe('monthMatrix', () => {
  it('returns 42 cells, Sunday-first', () => {
    const cells = monthMatrix(2026, 3) // April 2026
    expect(cells).toHaveLength(42)
    // April 1 2026 is a Wednesday (dow 3) → first three cells spill from March.
    expect(cells.at(0)?.inMonth).toBe(false)
    expect(cells.at(3)).toMatchObject({
      d: 1,
      inMonth: true,
      iso: '2026-04-01',
    })
    expect(cells.at(0)?.dow).toBe(0)
    expect(cells.at(6)?.dow).toBe(6)
  })
})

describe('pickerWindow', () => {
  it('spans current month through +12 months', () => {
    const win = pickerWindow('2026-04-28')
    expect(win.from).toBe('2026-04-01')
    expect(win.to).toBe('2027-04-30')
    expect(win.min).toEqual({ y: 2026, m: 3 })
    expect(win.max).toEqual({ y: 2027, m: 3 })
  })
})

describe('weekOffsetForDate', () => {
  it('is 0 within the current Monday-based week', () => {
    // 2026-04-28 is a Tuesday; the week runs Mon 2026-04-27 .. Sun 2026-05-03.
    expect(weekOffsetForDate('2026-04-28', '2026-04-28')).toBe(0)
    expect(weekOffsetForDate('2026-05-03', '2026-04-28')).toBe(0)
  })
  it('counts whole weeks forward', () => {
    expect(weekOffsetForDate('2026-05-04', '2026-04-28')).toBe(1)
    expect(weekOffsetForDate('2026-05-11', '2026-04-28')).toBe(2)
  })
  it('separates a Sunday from the following Monday (week boundary)', () => {
    // Sun 2026-05-03 closes the current week; Mon 2026-05-04 opens the next.
    const sunday = weekOffsetForDate('2026-05-03', '2026-04-28')
    const monday = weekOffsetForDate('2026-05-04', '2026-04-28')
    expect(sunday).toBe(0)
    expect(monday).toBe(1)
    expect(monday).not.toBe(sunday)
  })
})
