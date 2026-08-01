'use client'

import { useEffect, useState } from 'react'
import { AddVenueModal } from '@/components/admin/AddVenueModal'
import { ADMIN_MOBILE_VIEWPORT_QUERY } from '@/components/admin/definitions/constants'

// The trigger sits in two places for two viewports: full-width under the stat
// row on mobile, inline in the header actions on desktop. Each placement gates
// on the breakpoint the other one doesn't cover, so exactly one renders at any
// width. Dropping either gate leaves a viewport with no way to add a venue.

interface AddVenueButtonProps {
  placement: 'mobile' | 'desktop'
}

export function AddVenueButton({ placement }: AddVenueButtonProps) {
  // Starts false so the server render and the first client render agree
  // (desktop), then corrects on hydration — same pattern as `useIsCompact`.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(ADMIN_MOBILE_VIEWPORT_QUERY)
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
