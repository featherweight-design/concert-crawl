// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { getDismissalState, dismissOnce } from '../install-dismissal'

describe('install-dismissal', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to active with no record', () => {
    expect(getDismissalState()).toBe('active')
  })

  it('goes quiet on first dismiss', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    expect(getDismissalState(new Date('2026-07-25T00:00:00Z'))).toBe('quiet')
  })

  it('returns to active after 30 days', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    expect(getDismissalState(new Date('2026-08-20T00:00:00Z'))).toBe('active')
  })

  it('retires forever on second dismiss', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    dismissOnce(new Date('2026-07-19T00:00:00Z'))
    expect(getDismissalState(new Date('2030-01-01T00:00:00Z'))).toBe('retired')
  })

  it('caps count at 2 so a stubborn double-clicker cannot invalidate the record', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    dismissOnce(new Date('2026-07-19T00:00:00Z'))
    // 3rd dismiss must not push count>2 (isValidRecord rejects count>2)
    dismissOnce(new Date('2026-07-20T00:00:00Z'))
    // Still retired — record still parseable.
    expect(getDismissalState(new Date('2027-01-01T00:00:00Z'))).toBe('retired')
  })

  it('treats corrupt localStorage as no record', () => {
    localStorage.setItem('cc-install-dismissal', '{not json')
    expect(getDismissalState()).toBe('active')
  })

  it('treats out-of-schema records as no record', () => {
    localStorage.setItem(
      'cc-install-dismissal',
      JSON.stringify({ count: 99, firstDismissedAt: 'nope' }),
    )
    expect(getDismissalState()).toBe('active')
  })

  it('migrates the legacy cc-install-dismissed flag to retired', () => {
    // Tier B stored a boolean flag; users who dismissed then should stay
    // dismissed forever under the new store.
    localStorage.setItem('cc-install-dismissed', '1')
    expect(getDismissalState()).toBe('retired')
  })
})
