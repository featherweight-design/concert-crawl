import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  filterWhenToDateRange,
  formatDollars,
  formatEventDate,
  formatPrice,
  dateGroupLabel,
  isEventPast,
  isToday,
  pickCalendarSelectedDate,
  type CalendarWeekDayLite,
} from './lib'
import { CONSUMER_COPY } from './copy'

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
  beforeEach(() => {
    // Pin Date.now so isTomorrow's real-clock branch is deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T18:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

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
    expect(dateGroupLabel('2026-08-15')).toBe('Sat, August 15')
  })
})

describe('pickCalendarSelectedDate', () => {
  // Mon 2026-06-15 → Sun 2026-06-21
  const weekDays: CalendarWeekDayLite[] = [
    { date: '2026-06-15', hasEvents: false },
    { date: '2026-06-16', hasEvents: false },
    { date: '2026-06-17', hasEvents: true },
    { date: '2026-06-18', hasEvents: false },
    { date: '2026-06-19', hasEvents: true },
    { date: '2026-06-20', hasEvents: false },
    { date: '2026-06-21', hasEvents: false },
  ]

  it('returns user-provided date when it falls in the visible week', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: '2026-06-18',
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-15',
      }),
    ).toBe('2026-06-18')
  })

  it('ignores user-provided date when it falls outside the visible week', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: '2099-01-01',
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-15',
      }),
    ).toBe('2026-06-15') // today, since today is in the week
  })

  it('returns fromParam when it falls in the visible week', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: undefined,
        fromParam: '2026-06-19',
        toParam: undefined,
        today: '2026-06-01', // not in week
      }),
    ).toBe('2026-06-19')
  })

  it('returns toParam when fromParam does not match but toParam does', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: undefined,
        fromParam: '2099-01-01',
        toParam: '2026-06-20',
        today: '2026-06-01',
      }),
    ).toBe('2026-06-20')
  })

  it('returns today when today is in the visible week (no other input)', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: undefined,
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-18',
      }),
    ).toBe('2026-06-18')
  })

  it('returns today even when today has no events (preserves "land on today" UX)', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: undefined,
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-15', // first day, hasEvents: false
      }),
    ).toBe('2026-06-15')
  })

  it('returns first day with events when today is not in the visible week (#636)', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays,
        userProvidedSelectedDate: undefined,
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-01', // not in week
      }),
    ).toBe('2026-06-17') // first day in week with hasEvents
  })

  it('falls back to first day of week when today is not in week and no day has events', () => {
    const emptyWeek: CalendarWeekDayLite[] = weekDays.map((day) => ({
      ...day,
      hasEvents: false,
    }))
    expect(
      pickCalendarSelectedDate({
        weekDays: emptyWeek,
        userProvidedSelectedDate: undefined,
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-01',
      }),
    ).toBe('2026-06-15')
  })

  it('returns undefined when weekDays is empty', () => {
    expect(
      pickCalendarSelectedDate({
        weekDays: [],
        userProvidedSelectedDate: undefined,
        fromParam: undefined,
        toParam: undefined,
        today: '2026-06-15',
      }),
    ).toBeUndefined()
  })
})

describe('formatDollars', () => {
  // Prices reach the client as parseFloat output, so a chip that interpolates
  // the raw number renders "$15.5" — no other consumer surface shows cents.
  it('rounds to whole dollars', () => {
    expect(formatDollars(15.5)).toBe('$16')
    expect(formatDollars(15.4)).toBe('$15')
    expect(formatDollars(20)).toBe('$20')
  })

  it('calls a zero price free rather than "$0"', () => {
    expect(formatDollars(0)).toBe(CONSUMER_COPY.freeLabel)
  })
})

describe('formatPrice', () => {
  it('renders a single price, a range and free', () => {
    expect(formatPrice('25', null)).toBe('$25')
    expect(formatPrice('25.5', '40.2')).toBe('$26–$40')
    expect(formatPrice('0', null)).toBe(CONSUMER_COPY.freeLabel)
    expect(formatPrice(null, null)).toBeNull()
  })
})

describe('isEventPast (#72)', () => {
  it('is false on the day of the show and true only once it is over', () => {
    mockLocalDate.mockReturnValue('2026-08-02')

    // A show tonight is not past — the comparison is date-granular in the
    // venue's zone, so an 11pm set still counts as today.
    expect(isEventPast('2026-08-02', 'America/Denver')).toBe(false)
    expect(isEventPast('2026-08-03', 'America/Denver')).toBe(false)
    expect(isEventPast('2026-08-01', 'America/Denver')).toBe(true)
    expect(isEventPast('2025-12-31', 'America/Denver')).toBe(true)
  })

  it('asks for today in the venue timezone it was given', () => {
    mockLocalDate.mockReturnValue('2026-08-02')

    isEventPast('2026-08-02', 'America/New_York')

    expect(mockLocalDate).toHaveBeenCalledWith('America/New_York')
  })
})
