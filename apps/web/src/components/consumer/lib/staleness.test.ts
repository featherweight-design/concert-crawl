import { describe, it, expect, vi, afterEach } from 'vitest'
import { isPriceStale, relTimeAgo, STALE_AFTER_MS } from './staleness'

const NOW = new Date('2026-08-02T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

afterEach(() => {
  vi.useRealTimers()
})

function freeze() {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
}

describe('isPriceStale', () => {
  it('is false without a timestamp — absence of data is not evidence of age', () => {
    expect(isPriceStale(null)).toBe(false)
    expect(isPriceStale(undefined)).toBe(false)
  })

  it('is false for an unparseable timestamp', () => {
    expect(isPriceStale('not-a-date')).toBe(false)
  })

  it('is false exactly at the threshold and true past it', () => {
    freeze()
    expect(isPriceStale(ago(STALE_AFTER_MS))).toBe(false)
    expect(isPriceStale(ago(STALE_AFTER_MS + 1000))).toBe(true)
  })
})

describe('relTimeAgo', () => {
  it('steps down through days, hours, minutes', () => {
    freeze()
    expect(relTimeAgo(ago(8 * 24 * 3600_000))).toBe('8d ago')
    expect(relTimeAgo(ago(3 * 3600_000))).toBe('3h ago')
    expect(relTimeAgo(ago(15 * 60_000))).toBe('15m ago')
    expect(relTimeAgo(ago(5_000))).toBe('just now')
  })

  it('says unknown rather than "just now" for an unparseable timestamp', () => {
    expect(relTimeAgo('not-a-date')).toBe('unknown')
  })

  it('says unknown for a future timestamp rather than "just now"', () => {
    freeze()
    expect(relTimeAgo(ago(-60 * 60_000))).toBe('unknown')
  })
})
