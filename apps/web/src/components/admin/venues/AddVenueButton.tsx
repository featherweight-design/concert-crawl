'use client'

import { useEffect, useState } from 'react'
import { AddVenueModal } from '@/components/admin/AddVenueModal'

// The trigger sits in two places for two viewports: full-width under the stat
// row on mobile, inline in the header actions on desktop. Each placement gates
// on the breakpoint the other one doesn't cover, so exactly one renders at any
// width. Dropping either gate leaves a viewport with no way to add a venue.
const MOBILE_QUERY = '(max-width: 640px)'

interface AddVenueButtonProps {
  placement: 'mobile' | 'desktop'
}

export function AddVenueButton({ placement }: AddVenueButtonProps) {
  // Starts false so the server render and the first client render agree
  // (desktop), then corrects on hydration — same pattern as `useIsCompact`.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  if (placement === 'mobile') {
    return isMobile ? <AddVenueModal fullWidth /> : null
  }
  return isMobile ? null : <AddVenueModal />
}
