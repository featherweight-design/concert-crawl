import { type VenueGuide, deriveGuideDensity } from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'
import { venueShortName } from './lib'

const copy = CONSUMER_COPY.venueGuide

/** Anchor id the callout jumps to, and the id `GuideSection` renders with. */
export const GUIDE_ANCHOR_ID = 'ft-guide'

interface FirstTimerCalloutProps {
  venueName: string
  guide: VenueGuide
}

/**
 * The "New here" nudge directly above the guide. It carries no jump control —
 * the guide it would scroll to is already on screen beneath it.
 */
export const FirstTimerCallout = ({
  venueName,
  guide,
}: FirstTimerCalloutProps) => {
  const shortName = venueShortName(venueName)
  const density = deriveGuideDensity({
    chips: guide.chips,
    insiderTip: guide.insiderTip,
  })

  return (
    <div
      data-testid="first-timer-callout"
      className="flex items-center"
      style={{
        gap: 12,
        padding: '13px 14px',
        borderRadius: 12,
        background: 'color-mix(in oklab, var(--accent) 12%, var(--bg))',
        border: '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'color-mix(in oklab, var(--accent) 20%, transparent)',
        }}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 20 20"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="5"
            cy="14.5"
            r="1.6"
            fill="var(--accent)"
            opacity={0.55}
          />
          <circle cx="10" cy="10" r="2.1" fill="var(--accent)" opacity={0.8} />
          <circle cx="15" cy="5" r="2.8" fill="var(--signal)" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          {copy.calloutEyebrow}
        </span>
        <p
          style={{
            marginTop: 3,
            fontSize: '15.5px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
          }}
        >
          {copy.callout.question(shortName)}
        </p>
        <p
          style={{
            marginTop: 2,
            fontSize: '12.5px',
            lineHeight: 1.4,
            textWrap: 'pretty',
            color: 'var(--fg-muted)',
          }}
        >
          {density === 'thin'
            ? copy.callout.thinSub
            : copy.callout.populatedSub}
        </p>
      </div>
    </div>
  )
}
