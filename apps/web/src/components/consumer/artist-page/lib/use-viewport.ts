'use client'

import { useEffect, useState } from 'react'

/** The one breakpoint this page has, mirrored from the `.ap-*` media queries. */
export const AP_DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Layout is CSS everywhere on this page EXCEPT the follow control, which must
 * exist exactly once. A CSS-only split would render two buttons and hide one;
 * `display: none` does keep the hidden one out of the accessibility tree, but
 * both would still be mounted, both would subscribe to the same follow state,
 * and a `getByRole` query resolves to two nodes. Choosing the slot in JS is
 * what keeps it genuinely singular.
 *
 * Starts false so the server render and the first client render agree. The
 * effect corrects it on the commit after hydration — after first paint — so a
 * desktop visitor gets the mobile slot for one frame and the control then
 * moves between slots. `useLayoutEffect` would close that gap but warns under
 * SSR; the flash is judged the cheaper cost.
 */
export const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(AP_DESKTOP_QUERY)
    const apply = () => setIsDesktop(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return isDesktop
}

/** True once the window has scrolled past `threshold` px. */
export const useScrolledPast = (threshold: number): boolean => {
  const [past, setPast] = useState(false)

  useEffect(() => {
    // Scroll fires at frame rate; React would bail out on an unchanged boolean,
    // but only after scheduling the update. The ref skips that entirely, so a
    // long scroll costs one state write per threshold crossing, not per frame.
    // null, not false: a threshold change re-runs this effect while `past` may
    // already be true, and seeding with a guess would swallow the correction.
    let current: boolean | null = null
    const apply = () => {
      const next = window.scrollY > threshold
      if (next === current) return
      current = next
      setPast(next)
    }
    apply()
    window.addEventListener('scroll', apply, { passive: true })
    return () => window.removeEventListener('scroll', apply)
  }, [threshold])

  return past
}
