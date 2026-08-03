'use client'

// The panel's compact/desktop split. Same matchMedia pattern as
// `useIsMobileViewport` in @/lib/hooks, keyed to the Tailwind `sm:`
// breakpoint. Starts `false` so the server render and the first client render
// agree (desktop), then corrects on hydration.

import { useEffect, useState } from 'react'

import { TRIAGE_COMPACT_QUERY } from '../definitions/meta'

export const useIsCompact = (): boolean => {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(TRIAGE_COMPACT_QUERY)
    setIsCompact(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsCompact(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  return isCompact
}
