import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { filterWhenToDateRange } from './lib'

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
