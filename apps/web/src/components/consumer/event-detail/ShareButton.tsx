'use client'

import { useState } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { ShareSheet } from '@/components/consumer/share/ShareSheet'
import { toPosterEvent, type PosterSource } from '@/lib/share/poster-event'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/**
 * The share affordance in the event hero — the mirror of `BackChip`.
 *
 * Geometry is copied from BackChip on purpose: the same 44px hit target around
 * the same 36px disc at the same `top`, offset by the same 4px, so the two
 * chips sit on one optical line. `right-2.5` opposite BackChip's `left-2.5`.
 *
 * There is no Watching affordance up here. Watching lives on the eye control
 * below the title, and the handoff is explicit that the hero carries Back and
 * Share only.
 */
const HIT_AREA_OFFSET_PX = 4

export interface ShareButtonProps {
  event: PosterSource
  /** The sharer's handle, or null for a logged-out or handle-less visitor. */
  handle?: string | null
  /**
   * Whether the visitor has a session. Required rather than defaulted: the
   * public mirror and the protected page mount this component with the same
   * props otherwise, and a default would silently record every public share as
   * whichever value was guessed here.
   */
  authed: boolean
  /** Matches BackChip's `top` so the two chips align. */
  top?: number
  className?: string
}

export const ShareButton = ({
  event,
  handle = null,
  authed,
  top = 56,
  className,
}: ShareButtonProps) => {
  const [open, setOpen] = useState(false)
  const poster = toPosterEvent(event)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          track('share_sheet_opened', {
            eventId: event.id,
            surface: 'event-detail',
            authed,
          })
        }}
        aria-label={CONSUMER_COPY.share.triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'absolute right-2.5 z-10 flex h-11 w-11 items-center justify-center',
          className,
        )}
        style={{ top: top - HIT_AREA_OFFSET_PX }}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            // Same reasoning as BackChip: `--scrim` puts dark ink on a dark
            // disc in Light mode over light artwork. A wash mixed from `--bg`
            // is opposite `--fg` in every theme by construction.
            background: open
              ? 'color-mix(in oklab, var(--accent) 26%, var(--bg))'
              : 'color-mix(in oklab, var(--bg) 82%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {/* The standard share glyph: a node graph, not a box-with-arrow —
              the latter reads as "open in new tab" on Android. */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="12" cy="3" r="2" stroke="var(--fg)" strokeWidth="1.6" />
            <circle cx="4" cy="8" r="2" stroke="var(--fg)" strokeWidth="1.6" />
            <circle
              cx="12"
              cy="13"
              r="2"
              stroke="var(--fg)"
              strokeWidth="1.6"
            />
            <path
              d="M5.8 7l4.4-2.6M5.8 9l4.4 2.6"
              stroke="var(--fg)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      <ShareSheet
        open={open}
        onClose={() => setOpen(false)}
        event={poster}
        handle={handle}
      />
    </>
  )
}
