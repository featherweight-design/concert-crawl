'use client'

import { useEffect, useState } from 'react'
import type { WatchingShow } from '@concert-crawl/types'
import { EventRow, fromWatchingShow } from '@/components/consumer/event-row'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { GoingNudge } from '@/components/consumer/going/GoingNudge'
import { isInNudgeWindow } from '@/lib/going/nudge-window'
import { markNudge, readNudgeState } from '@/lib/going/nudge-dismissal'
import type { NudgeOutcome } from '@/lib/going/nudge-dismissal'
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle'
import { isOptimisticWatchRow } from '@/lib/queries/optimistic-watch-row'

const COPY = CONSUMER_COPY.watching

interface WatchingRowProps {
  show: WatchingShow
  onRemove: (userEventId: string) => void
}

/**
 * Watching's row is `EventRow` plus the two things only this list has: the
 * remove control in the action gutter, and the going nudge below the row.
 * The nudge sits in the footer slot deliberately — it is outside the row's
 * four-line contract and spends none of the chip budget.
 */
export const WatchingRow = ({ show, onRemove }: WatchingRowProps) => {
  const attending = useAttendingToggle()

  // `undefined` means "not read yet". The record lives in localStorage, so the
  // server render can't know it — starting at undefined keeps the first client
  // paint identical to the server's and avoids a hydration mismatch.
  const [answered, setAnswered] = useState<NudgeOutcome | null | undefined>(
    undefined,
  )
  // Keyed on the watch row, so unwatching and re-watching clears the answer and
  // the nudge is free to ask again.
  useEffect(() => {
    setAnswered(readNudgeState(show.userEventId))
  }, [show.userEventId])

  // An optimistic row's id is a placeholder the server response replaces, so an
  // answer recorded against it would be forgotten the moment the real id lands
  // and the nudge would reappear. Hold it back for that one network hop.
  const nudging =
    answered === null &&
    !isOptimisticWatchRow(show.userEventId) &&
    isInNudgeWindow(show)

  const answer = (outcome: NudgeOutcome) => {
    markNudge(show.userEventId, outcome)
    setAnswered(outcome)
  }

  return (
    <EventRow
      show={fromWatchingShow(show)}
      surface="watching"
      action={
        <button
          type="button"
          aria-label={COPY.watchingItem.removeAriaLabel(show.artist)}
          onClick={() => onRemove(show.userEventId)}
          // A 28px paint box padded out to the 44px minimum target: the visible
          // control stays quiet without shrinking what a thumb has to hit.
          className="-m-2 flex h-11 w-11 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      }
      footer={
        nudging ? (
          <div className="mt-1.5">
            <GoingNudge
              show={show}
              onYes={() => {
                // Closes immediately — the mutation is optimistic, and re-asking
                // mid-flight would read as a failure. But the per-device record
                // is only written once the server agrees: persisting up front
                // would silently swallow a failed commitment and leave no way
                // to retry.
                setAnswered('going')
                attending.mutate(
                  { eventId: show.eventId, going: true },
                  {
                    onSuccess: () => markNudge(show.userEventId, 'going'),
                    onError: () => setAnswered(null),
                  },
                )
              }}
              onDismiss={() => answer('dismissed')}
            />
          </div>
        ) : null
      }
    />
  )
}
