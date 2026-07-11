'use client'

// Settings "Your plan" surface (PR 3.4, #780/#781/#782): resolves the
// lifecycle card from PlanState, dispatches its CTAs (portal navigation
// for paid plans, tier picker for upgrades), and owns the single
// TierPickerSheet shared by the card and the compare-plans entry.

import { useState } from 'react'
import type { PlanState } from '@concert-crawl/types'
import { TierPickerSheet } from '@/components/consumer/tier-picker'
import { TIER_PICKER_COPY } from '@/components/consumer/tier-picker/definitions/copy'
import { PlanCard } from './PlanCard'
import { resolvePlanCard } from './lib/resolve-plan-card'
import { usePortalNavigation } from './lib/use-portal-navigation'
import type { PlanCardCta } from './definitions/types'

export const PlanPanel = ({
  planState,
  scaRegion,
}: {
  planState: PlanState
  scaRegion: boolean
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { openPortal, portalPending, portalError, clearPortalError } =
    usePortalNavigation()
  const content = resolvePlanCard(planState)

  const dispatchCta = (cta: PlanCardCta) => {
    if (cta.action === 'portal') {
      openPortal()
      return
    }
    clearPortalError()
    setPickerOpen(true)
  }

  return (
    <div className="flex flex-col">
      <PlanCard
        content={content}
        onCtaClick={dispatchCta}
        ctaPending={portalPending}
      />

      {portalError && (
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
          {portalError}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          clearPortalError()
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
      />
    </div>
  )
}
