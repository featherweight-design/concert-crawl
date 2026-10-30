import { expect, type Page } from '@playwright/test'

import { waitForHydrated } from '../fixtures/hydration.js'

/**
 * Whether the page has finished loading what the sweep is about to capture:
 * no loading placeholder is mounted, every image that can load without
 * scrolling has finished (loaded or failed), and web fonts are in.
 *
 * This is the readiness `networkidle` used to stand in for. It stopped
 * resolving on Next 16, where a proxy-redirected RSC prefetch holds a request
 * open indefinitely, so the sweep timed out on every route. The sweep visits
 * every route in the manifest with one wait, so it keys on what the app's
 * loading states have in common rather than on one element per route:
 *
 * - `.admin-skeleton`: every admin `loading.tsx` placeholder.
 * - `skeletonPulse`, `ccShimmer` or `wShimmer` in an inline style: the
 *   consumer route, crew and watchers placeholders, which are styled inline.
 *   Matched on the attribute rather than the computed animation, because the
 *   sweep runs with reduced motion and the guards strip the animation while
 *   the placeholder is still on screen.
 * - `.dl-sweep`: the discovery sweep overlay on the event-detail CTA and
 *   the browse discovery shelf while their client queries load.
 * - `aria-busy="true"`: client sections that announce their own loading.
 *
 * A marker only counts when it is displayed. The app mounts its mobile and
 * desktop trees together and hides one with CSS, and a loading section in the
 * hidden tree would otherwise hold up the capture of the visible one. The
 * `.dl-sweep` overlay is judged by its skeleton instead, because the
 * reduced-motion guard hides the overlay itself.
 *
 * Every button, form control and event row must also be hydrated (event rows
 * carry links but no buttons, and size themselves in an effect). React
 * hydrates the `<body>` before a nested boundary whose code is still loading,
 * so a hydrated body alone can capture server HTML (a responsive layout that
 * is switched in an effect, say) before the route's own components are live.
 *
 * A `loading="lazy"` image counts only once it intersects the viewport: below
 * the fold it never loads, because a full-page screenshot does not scroll.
 * Zero-size images (not laid out) are skipped for the same reason.
 *
 * Self-contained on purpose: Playwright serialises this function into the
 * page, so it cannot close over a module constant.
 */
export function isPageSettled(): boolean {
  const isDisplayed = (el: Element | null): boolean => {
    for (let node = el; node !== null; node = node.parentElement) {
      if (getComputedStyle(node).display === 'none') return false
    }
    return el !== null
  }
  const markers = document.querySelectorAll(
    [
      '.admin-skeleton',
      '[style*="skeletonPulse"]',
      '[style*="ccShimmer"]',
      '[style*="wShimmer"]',
      '.dl-sweep',
      '[aria-busy="true"]',
    ].join(', '),
  )
  const pending = Array.from(markers).some((el) =>
    isDisplayed(el.classList.contains('dl-sweep') ? el.parentElement : el),
  )
  if (pending) return false
  const controls = document.querySelectorAll(
    'button, input, select, textarea, [data-testid="event-row"]',
  )
  const unhydrated = Array.from(controls).some(
    (el) => !Object.keys(el).some((key) => key.startsWith('__reactProps$')),
  )
  if (unhydrated) return false
  // Checked in the same pass as the placeholders so both hold at one moment: a
  // placeholder can mount while fonts load. `document.fonts.status` rather
  // than awaiting `document.fonts.ready`, which never resolves if a font
  // request stalls. The `in` check is for environments without the Font
  // Loading API (jsdom), where there is nothing to wait for.
  if ('fonts' in document && document.fonts.status !== 'loaded') return false
  return Array.from(document.images).every((img) => {
    if (img.complete || img.getAttribute('loading') !== 'lazy') {
      return img.complete
    }
    const rect = img.getBoundingClientRect()
    const inViewport =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    return !inViewport
  })
}

/**
 * Waits until the current page is ready to capture: React has hydrated the
 * page, every loading placeholder has resolved, and web fonts are in.
 * Each wait inside (the body attaching, the body hydrating, the settled poll)
 * is bounded by `timeout` on its own, not by one shared deadline, so a slow
 * route can take a multiple of `timeout` before this throws. A throw makes the caller record the route as a load error rather
 * than capture a skeleton.
 */
export async function waitForPageReady(
  page: Page,
  timeout = 30_000,
): Promise<void> {
  // The root layout renders <body>, so React writes its props key onto it on
  // hydration: the earliest point at which the page is live.
  await waitForHydrated(page.locator('body'), timeout)
  await expect
    .poll(
      async () => {
        if (!(await page.evaluate(isPageSettled))) return false
        // Effects run after the hydration commit and can still swap what is
        // on screen (a responsive layout, a query starting). Give them two
        // frames, and only accept a page that is still settled after them.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              )
            }),
        )
        return page.evaluate(isPageSettled)
      },
      {
        timeout,
        message:
          'page still showing a loading placeholder, an unhydrated control, an unloaded image or loading fonts',
      },
    )
    .toBe(true)
}
