'use client'

import { useEffect, useState } from 'react'

/** The one breakpoint this page has, mirrored from the `.ap-*` media queries. */
export const AP_DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Layout is CSS everywhere on this page EXCEPT the follow control, which must
 * exist exactly once in the accessibility tree. `hidden md:block` hides pixels
 * but still mounts a second button, so the one place we genuinely need to know
 * the viewport in JS is deciding which follow slot renders at all.
 *
 * Starts false so the server render and the first client render agree; the
 * effect corrects it before paint.
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
    const apply = () => setPast(window.scrollY > threshold)
    apply()
    window.addEventListener('scroll', apply, { passive: true })
    return () => window.removeEventListener('scroll', apply)
  }, [threshold])

  return past
}
