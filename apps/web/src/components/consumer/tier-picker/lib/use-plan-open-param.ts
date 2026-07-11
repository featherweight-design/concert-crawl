'use client'

// Auto-open hook for `/me?plan=open` (PR 4.2) — lifecycle nudge CTAs route
// here so the real tier picker (with checkout) takes over. Fires onOpen
// once, then strips the param from the URL so refresh/back doesn't reopen.

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PLAN_OPEN_PARAM, PLAN_OPEN_VALUE } from '../definitions/constants'

export const usePlanOpenParam = (onOpen: () => void) => {
  const router = useRouter()
  const pathname = usePathname()
  const firedRef = useRef(false)
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (firedRef.current) return
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get(PLAN_OPEN_PARAM) !== PLAN_OPEN_VALUE) return
      firedRef.current = true
      onOpenRef.current()
      params.delete(PLAN_OPEN_PARAM)
      const remaining = params.toString()
      router.replace(remaining ? `${pathname}?${remaining}` : pathname, {
        scroll: false,
      })
    } catch (err) {
      console.error('Failed to process plan-open param', err)
    }
  }, [router, pathname])
}
