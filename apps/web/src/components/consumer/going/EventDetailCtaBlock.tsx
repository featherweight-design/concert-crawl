'use client'

// The Event Detail commitment row (#70): "I'm going!" filling the width with one
// mono support line beneath.
//
// The Watch zone (eye + alerts hint + social proof) is a sibling block owned by
// #1238 and is deliberately untouched — this row only adds the forward action.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  EventDetailResponse,
  PlanState,
  PickerEntry,
} from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { GoingButton } from './GoingButton'
import { goingStateFor } from './lib/cta-state'
import { GOING_COPY } from './definitions/copy'

// The tier picker needs a full PlanState; logged-out viewers (and the
// fail-closed fetch-error case) have none, so mirror derivePlanState's
// logged-out shape, as TasteFilterChip does.
const LOGGED_OUT_PLAN_STATE: PlanState = {
  plan: 'logged-out',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

// Structurally narrowed to the fields this row actually reads, so an
// EventDetailResponse satisfies it without dragging the whole payload into
// tests.
export type GoingCtaEvent = Pick<
  EventDetailResponse,
  'id' | 'artist' | 'date' | 'status' | 'attendingAt'
> & { venue: Pick<EventDetailResponse['venue'], 'timezone'> }

export const EventDetailCtaBlock = ({
  event,
  scaRegion,
}: {
  event: GoingCtaEvent
  scaRegion: boolean
}) => {
  const router = useRouter()
  const { isLoading, active, surface } = useEntitlement('concert-history')
  const { data: planState } = usePlanState()
  const toggle = useAttendingToggle()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerEntry, setPickerEntry] = useState<PickerEntry>('paywall')
  const [failed, setFailed] = useState(false)

  // A cancelled show has no night to commit to — matches the API's history
  // filter, which excludes cancelled events outright.
  if (event.status === 'cancelled') return null

  // Hold while the plan resolves rather than flashing a locked treatment at a
  // paying user (the documented contract on useEntitlement).
  if (isLoading || surface === null) return null

  const state = goingStateFor({
    date: event.date,
    attendingAt: event.attendingAt,
    timezone: event.venue.timezone,
  })

  const openUpgrade = () => {
    setPickerEntry(
      surface === 'tier-picker-on-tap' ? 'logged-out-paywall' : 'paywall',
    )
    setPickerOpen(true)
  }

  const onChange = (going: boolean) => {
    if (!active) {
      // Locked: the button is the discovery surface for the perk, so a tap
      // routes to the upgrade path instead of mutating anything.
      openUpgrade()
      return
    }
    setFailed(false)
    toggle.mutate(
      { eventId: event.id, going },
      {
        // Event Detail is server-rendered, so the fresh attendingAt arrives
        // via a refresh — the same pattern EventDetailClient uses elsewhere.
        onSuccess: () => router.refresh(),
        onError: (err) => {
          // A stale client entitlement can lose a race with server-side
          // enforcement. The API brands that 403, so route to the same upgrade
          // path a locked tap takes instead of showing a generic failure.
          if (err instanceof ApiError && err.code === 'entitlement_required') {
            openUpgrade()
            return
          }
          setFailed(true)
        },
      },
    )
  }

  return (
    <div>
      {/* Full width down to 320px — the button ellipsizes its own label, so
          nothing here needs a fixed floor. */}
      <GoingButton
        show={{ eventId: event.id, artist: event.artist, date: event.date }}
        state={state}
        size="lg"
        fullWidth
        pending={toggle.isPending}
        onChange={onChange}
      />

      <p
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.02em',
          color: failed ? 'var(--danger)' : 'var(--fg-subtle)',
        }}
      >
        {failed
          ? GOING_COPY.error.failed
          : event.attendingAt
            ? GOING_COPY.support.going
            : GOING_COPY.support.default}
      </p>

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />
    </div>
  )
}
