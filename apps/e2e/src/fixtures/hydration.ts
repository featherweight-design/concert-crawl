import { expect, type Locator } from '@playwright/test'

/**
 * Whether React has hydrated this DOM node.
 *
 * React writes an own `__reactProps$<random>` key onto every host node it
 * hydrates or renders, at the moment its event handlers become live. A node
 * that only exists as server HTML has no such key, so a click on it does
 * nothing. That is the readiness `waitForLoadState('networkidle')` used to
 * stand in for, and it stopped resolving on Next 16, where a proxy-redirected
 * RSC prefetch holds a request open indefinitely.
 *
 * Self-contained on purpose: Playwright serialises this function into the
 * page, so it cannot close over a module constant.
 */
export function isHydratedNode(node: object): boolean {
  return Object.keys(node).some((key) => key.startsWith('__reactProps$'))
}

/**
 * Waits until `locator`'s element is hydrated, so the interaction that follows
 * reaches a live handler rather than inert server HTML. Use it before clicking
 * or selecting on an element the server rendered; an element that only renders
 * client-side is hydrated by the time it is visible.
 */
export async function waitForHydrated(
  locator: Locator,
  timeout = 15_000,
): Promise<void> {
  await locator.waitFor({ state: 'attached', timeout })
  await expect
    .poll(() => locator.evaluate(isHydratedNode), { timeout })
    .toBe(true)
}
