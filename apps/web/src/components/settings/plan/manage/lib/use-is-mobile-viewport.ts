'use client'

// Shared <640px check — same matchMedia pattern as ModalShell and
// TierPickerSheet, keyed to the Tailwind sm: breakpoint that splits the
// /me mobile and desktop settings trees.

import { useEffect, useState } from 'react'
import { MOBILE_VIEWPORT_QUERY } from '@/components/consumer/tier-picker/definitions/constants'

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
