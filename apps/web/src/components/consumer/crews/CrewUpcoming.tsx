import Link from 'next/link';
import type { CrewShow } from '@concert-crawl/types';

import { CrewComingUpRow } from './CrewComingUpRow';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY.comingUp;

interface CrewUpcomingProps {
  shows: CrewShow[];
  /** The viewer's user id in this crew, or null when they cannot be found. */
  viewerId: string | null;
}

/**
 * Coming up (`41/crew-coming-up`): the crew's shows by date, one row each, the
 * same width on a phone and on a desktop. The API already sorts them, so a
 * show tonight leads. With nothing yet the card says so and points at Browse,
 * in the Been there card's dashed style.
 */
export const CrewUpcoming = ({ shows, viewerId }: CrewUpcomingProps) => {
  if (shows.length === 0) {
    return (
      <div
        data-testid="crew-coming-up-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '24px 20px',
          textAlign: 'center',
          borderRadius: 16,
          border: '1px dashed var(--border-strong)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--fg)',
          }}
        >
          {COPY.nothingTitle}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {COPY.nothingBody}
        </p>
        <Link
          href="/events"
          style={{
            marginTop: 10,
            padding: '10px 18px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            color: 'var(--fg-on-accent)',
            background:
              'linear-gradient(135deg, var(--signal), var(--cta-end))',
          }}
        >
          {COPY.findShow}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {shows.map((show) => (
        <CrewComingUpRow key={show.eventId} show={show} viewerId={viewerId} />
      ))}
    </div>
  );
};
