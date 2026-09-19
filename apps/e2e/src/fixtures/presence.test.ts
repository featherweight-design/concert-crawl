import type { Locator } from '@playwright/test'
import { describe, expect, it, vi } from 'vitest'

import { isVisibleWithin } from './presence'

const locatorWith = (waitFor: () => Promise<void>): Locator =>
  ({ waitFor }) as unknown as Locator

const timeoutError = (): Error => {
  const err = new Error('locator.waitFor: Timeout 15000ms exceeded.')
  err.name = 'TimeoutError'
  return err
}

describe('isVisibleWithin', () => {
  it('returns true when the locator becomes visible', async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined)

    await expect(isVisibleWithin(locatorWith(waitFor), 15_000)).resolves.toBe(
      true,
    )
    expect(waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 15_000 })
  })

  it('returns false on a genuine timeout', async () => {
    const waitFor = vi.fn().mockRejectedValue(timeoutError())

    await expect(isVisibleWithin(locatorWith(waitFor), 15_000)).resolves.toBe(
      false,
    )
  })

  it('rethrows anything that is not a timeout', async () => {
    // The whole point of the helper: a closed page or crashed context must
    // fail the spec, not be reported as an empty environment.
    const waitFor = vi
      .fn()
      .mockRejectedValue(
        new Error('Target page, context or browser has been closed'),
      )

    await expect(isVisibleWithin(locatorWith(waitFor), 15_000)).rejects.toThrow(
      'has been closed',
    )
  })
})
