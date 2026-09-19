/**
 * The slice of `Locator` this helper touches. Narrowing the parameter lets a
 * unit test pass a two-line double without an `as unknown as Locator` cast,
 * which CLAUDE.md's type-safety rule rules out — and a real `Locator` is
 * assignable to it.
 */
interface VisibilityWaitable {
  waitFor(options: { state: 'visible'; timeout: number }): Promise<void>
}

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
  locator: VisibilityWaitable,
  timeout: number,
): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    return true
  } catch (err) {
    // Both paths log: a skipped spec and a rethrown crash otherwise look
    // identical in a CI log, which is how a vacuously green suite hides.
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.warn(`isVisibleWithin: not visible within ${timeout}ms`)
      return false
    }
    console.error('isVisibleWithin: non-timeout failure, rethrowing', err)
    throw err
  }
}
