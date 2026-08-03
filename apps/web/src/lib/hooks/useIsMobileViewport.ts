'use client'

// Shared <640px check — same matchMedia pattern as ModalShell and
// TierPickerSheet, keyed to the Tailwind sm: breakpoint. This is the canonical
// helper for a sheet-vs-popover split — prefer it over a fresh matchMedia call
// so the breakpoint can't drift. Several surfaces still read the query directly
// and have not been migrated.

import { useEffect, useState } from 'react'
import { MOBILE_VIEWPORT_QUERY } from '@/lib/definitions/breakpoints'

export const useIsMobileViewport = (): boolean => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    setIsMobile(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  return isMobile
}
