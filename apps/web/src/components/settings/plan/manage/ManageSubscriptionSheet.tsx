'use client'

// #780 manage-subscription controller (PR 4.5). Owns which surface shows —
// the two-group manage sheet or one of the cancel/downgrade/upgrade confirm
// flows — plus the lifecycle mutations and the proration previews.
//
// Tier routing: Premium and Founder "Change plan" → DowngradeFlow (founder is
// a valid change-tier *source* — #780 decision 6 routes its retention into
// the Supporter downgrade; it is only blocked as a *target*, which the API
// 409s with 'founder_not_switchable'); Supporter → UpgradeFlow. The cancel
// retention nudge's "Switch to Supporter instead" follows the same routing.

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CancelFlow } from './CancelFlow'
import { DowngradeFlow } from './DowngradeFlow'
import { LifecycleSurface } from './LifecycleSurface'
import { ManageSheet } from './ManageSheet'
import { UpgradeFlow } from './UpgradeFlow'
import {
  CANCEL_FLOW_COPY,
  DOWNGRADE_FLOW_COPY,
  MANAGE_SHEET_COPY,
  UPGRADE_FLOW_COPY,
} from './definitions/copy'
import { SURFACE_DESKTOP_WIDTH } from './definitions/constants'
import type { ManageSurface, PaidTier } from './definitions/types'
import { formatDollarsFromCents } from './lib/format-amount'
import { useIsMobileViewport } from './lib/use-is-mobile-viewport'
import { useLifecycleActions } from './lib/use-lifecycle-actions'
import { useProrationPreview } from './lib/use-proration-preview'
import { usePortalNavigation } from '../lib/use-portal-navigation'

const SURFACE_ARIA_LABEL: Record<ManageSurface, string> = {
  manage: MANAGE_SHEET_COPY.ariaLabel,
  cancel: CANCEL_FLOW_COPY.ariaLabel,
  downgrade: DOWNGRADE_FLOW_COPY.ariaLabel,
  upgrade: UPGRADE_FLOW_COPY.ariaLabel,
}

interface ManageSubscriptionSheetProps {
  open: boolean
  onClose: () => void
  tier: PaidTier
  /** Pre-formatted current period end via formatPeriodEnd (e.g. "Jul 15") or null. */
  periodEnd: string | null
}

export const ManageSubscriptionSheet = ({
  open,
  onClose,
  tier,
  periodEnd,
}: ManageSubscriptionSheetProps) => {
  const [surface, setSurface] = useState<ManageSurface>('manage')
  const isMobile = useIsMobileViewport()
  const { isSignedIn } = useAuth()

  const { openPortal, portalPending, portalError, clearPortalError } =
    usePortalNavigation({ newTab: true })
  const { cancel, changeTier, pending, errorText, clearError } =
    useLifecycleActions()

  // Every open starts back at the manage sheet with stale errors cleared.
  useEffect(() => {
    if (!open) return
    setSurface('manage')
    clearError()
    clearPortalError()
  }, [open, clearError, clearPortalError])

  const downgradePreview = useProrationPreview(
    'supporter',
    Boolean(isSignedIn) && open && surface === 'downgrade',
  )
  const upgradePreview = useProrationPreview(
    'premium',
    Boolean(isSignedIn) && open && surface === 'upgrade',
  )

  const showSurface = (next: ManageSurface) => {
    clearError()
    setSurface(next)
  }

  const openChangePlan = () => {
    if (tier === 'supporter') showSurface('upgrade')
    else showSurface('downgrade')
  }

  const switchToSupporterFromCancel = () => showSurface('downgrade')

  return (
    <LifecycleSurface
      open={open}
      onClose={onClose}
      ariaLabel={SURFACE_ARIA_LABEL[surface]}
      desktopWidth={SURFACE_DESKTOP_WIDTH[surface]}
    >
      {surface === 'manage' && (
        <ManageSheet
          tier={tier}
          periodEnd={periodEnd}
          wide={!isMobile}
          portalPending={portalPending}
          errorText={portalError}
          onChangePlan={openChangePlan}
          onCancel={() => showSurface('cancel')}
          onPortal={openPortal}
        />
      )}

      {surface === 'cancel' && (
        <CancelFlow
          tier={tier}
          periodEnd={periodEnd}
          wide={!isMobile}
          pending={pending}
          errorText={errorText}
          onConfirm={() => cancel(onClose)}
          onSwitchToSupporter={switchToSupporterFromCancel}
          onKeep={() => showSurface('manage')}
        />
      )}

      {surface === 'downgrade' && (
        <DowngradeFlow
          creditText={
            downgradePreview.data
              ? formatDollarsFromCents(downgradePreview.data.creditCents)
              : null
          }
          wide={!isMobile}
          pending={pending}
          // isLoading (not isPending) so a failed preview re-enables confirm —
          // the API re-runs its own preview before mutating anyway.
          confirmDisabled={downgradePreview.isLoading}
          errorText={errorText}
          onConfirm={() => changeTier('supporter', onClose)}
          onBack={() => showSurface('manage')}
        />
      )}

      {surface === 'upgrade' && (
        <UpgradeFlow
          proratedText={
            upgradePreview.data
              ? formatDollarsFromCents(upgradePreview.data.amountDueCents)
              : null
          }
          wide={!isMobile}
          pending={pending}
          confirmDisabled={upgradePreview.isLoading}
          errorText={errorText}
          onConfirm={() => changeTier('premium', onClose)}
          onBack={() => showSurface('manage')}
        />
      )}
    </LifecycleSurface>
  )
}
