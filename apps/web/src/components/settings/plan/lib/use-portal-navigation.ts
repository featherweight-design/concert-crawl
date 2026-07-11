'use client'

// Stripe Billing Portal navigation for the plan card's manage/update-card
// CTAs. Mirrors the TierPickerSheet 'manage' action: token → portal
// session → full-page navigate. Only paid plans render portal CTAs.

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { navigateToPortalSession } from '@/lib/portal-navigation'
import { PLAN_CARD_COPY } from '../definitions/copy'

interface PortalNavigation {
  openPortal: () => void
  portalPending: boolean
  portalError: string | null
  clearPortalError: () => void
}

export const usePortalNavigation = (): PortalNavigation => {
  const { getToken } = useAuth()
  const [portalPending, setPortalPending] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const openPortal = useCallback(() => {
    void (async () => {
      setPortalPending(true)
      setPortalError(null)
      try {
        await navigateToPortalSession(getToken)
      } catch (err) {
        console.error('plan-panel: portal-session failed', err)
        setPortalError(PLAN_CARD_COPY.errors.portal)
      } finally {
        setPortalPending(false)
      }
    })()
  }, [getToken])

  const clearPortalError = useCallback(() => setPortalError(null), [])

  return { openPortal, portalPending, portalError, clearPortalError }
}
