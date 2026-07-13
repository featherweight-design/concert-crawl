'use client'

// Settings entry point for the tier picker — a quiet "Compare plans"
// affordance under the PlanCard (both mobile SettingsRoute and desktop
// SettingsRouteDesktop mount it for behavioral parity). Feature gating
// primitives live in @/lib/queries/use-entitlement (client) and the API's
// requireFeature() middleware (server) — see PR 3.3.

import { useState } from 'react'
import type { PlanState, PickerEntry } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from './definitions/copy'
import { TierPickerSheet } from './TierPickerSheet'
import {
  usePlanOpenParam,
  type PlanOpenVariant,
} from './lib/use-plan-open-param'

export const TierPickerEntry = ({
  planState,
  scaRegion,
  variant,
}: {
  planState: PlanState
  scaRegion: boolean
  variant?: PlanOpenVariant
}) => {
  const [open, setOpen] = useState(false)
  // Open source, for the picker_viewed `entry` dimension (spec §8): the
  // plan=open param is the lifecycle-nudge (takeover) landing target.
  const [entry, setEntry] = useState<PickerEntry>('settings')

  // Lifecycle nudge CTAs land on /me?plan=open (PR 4.2) — auto-open the
  // picker, then strip the param. The variant gate keeps concurrent
  // mobile/desktop mounts from both opening.
  usePlanOpenParam(() => {
    setEntry('takeover')
    setOpen(true)
  }, variant)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEntry('settings')
          setOpen(true)
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
        open={open}
        onClose={() => setOpen(false)}
        planState={planState}
        scaRegion={scaRegion}
        entry={entry}
      />
    </>
  )
}
