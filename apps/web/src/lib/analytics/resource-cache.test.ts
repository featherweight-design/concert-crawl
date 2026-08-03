// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { wasServedFromCache } from './resource-cache'

const URL_UNDER_TEST = '/share/abc/link'

// `getEntriesByName` matches on the resolved absolute url, which is what the
// browser records — the helper resolves before it looks, so the stub keys on
// the same thing rather than on the relative src.
const resolved = (path: string) => new URL(path, window.location.href).href

// A real PerformanceEntry with an optional transferSize bolted on, built
// rather than cast: the helper narrows with `'transferSize' in entry`, so a
// fixture missing the field has to be genuinely missing it to exercise that.
interface TimedEntry extends PerformanceEntry {
  transferSize: number
}

const entry = (transferSize?: number): PerformanceEntry => {
  const base: PerformanceEntry = {
    name: resolved(URL_UNDER_TEST),
    entryType: 'resource',
    startTime: 0,
    duration: 12,
    toJSON: () => ({}),
  }
  if (transferSize === undefined) return base
  const timed: TimedEntry = { ...base, transferSize }
  return timed
}

const stubEntries = (entries: PerformanceEntry[]) =>
  vi
    .spyOn(performance, 'getEntriesByName')
    .mockImplementation((name: string) =>
      name === resolved(URL_UNDER_TEST) ? entries : [],
    )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('wasServedFromCache', () => {
  it('reports a hit when the browser transferred no bytes', () => {
    stubEntries([entry(0)])

    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(true)
  })

  it('reports a miss when bytes came over the wire', () => {
    stubEntries([entry(48_120)])

    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(false)
  })

  // The img is remounted per shape, so one url can accumulate several entries.
  // The latest is the fetch that just fired onLoad; an earlier one describes a
  // previous attempt and would misreport this render.
  it('reads the most recent entry, not the first', () => {
    stubEntries([entry(48_120), entry(0)])

    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(true)
  })

  it('reports a miss when the url was never timed', () => {
    stubEntries([])

    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(false)
  })

  // Resource Timing is optional and buffer-capped. A measurement must never
  // surface as an exception in the UI it was measuring.
  it('swallows a throwing timing API rather than breaking the preview', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(performance, 'getEntriesByName').mockImplementation(() => {
      throw new Error('boom')
    })

    expect(() => wasServedFromCache(URL_UNDER_TEST)).not.toThrow()
    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(false)
  })

  it('reports a miss when the entry carries no transferSize', () => {
    stubEntries([entry()])

    expect(wasServedFromCache(URL_UNDER_TEST)).toBe(false)
  })
})
