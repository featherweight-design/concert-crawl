'use client'

// The Event Detail commit block, from design_handoff_event_detail_cta_tooltip
// /event-cta-v2.jsx:328-379 (CommitBlockV2, Direction D).
//
// One card holds three things in order: an eyebrow paired with the explainer
// tip, "I'm going!" full-width, and the Watch strip. The strip arrives as
// `children` rather than being rendered here, because it belongs to #1238 and
// carries its own data — this component only owns the card and the commitment.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
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
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'

// Structurally narrowed to the fields this row actually reads, so an
// EventDetailResponse satisfies it without dragging the whole payload into
// tests.
// Stands in for the server's attendingAt only while an optimistic commit is in
// flight. Never displayed — goingStateFor reads presence, not value.
const OPTIMISTIC_STAMP = 'optimistic'

export type GoingCtaEvent = Pick<
  EventDetailResponse,
  'id' | 'artist' | 'date' | 'status' | 'attendingAt'
> & { venue: Pick<EventDetailResponse['venue'], 'timezone'> }

export const EventDetailCtaBlock = ({
  event,
  scaRegion,
  children,
}: {
  event: GoingCtaEvent
  scaRegion: boolean
  /** The Watch strip. Rendered inside the card, and on its own whenever the
   *  commitment half is suppressed — watching a show never depends on Going. */
  children?: ReactNode
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

  // A cancelled show has no night to commit to (matching the API's history
  // filter, which excludes cancelled events outright), and the entitlement is
  // held until it resolves rather than flashing a locked treatment at a paying
  // user. Either way the strip still renders: watching is free and ungated, so
  // suppressing the commitment must never take the eye down with it.
  if (event.status === 'cancelled' || isLoading || surface === null) {
    return <>{children}</>
  }

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

  const supportLine: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: '0.03em',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        padding: 14,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 14,
      }}
    >
      {/* Eyebrow + tip share one row above the button, so the trigger has a
          line to belong to instead of floating in the gap. Living here also
          means the explainer survives `locked` and `error` — exactly when
          someone most wants to know what Going even is. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: -2,
          marginBottom: -3,
        }}
      >
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {isPast ? GOING_COPY.eyebrow.past : GOING_COPY.eyebrow.upcoming}
        </span>
        {/* No children: CCTip's own info disc is the designed trigger, and it
            carries the open state and the 44px touch target that a hand-rolled
            glyph here would silently replace. */}
        <CCTip tip="going-vs-watch" placement="bottom" align="end" />
      </div>

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

      {children}

      {/* Only a real failure or the gate earns a line here. The standing
          support line is gone — "we'll add this to your history" restated what
          the button just did. */}
      {state === 'error' ? (
        // The retry lives in the button; this line only names what survived, so
        // a failed commit never reads as having lost the watch too.
        <p role="alert" style={{ ...supportLine, color: 'var(--danger)' }}>
          {GOING_COPY.error.survived}
        </p>
      ) : state === 'locked' ? (
        // The gate line gets its own tip: "Concert History" is the thing being
        // sold, and the header tip explains the distinction, not the product.
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ ...supportLine, color: 'var(--fg-subtle)' }}>
            {GOING_COPY.locked.line}
          </span>
          <CCTip tip="concert-history" placement="top" align="start" />
        </div>
      ) : null}

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
