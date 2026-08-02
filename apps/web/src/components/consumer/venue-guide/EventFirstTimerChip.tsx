import type { GuideViewerMode } from '@concert-crawl/types'
import Link from 'next/link'
import { CONSUMER_COPY } from '../definitions/copy'
import { GUIDE_ANCHOR_ID } from './FirstTimerCallout'
import { venueShortName } from './lib'

const copy = CONSUMER_COPY.venueGuide

interface EventFirstTimerChipProps {
  venueName: string
  venueSlug: string
  /** Whether the venue has actually published a guide to link to. */
  venueGuidePublished: boolean
  mode: GuideViewerMode
}

/**
 * Signal-tinted pill on the event detail page pointing at the venue's guide.
 * Deliberately NOT accent — accent belongs to the Watching commit action sitting
 * beside it, and this is a "go read something" link, not a commitment.
 */
export const EventFirstTimerChip = ({
  venueName,
  venueSlug,
  venueGuidePublished,
  mode,
}: EventFirstTimerChipProps) => {
  if (!venueGuidePublished) return null
  if (mode !== 'first_timer') return null

  return (
    <Link
      href={`/venues/${venueSlug}#${GUIDE_ANCHOR_ID}`}
      data-testid="event-first-timer-chip"
      className="inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
      // The link is the touch target and stays unpainted, so clearing the 44px
      // floor adds transparent height above and below rather than growing the
      // pill. The painted 32px pill is the inner span.
      style={{ minHeight: 44, borderRadius: 999, color: 'var(--signal)' }}
    >
      <span
        className="inline-flex items-center"
        style={{
          gap: 6,
          height: 32,
          padding: '0 11px',
          borderRadius: 999,
          background: 'color-mix(in oklab, var(--signal) 14%, transparent)',
          border:
            '1px solid color-mix(in oklab, var(--signal) 34%, transparent)',
        }}
      >
        <svg
          width={13}
          height={13}
          viewBox="0 0 20 20"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="5" cy="14.5" r="1.6" fill="currentColor" opacity={0.55} />
          <circle cx="10" cy="10" r="2.1" fill="currentColor" opacity={0.8} />
          <circle cx="15" cy="5" r="2.8" fill="currentColor" />
        </svg>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '-0.005em',
          }}
        >
          {copy.eventChip(venueShortName(venueName))}
        </span>
        <span aria-hidden="true" style={{ fontSize: '13px', fontWeight: 700 }}>
          {copy.eventChipArrow}
        </span>
      </span>
    </Link>
  )
}
