import { describe, it, expect } from 'vitest'
import {
  computeMissedSweeps,
  formatEventDate,
  formatLastSeen,
  resolveVenueCheckUrl,
} from './missing'

describe('resolveVenueCheckUrl', () => {
  it('prefers the per-event page over the calendar it was found on', () => {
    expect(
      resolveVenueCheckUrl(
        'https://redrocksonline.com/events/griz-1489047/',
        'https://redrocksonline.com/events/',
      ),
    ).toBe('https://redrocksonline.com/events/griz-1489047/')
  })

  it('falls back to the source calendar when there is no event URL', () => {
    expect(
      resolveVenueCheckUrl(null, 'https://redrocksonline.com/events/'),
    ).toBe('https://redrocksonline.com/events/')
  })

  it('falls back to the source calendar when the event URL is unsafe', () => {
    expect(
      resolveVenueCheckUrl(
        'javascript:alert(1)',
        'https://redrocksonline.com/events/',
      ),
    ).toBe('https://redrocksonline.com/events/')
  })

  it('returns null when neither URL is a safe http(s) link', () => {
    expect(resolveVenueCheckUrl(null, null)).toBeNull()
    expect(resolveVenueCheckUrl('javascript:alert(1)', 'not-a-url')).toBeNull()
  })
})

describe('computeMissedSweeps', () => {
  it('returns the count of full days between firstMissingAt and now', () => {
    expect(
      computeMissedSweeps('2026-06-12T03:00:00Z', '2026-06-16T03:00:00Z'),
    ).toBe(4)
  })

  it('floors to at least 1 when the gap is shorter than a day', () => {
    expect(
      computeMissedSweeps('2026-06-16T02:00:00Z', '2026-06-16T05:00:00Z'),
    ).toBe(1)
  })

  it('never returns 0 or negative even if firstMissingAt is in the future', () => {
    expect(
      computeMissedSweeps('2026-06-20T03:00:00Z', '2026-06-16T03:00:00Z'),
    ).toBe(1)
  })

  it('falls back to 1 (not NaN) when either ISO string is invalid', () => {
    expect(computeMissedSweeps('not-a-date', '2026-06-16T03:00:00Z')).toBe(1)
    expect(computeMissedSweeps('2026-06-12T03:00:00Z', 'not-a-date')).toBe(1)
  })
})

describe('formatEventDate', () => {
  it('formats a YYYY-MM-DD date as MMM D in Denver-local', () => {
    expect(formatEventDate('2026-06-19')).toBe('Jun 19')
  })
})

describe('formatLastSeen', () => {
  it('formats an ISO timestamp as MMM D (Mountain Time)', () => {
    expect(formatLastSeen('2026-06-12T20:00:00Z')).toBe('Jun 12')
  })

  it('returns an em-dash when given null', () => {
    expect(formatLastSeen(null)).toBe('—')
  })
})
