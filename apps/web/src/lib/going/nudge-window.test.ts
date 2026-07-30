import { describe, it, expect } from 'vitest'
import { daysUntilShow, isInNudgeWindow, daysUntilLabel } from './nudge-window'

// 18:00Z on Nov 1 is midday in Denver, so the Mountain-Time calendar day is
// unambiguously 2026-11-01 regardless of offset.
const NOW = new Date('2026-11-01T18:00:00Z')

const show = (date: string, attendingAt: string | null = null) => ({
  date,
  attendingAt,
})

describe('daysUntilShow', () => {
  it('counts whole calendar days in Mountain Time', () => {
    expect(daysUntilShow(show('2026-11-05'), NOW)).toBe(4)
  })

  it('is zero on the night of the show', () => {
    expect(daysUntilShow(show('2026-11-01'), NOW)).toBe(0)
  })

  it('does not drift across a DST boundary', () => {
    // Denver leaves DST on 2026-11-01, so this span contains a 25-hour day —
    // subtracting wall-clock instants would yield 6.96 and round to 7.
    expect(daysUntilShow(show('2026-11-08'), NOW)).toBe(7)
  })

  it('goes negative once the night has passed', () => {
    expect(daysUntilShow(show('2026-10-30'), NOW)).toBe(-2)
  })
})

describe('isInNudgeWindow', () => {
  it('includes the night of the show', () => {
    expect(isInNudgeWindow(show('2026-11-01'), NOW)).toBe(true)
  })

  it('includes the seventh day out', () => {
    expect(isInNudgeWindow(show('2026-11-08'), NOW)).toBe(true)
  })

  it('excludes the eighth day out', () => {
    expect(isInNudgeWindow(show('2026-11-09'), NOW)).toBe(false)
  })

  it('excludes a show that has already happened', () => {
    expect(isInNudgeWindow(show('2026-10-31'), NOW)).toBe(false)
  })

  it('never re-asks a show the user already committed to', () => {
    expect(
      isInNudgeWindow(show('2026-11-03', '2026-10-20T00:00:00Z'), NOW),
    ).toBe(false)
  })
})

describe('daysUntilLabel', () => {
  it('says Tonight on the day of the show', () => {
    expect(daysUntilLabel(show('2026-11-01'), NOW)).toBe('Tonight.')
  })

  it('says Tomorrow the day before', () => {
    expect(daysUntilLabel(show('2026-11-02'), NOW)).toBe('Tomorrow.')
  })

  it('counts the days out beyond tomorrow', () => {
    expect(daysUntilLabel(show('2026-11-05'), NOW)).toBe('In 4 days.')
  })
})
