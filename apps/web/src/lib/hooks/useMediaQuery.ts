'use client'

// The generic form of `useIsMobileViewport`. Same pattern, arbitrary query, so
// a surface with two breakpoints (the search results have three densities)
// doesn't grow two more bespoke matchMedia effects.
//
// Always `false` on the server and on the first client render, which is what
// keeps hydration honest: the wider/at-rest treatment paints first and the
// narrow one arrives after mount rather than mismatching the HTML.

import { useEffect, useState } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setMatches(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [query])

  return matches
}
