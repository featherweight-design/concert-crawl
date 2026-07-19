import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './relative-time'

const NOW = new Date('2026-07-18T12:00:00Z')

const minutesAgo = (minutes: number): string =>
  new Date(NOW.getTime() - minutes * 60 * 1000).toISOString()

describe('formatRelativeTime', () => {
  it('returns empty string for an unparseable timestamp', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('')
  })

  it('returns "Just now" under a minute', () => {
    expect(formatRelativeTime(minutesAgo(0), NOW)).toBe('Just now')
    expect(formatRelativeTime(NOW.toISOString(), NOW)).toBe('Just now')
  })

  it('formats minutes with singular/plural', () => {
    expect(formatRelativeTime(minutesAgo(1), NOW)).toBe('1 minute ago')
    expect(formatRelativeTime(minutesAgo(45), NOW)).toBe('45 minutes ago')
  })

  it('formats hours', () => {
    expect(formatRelativeTime(minutesAgo(60), NOW)).toBe('1 hour ago')
    expect(formatRelativeTime(minutesAgo(2 * 60), NOW)).toBe('2 hours ago')
    expect(formatRelativeTime(minutesAgo(23 * 60), NOW)).toBe('23 hours ago')
  })

  it('formats days up to a week', () => {
    expect(formatRelativeTime(minutesAgo(24 * 60), NOW)).toBe('1 day ago')
    expect(formatRelativeTime(minutesAgo(6 * 24 * 60), NOW)).toBe('6 days ago')
  })

  it('falls back to a short date past a week', () => {
    expect(formatRelativeTime('2026-06-05T12:00:00Z', NOW)).toBe('Jun 5')
  })

  it('includes the year for a different calendar year', () => {
    expect(formatRelativeTime('2025-12-31T12:00:00Z', NOW)).toBe('Dec 31, 2025')
  })
})
