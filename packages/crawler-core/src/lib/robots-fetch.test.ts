import { afterEach, describe, expect, it, vi } from 'vitest'
import * as robots from './robots.js'
import { clearRedirect, raceSignal } from './robots-fetch.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('clearRedirect', () => {
  it('starts no robots.txt lookup once the signal has aborted', async () => {
    const isAllowedSpy = vi.spyOn(robots, 'isAllowedOrSkip')
    const controller = new AbortController()
    controller.abort(new DOMException('budget spent', 'TimeoutError'))

    await expect(
      clearRedirect(
        'https://a.example/from',
        'https://b.example/to',
        0,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(isAllowedSpy).not.toHaveBeenCalled()
  })
})

describe('raceSignal', () => {
  // Driven directly rather than through clearRedirect: a vi spy records how
  // its returned promise settles, which handles the rejection and would
  // hide exactly the bug this guards against.
  it('leaves no unhandled rejection when the lookup fails after the caller stopped waiting', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('budget spent', 'TimeoutError'))
    let rejectLookup: (err: unknown) => void = () => undefined
    const lookup = new Promise<boolean>((_, reject) => {
      rejectLookup = reject
    })
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      await expect(raceSignal(lookup, controller.signal)).rejects.toMatchObject(
        { name: 'TimeoutError' },
      )
      rejectLookup(new robots.CrawlSkipError('robots.txt unreachable'))
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
