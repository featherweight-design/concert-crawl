import { describe, expect, it } from 'vitest'
import {
  REVIEW_TAB_KEYS,
  isReviewTabKey,
  resolveReviewTab,
} from './review-tabs'

describe('REVIEW_TAB_KEYS', () => {
  it('carries submissions and prices as separate tabs', () => {
    // The split (#1610): `prices` keeps its key and now holds price coverage
    // only, `submissions` is additive. Keeping `prices` is what preserves
    // existing `?tab=prices` links and `?from=prices` editor round-trips.
    expect(REVIEW_TAB_KEYS).toContain('prices')
    expect(REVIEW_TAB_KEYS).toContain('submissions')
  })

  it('has no duplicate keys', () => {
    expect(new Set(REVIEW_TAB_KEYS).size).toBe(REVIEW_TAB_KEYS.length)
  })
})

describe('isReviewTabKey', () => {
  it('accepts every canonical key', () => {
    for (const key of REVIEW_TAB_KEYS) {
      expect(isReviewTabKey(key)).toBe(true)
    }
  })

  it('rejects unknown values and null', () => {
    expect(isReviewTabKey('price-submissions')).toBe(false)
    expect(isReviewTabKey('')).toBe(false)
    expect(isReviewTabKey(null)).toBe(false)
  })
})

describe('resolveReviewTab', () => {
  const resolve = (query: string) =>
    resolveReviewTab(new URLSearchParams(query))

  it('reads an explicit ?tab= key', () => {
    expect(resolve('tab=submissions')).toBe('submissions')
    expect(resolve('tab=prices')).toBe('prices')
    expect(resolve('tab=contests')).toBe('contests')
  })

  it('maps the legacy ?section=submissions onto the submissions tab', () => {
    // Before the split this landed on `prices`, which then had to smooth-scroll
    // to a `#submissions-section` anchor. The tab now IS that surface, so the
    // legacy URL keeps working and lands somewhere more accurate.
    expect(resolve('section=submissions')).toBe('submissions')
  })

  it('prefers an explicit ?tab= over the legacy ?section=', () => {
    expect(resolve('tab=missing&section=submissions')).toBe('missing')
  })

  it('falls back to event-flags for unknown or absent values', () => {
    expect(resolve('')).toBe('event-flags')
    expect(resolve('tab=nonsense')).toBe('event-flags')
    expect(resolve('section=nonsense')).toBe('event-flags')
  })
})
