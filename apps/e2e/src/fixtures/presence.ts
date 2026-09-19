import type { Locator } from '@playwright/test'

/**
 * Waits for `locator` to become visible and reports whether it appeared.
 *
 * Only a Playwright timeout counts as "not there". Every other failure — a
 * closed page, a crashed context, a malformed selector — is rethrown, because
 * a spec that skips on those reports green while the thing under test is
 * broken. That is the exact failure mode this suite was just repaired for, so
 * the distinction lives in one place rather than in six `catch` blocks.
 */
export async function isVisibleWithin(
  locator: Locator,
  timeout: number,
): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return false
    }
    throw err
  }
}
