'use client'

// Settings entry point for the tier picker — a quiet "Compare plans"
// affordance under the PlanCard (both mobile SettingsRoute and desktop
// SettingsRouteDesktop mount it for behavioral parity). Feature gating
// primitives live in @/lib/queries/use-entitlement (client) and the API's
// requireFeature() middleware (server) — see PR 3.3.

import { useState } from 'react'
import type { PlanState } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from './definitions/copy'
import { TierPickerSheet } from './TierPickerSheet'

export const TierPickerEntry = ({
  planState,
  scaRegion,
}: {
  planState: PlanState
  scaRegion: boolean
}) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
      />
    </>
  )
}
