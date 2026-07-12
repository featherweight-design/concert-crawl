'use client'

// Stripe Billing Portal navigation for the plan card's manage/update-card
// CTAs. Mirrors the TierPickerSheet 'manage' action: token → portal
// session → navigate. Only paid plans render portal CTAs. The manage sheet
// passes newTab: true — its group eyebrow promises "Opens Stripe in a new
// tab" (#780) — while the plan card keeps the full-page navigate.

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  navigateToPortalSession,
  openPortalSessionInNewTab,
} from '@/lib/portal-navigation'
import { PLAN_CARD_COPY } from '../definitions/copy'

interface PortalNavigationOptions {
  newTab?: boolean
}

interface PortalNavigation {
  openPortal: () => void
  portalPending: boolean
  portalError: string | null
  clearPortalError: () => void
}

export const usePortalNavigation = ({
  newTab = false,
}: PortalNavigationOptions = {}): PortalNavigation => {
  const { getToken } = useAuth()
  const [portalPending, setPortalPending] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const openPortal = useCallback(() => {
    void (async () => {
      setPortalPending(true)
      setPortalError(null)
      try {
        // The new-tab variant opens its tab synchronously inside this click
        // gesture (popup blockers), so no awaits may precede this call.
        await (newTab
          ? openPortalSessionInNewTab(getToken)
          : navigateToPortalSession(getToken))
      } catch (err) {
        console.error('plan-panel: portal-session failed', err)
        setPortalError(PLAN_CARD_COPY.errors.portal)
      } finally {
        setPortalPending(false)
      }
    })()
  }, [getToken, newTab])

  const clearPortalError = useCallback(() => setPortalError(null), [])

  return { openPortal, portalPending, portalError, clearPortalError }
}
