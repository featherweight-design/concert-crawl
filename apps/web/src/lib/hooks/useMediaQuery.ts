'use client'

// The generic form of `useIsMobileViewport`. Same job, arbitrary query, so a
// surface with two breakpoints (the search results have three densities)
// doesn't grow two more bespoke matchMedia effects.
//
// It is NOT the same implementation, and the difference is the point.
// `useIsMobileViewport` seeds `false` and corrects in an effect, which paints
// one frame of the wrong layout. That is invisible for a `max-width` query,
// where `false` is the wide at-rest treatment, but a `min-width` consumer
// would paint the narrow layout and jump. Reading the snapshot during render
// instead removes the frame for both.
//
// `getServerSnapshot` still answers `false`, which is what keeps hydration
// honest: the server has no viewport, so the HTML and the first client pass
// have to agree on a guess, and only a component mounted after hydration can
// read the real one.

import { useCallback, useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
