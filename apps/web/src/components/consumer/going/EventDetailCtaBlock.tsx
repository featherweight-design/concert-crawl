'use client'

// The Event Detail commitment row (#70): "I'm going!" filling the width with one
// mono support line beneath.
//
// The Watch zone (eye + alerts hint + social proof) is a sibling block owned by
// #1238 and is deliberately untouched — this row only adds the forward action.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EventDetailResponse, PickerEntry } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { CCTip } from '@/components/ui/cc-tip'
import { GoingButton } from './GoingButton'
import { goingStateFor } from './lib/cta-state'
import { GOING_COPY } from './definitions/copy'
import type { TipContent } from '@/components/ui/cc-tip'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'

// Structurally narrowed to the fields this row actually reads, so an
// EventDetailResponse satisfies it without dragging the whole payload into
// tests.
// Stands in for the server's attendingAt only while an optimistic commit is in
// flight. Never displayed — goingStateFor reads presence, not value.
const OPTIMISTIC_STAMP = 'optimistic'

const DISC_SIZE = 22
const TAP_TARGET = 44

// The going-vs-watch distinction as a CCTip record. It stays a one-line `text`
// tip so the popover reads as a sentence rather than a titled panel.
const GOING_EXPLAINER_TIP: TipContent = {
  label: GOING_COPY.explainer.triggerLabel,
  variant: 'text',
  body: GOING_COPY.explainer.content,
}

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
  // Holds the *intent* that failed, not just that something did. The error
  // button can't re-derive it: the `error` treatment reports as off, so a
  // failed release would retry as a mark-going no-op. `null` means no failure.
  const [failedIntent, setFailedIntent] = useState<boolean | null>(null)
  // Event Detail is server-rendered, so the committed state only arrives on the
  // router.refresh() round-trip. Holding the tapped value locally lets the
  // button answer the tap immediately instead of sitting inert for a network
  // hop. `null` means "no pending override — trust the server".
  const [optimisticGoing, setOptimisticGoing] = useState<boolean | null>(null)

  const serverGoing = event.attendingAt !== null

  // Retire the override only when a refresh actually delivers new server state
  // that agrees with it. Clearing on the mutation callback would drop it before
  // the new HTML arrives and flash the old state back. Comparing against the
  // value alone isn't enough either: toggle twice before the first refresh lands
  // and the second override already matches the stale server value, so it would
  // clear early and let the first refresh flash the wrong state.
  const lastServerGoing = useRef(serverGoing)
  useEffect(() => {
    const changed = lastServerGoing.current !== serverGoing
    lastServerGoing.current = serverGoing
    if (changed && serverGoing === optimisticGoing) {
      setOptimisticGoing(null)
    }
  }, [serverGoing, optimisticGoing])

  // A cancelled show has no night to commit to — matches the API's history
  // filter, which excludes cancelled events outright.
  if (event.status === 'cancelled') return null

  // Hold while the plan resolves rather than flashing a locked treatment at a
  // paying user (the documented contract on useEntitlement).
  if (isLoading || surface === null) return null

  // goingStateFor only reads attendingAt for presence, but the past-yes label
  // renders the show date rather than this stamp, so a placeholder is safe.
  const attendingAt =
    optimisticGoing === null
      ? event.attendingAt
      : optimisticGoing
        ? (event.attendingAt ?? OPTIMISTIC_STAMP)
        : null

  const serverState = goingStateFor({
    date: event.date,
    attendingAt,
    timezone: event.venue.timezone,
  })

  // Past rows are read-only displays of something that already happened and have
  // nothing left to sell, so neither gate touches them. Among the rest `locked`
  // outranks `error`: a locked tap routes to the upgrade path and never retries
  // anything, so offering a retry the button can't honour would lie.
  const isPast = serverState === 'past-yes' || serverState === 'past-no'
  const state = isPast
    ? serverState
    : !active
      ? 'locked'
      : failedIntent !== null
        ? 'error'
        : serverState

  const openUpgrade = () => {
    // Signed out this is a reach for Concert History, not the taste paywall —
    // the entry keys the gate's copy as well as the funnel dimension.
    setPickerEntry(
      surface === 'tier-picker-on-tap' ? 'logged-out-going' : 'paywall',
    )
    setPickerOpen(true)
  }

  const onChange = (tapped: boolean) => {
    // A retry replays the intent that failed rather than whatever the error
    // treatment itself reports.
    const going =
      state === 'error' && failedIntent !== null ? failedIntent : tapped
    if (!active) {
      // Locked: the button is the discovery surface for the perk, so a tap
      // routes to the upgrade path instead of mutating anything.
      openUpgrade()
      return
    }
    setFailedIntent(null)
    setOptimisticGoing(going)
    toggle.mutate(
      { eventId: event.id, going },
      {
        // Event Detail is server-rendered, so the fresh attendingAt arrives
        // via a refresh — the same pattern EventDetailClient uses elsewhere.
        onSuccess: () => router.refresh(),
        onError: (err) => {
          setOptimisticGoing(null)
          // A stale client entitlement can lose a race with server-side
          // enforcement. The API brands that 403, so route to the same upgrade
          // path a locked tap takes instead of showing a generic failure.
          if (err instanceof ApiError && err.code === 'entitlement_required') {
            openUpgrade()
            return
          }
          setFailedIntent(going)
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

      {/* The standing support line is gone — "we'll add this to your history"
          restated what the button just did, and the going-vs-watch distinction
          now lives behind the tooltip. Only a real failure earns a line here. */}
      {state === 'error' ? (
        // The retry lives in the button; this line only names what survived, so
        // a failed commit never reads as having lost the watch too.
        <p
          role="alert"
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.02em',
            color: 'var(--danger)',
          }}
        >
          {GOING_COPY.error.survived}
        </p>
      ) : state === 'locked' ? (
        <p
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.02em',
            color: 'var(--fg-subtle)',
          }}
        >
          {GOING_COPY.locked.line}
        </p>
      ) : (
        <div style={{ marginTop: 6 }}>
          <CCTip
            tip={GOING_EXPLAINER_TIP}
            // The target is 44px for thumbs; the negative margin pulls the extra
            // padding back out of the layout so the visible disc still sits
            // exactly where a 22px control would.
            triggerStyle={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: TAP_TARGET,
              height: TAP_TARGET,
              margin: -(TAP_TARGET - DISC_SIZE) / 2,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: DISC_SIZE,
                height: DISC_SIZE,
                borderRadius: '50%',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ?
            </span>
          </CCTip>
        </div>
      )}

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
