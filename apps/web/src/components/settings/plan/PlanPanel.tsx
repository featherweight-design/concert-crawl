'use client'

// Settings "Your plan" surface (PR 3.4 + PR 4.5, #780/#781/#782): resolves
// the lifecycle card from PlanState, dispatches its CTAs (in-app manage
// sheet for paid plans, one-tap resubscribe in cancel-grace, portal for
// billing tooling, tier picker for upgrades), and owns the TierPickerSheet
// + ManageSubscriptionSheet shared by the card entries.

import { useState } from 'react'
import type { PlanState, PickerEntry } from '@concert-crawl/types'
import { TierPickerSheet } from '@/components/consumer/tier-picker'
import { TIER_PICKER_COPY } from '@/components/consumer/tier-picker/definitions/copy'
import {
  usePlanOpenParam,
  type PlanOpenVariant,
} from '@/components/consumer/tier-picker/lib/use-plan-open-param'
import { PlanCard } from './PlanCard'
import { ManageSubscriptionSheet } from './manage'
import { formatPeriodEnd, resolvePlanCard } from './lib/resolve-plan-card'
import { usePortalNavigation } from './lib/use-portal-navigation'
import { useResubscribe } from './lib/use-resubscribe'
import type { PlanCardCta } from './definitions/types'

const MANAGEABLE_TIERS = ['supporter', 'premium', 'founder'] as const
type ManageableTier = (typeof MANAGEABLE_TIERS)[number]

const toManageableTier = (plan: PlanState['plan']): ManageableTier | null => {
  const match = MANAGEABLE_TIERS.find((tier) => tier === plan)
  return match ?? null
}

export const PlanPanel = ({
  planState,
  scaRegion,
  variant,
}: {
  planState: PlanState
  scaRegion: boolean
  variant?: PlanOpenVariant
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  // Tracks how the picker was opened, for the picker_viewed `entry` dimension.
  // The plan=open param is the landing target for lifecycle nudges (trial-end
  // takeover et al.), so a param-driven open is attributed to 'takeover'.
  const [pickerEntry, setPickerEntry] = useState<PickerEntry>('settings')
  const [manageOpen, setManageOpen] = useState(false)
  const { openPortal, portalPending, portalError, clearPortalError } =
    usePortalNavigation()
  const {
    resubscribe,
    resubscribePending,
    resubscribeError,
    clearResubscribeError,
  } = useResubscribe()
  const content = resolvePlanCard(planState)
  const manageTier = toManageableTier(planState.plan)

  // Lifecycle nudge CTAs land on /me?plan=open (PR 4.2) — auto-open the
  // picker, then strip the param. Both PlanPanel mounts (mobile + desktop
  // trees) run this; the variant gate ensures only the viewport-matching
  // instance opens its sheet.
  usePlanOpenParam(() => {
    setPickerEntry('takeover')
    setPickerOpen(true)
  }, variant)

  const dispatchCta = (cta: PlanCardCta) => {
    if (cta.action === 'portal') {
      clearResubscribeError()
      openPortal()
      return
    }
    if (cta.action === 'resubscribe') {
      clearPortalError()
      resubscribe()
      return
    }
    clearPortalError()
    clearResubscribeError()
    if (cta.action === 'manage-sheet' && manageTier !== null) {
      setManageOpen(true)
      return
    }
    setPickerEntry('settings')
    setPickerOpen(true)
  }

  const alertText = portalError ?? resubscribeError

  return (
    <div className="flex flex-col">
      <PlanCard
        content={content}
        onCtaClick={dispatchCta}
        ctaPending={portalPending || resubscribePending}
      />

      {alertText && (
        <div
          role="alert"
          className="mt-2 rounded-[10px] px-3 py-2 text-[12.5px]"
          style={{
            background:
              'color-mix(in oklch, var(--danger) 10%, var(--surface-1))',
            border:
              '1px solid color-mix(in oklch, var(--danger) 40%, var(--border))',
            color: 'var(--danger)',
            fontWeight: 600,
          }}
        >
          {alertText}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          clearPortalError()
          clearResubscribeError()
          setPickerEntry('settings')
          setPickerOpen(true)
        }}
        className="mt-2 w-full rounded-[10px] border border-border bg-surface-1 px-4 py-3 text-left transition-colors hover:border-border-strong"
        style={{ cursor: 'pointer' }}
      >
        <span
          className="text-[13px] font-bold"
          style={{ color: 'var(--signal)', letterSpacing: '-0.005em' }}
        >
          {TIER_PICKER_COPY.entry.compare}
        </span>
      </button>

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />

      {manageTier !== null && (
        <ManageSubscriptionSheet
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          tier={manageTier}
          periodEnd={formatPeriodEnd(planState.currentPeriodEnd)}
        />
      )}
    </div>
  )
}
