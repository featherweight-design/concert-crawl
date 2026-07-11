'use client'

// Auto-open hook for `/me?plan=open` (PR 4.2) — lifecycle nudge CTAs route
// here so the real tier picker (with checkout) takes over. Fires onOpen,
// then strips the param from the URL so refresh/back doesn't reopen.
//
// Reads useSearchParams (not window.location) so same-path navigations
// (`router.push('/me?plan=open')` while already on /me) re-run the effect.
//
// `variant` exists because /me renders the mobile and desktop settings
// trees concurrently (CSS-hidden ancestors): only the instance matching
// the current viewport fires, so the hidden tree never ends up holding an
// open sheet that pops in on a breakpoint crossing.

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  MOBILE_VIEWPORT_QUERY,
  PLAN_OPEN_PARAM,
  PLAN_OPEN_VALUE,
} from '../definitions/constants'

export type PlanOpenVariant = 'mobile' | 'desktop'

export const usePlanOpenParam = (
  onOpen: () => void,
  variant?: PlanOpenVariant,
) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (searchParams.get(PLAN_OPEN_PARAM) !== PLAN_OPEN_VALUE) return
    if (variant) {
      const mobileViewport = window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
      if ((variant === 'mobile') !== mobileViewport) return
    }
    onOpenRef.current()
    const params = new URLSearchParams(searchParams)
    params.delete(PLAN_OPEN_PARAM)
    const remaining = params.toString()
    router.replace(remaining ? `${pathname}?${remaining}` : pathname, {
      scroll: false,
    })
  }, [router, pathname, searchParams, variant])
}
