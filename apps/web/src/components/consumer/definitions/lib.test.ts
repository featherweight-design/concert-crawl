import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  filterWhenToDateRange,
  formatEventDate,
  dateGroupLabel,
  isToday,
} from './lib'

vi.mock('@/lib/time', () => ({
  localDateString: vi.fn(),
}))

import { localDateString } from '@/lib/time'

const mockLocalDate = localDateString as ReturnType<typeof vi.fn>

describe('filterWhenToDateRange', () => {
  afterEach(() => vi.clearAllMocks())

  describe('tonight', () => {
    it('returns today to today', () => {
      mockLocalDate.mockReturnValue('2026-05-20') // Wednesday
      expect(filterWhenToDateRange('tonight')).toEqual({
        from: '2026-05-20',
        to: '2026-05-20',
      })
    })
  })

  describe('this-week', () => {
    it('starts from today (Wednesday), not Monday', () => {
      mockLocalDate.mockReturnValue('2026-05-20') // Wednesday
      expect(filterWhenToDateRange('this-week')).toEqual({
        from: '2026-05-20',
        to: '2026-05-24', // Sunday
      })
    })

    it('starts from today (Sunday)', () => {
      mockLocalDate.mockReturnValue('2026-05-17') // Sunday
      expect(filterWhenToDateRange('this-week')).toEqual({
        from: '2026-05-17',
        to: '2026-05-17', // same Sunday
      })
    })

    it('starts from today (Monday)', () => {
      mockLocalDate.mockReturnValue('2026-05-18') // Monday
      expect(filterWhenToDateRange('this-week')).toEqual({
        from: '2026-05-18',
        to: '2026-05-24', // Sunday
      })
    })

    it('starts from today (Saturday)', () => {
      mockLocalDate.mockReturnValue('2026-05-23') // Saturday
      expect(filterWhenToDateRange('this-week')).toEqual({
        from: '2026-05-23',
        to: '2026-05-24', // Sunday
      })
    })
  })

  describe('this-weekend', () => {
    it('on Saturday starts from today', () => {
      mockLocalDate.mockReturnValue('2026-05-23') // Saturday
      expect(filterWhenToDateRange('this-weekend')).toEqual({
        from: '2026-05-23',
        to: '2026-05-24', // Sunday
      })
    })

    it('on Sunday starts from today (not yesterday)', () => {
      mockLocalDate.mockReturnValue('2026-05-24') // Sunday
      expect(filterWhenToDateRange('this-weekend')).toEqual({
        from: '2026-05-24',
        to: '2026-05-24',
      })
    })

    it('on Monday starts from next Saturday', () => {
      mockLocalDate.mockReturnValue('2026-05-18') // Monday
      expect(filterWhenToDateRange('this-weekend')).toEqual({
        from: '2026-05-23', // Saturday
        to: '2026-05-24', // Sunday
      })
    })

    it('on Wednesday starts from upcoming Saturday', () => {
      mockLocalDate.mockReturnValue('2026-05-20') // Wednesday
      expect(filterWhenToDateRange('this-weekend')).toEqual({
        from: '2026-05-23', // Saturday
        to: '2026-05-24', // Sunday
      })
    })
  })

  describe('next-week', () => {
    it('returns the full next Mon–Sun range', () => {
      mockLocalDate.mockReturnValue('2026-05-20') // Wednesday
      expect(filterWhenToDateRange('next-week')).toEqual({
        from: '2026-05-25', // next Monday
        to: '2026-05-31', // next Sunday
      })
    })
  })

  describe('unknown value', () => {
    it('returns null', () => {
      mockLocalDate.mockReturnValue('2026-05-20')
      expect(filterWhenToDateRange('all-time')).toBeNull()
    })
  })
})

// These tests pin the venue-local day name and group label so the
// output stays correct regardless of the host machine's timezone. Previously the
// formatEventDate helper parsed YYYY-MM-DD as host-local time, which gave the
// wrong day on a UTC server (Render/Vercel) while looking correct on MT laptops.
describe('formatEventDate', () => {
  it('returns the venue-local weekday for a YYYY-MM-DD string regardless of host timezone', () => {
    // June 15, 2026 is a Monday in America/Denver.
    expect(formatEventDate('2026-06-15', 'America/Denver')).toBe(
      'Monday, June 15',
    )
  })

  it('defaults to America/Denver when no timezone passed', () => {
    expect(formatEventDate('2026-06-15')).toBe('Monday, June 15')
  })

  it('handles DST-active and DST-inactive months identically', () => {
    expect(formatEventDate('2026-01-15', 'America/Denver')).toBe(
      'Thursday, January 15',
    )
    expect(formatEventDate('2026-07-15', 'America/Denver')).toBe(
      'Wednesday, July 15',
    )
  })
})

describe('isToday / dateGroupLabel timezone defaults', () => {
  afterEach(() => vi.clearAllMocks())

  it('isToday defaults to America/Denver', () => {
    mockLocalDate.mockReturnValue('2026-06-15')
    expect(isToday('2026-06-15')).toBe(true)
    expect(mockLocalDate).toHaveBeenCalledWith('America/Denver')
  })

  it('dateGroupLabel labels today as Tonight using America/Denver default', () => {
    mockLocalDate.mockReturnValue('2026-06-15')
    expect(dateGroupLabel('2026-06-15')).toBe('Tonight')
  })

  it('dateGroupLabel formats non-today dates with venue-local weekday', () => {
    mockLocalDate.mockReturnValue('2026-06-15')
    // Real Date.now is used inside isTomorrow; mock localDateString won't matter for
    // arbitrary future dates, so we pick something clearly neither today nor tomorrow.
    expect(dateGroupLabel('2026-08-15')).toBe('Sat, August 15')
  })
})
