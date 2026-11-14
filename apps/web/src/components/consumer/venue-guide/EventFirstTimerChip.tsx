import type { GuideViewerMode } from '@concert-crawl/types';
import Link from 'next/link';
import { CONSUMER_COPY } from '../definitions/copy';
import { GUIDE_ANCHOR_ID } from './FirstTimerCallout';
import { venueShortName } from './lib';

const copy = CONSUMER_COPY.venueGuide;

interface EventFirstTimerChipProps {
  venueName: string;
  venueSlug: string;
  /** Whether the venue has actually published a guide to link to. */
  venueGuidePublished: boolean;
  mode: GuideViewerMode;
  /**
   * Where this copy sits. The phone board draws it under Ages in the value
   * column, the desktop board level with the Venue row, so the page renders
   * one of each and CSS shows the right one. Default: always.
   */
  placement?: 'always' | 'phone' | 'desktop';
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
  placement = 'always',
}: EventFirstTimerChipProps) => {
  if (!venueGuidePublished) return null;
  if (mode !== 'first_timer') return null;

  return (
    <Link
      href={`/venues/${venueSlug}#${GUIDE_ANCHOR_ID}`}
      data-testid={
        placement === 'phone'
          ? 'event-first-timer-chip-phone'
          : 'event-first-timer-chip'
      }
      className={`items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] ${
        placement === 'phone'
          ? 'inline-flex lg:hidden'
          : placement === 'desktop'
            ? 'hidden lg:inline-flex'
            : 'inline-flex'
      }`}
      // The link is the touch target and stays unpainted, so clearing the 44px
      // floor adds transparent height above and below rather than growing the
      // pill. The painted 32px pill is the inner span.
      style={{ minHeight: 44, borderRadius: 8, color: 'var(--signal)' }}
    >
      <span
        className="inline-flex items-center"
        style={{
          gap: 6,
          height: 32,
          padding: '0 11px',
          // A small rounded rectangle with text and an arrow, no leading
          // glyph (bp-event, bp-m-event_m_end).
          borderRadius: 8,
          background: 'color-mix(in oklab, var(--signal) 14%, transparent)',
          border:
            '1px solid color-mix(in oklab, var(--signal) 34%, transparent)',
        }}
      >
        <span
          style={{
            fontSize: '13px',
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
  );
};
