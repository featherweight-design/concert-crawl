import Link from 'next/link';
import type { CrewShow } from '@concert-crawl/types';

import { CrewPatch } from '@/components/consumer/crew-patch';
import { EventRow, fromCrewShow } from '@/components/consumer/event-row';
import { EmptyState } from '@/components/consumer/empty-state';
import { groupInOrder } from './lib/format';
import { pillPrimary } from './lib/styles';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface CrewLensListProps {
  crewId: string;
  crewName: string;
  shows: CrewShow[];
  /** A load failure, which is not the same state as a crew going to nothing. */
  failed?: boolean;
  /**
   * Browse's current URL with only `crew` removed. Passed in rather than
   * hardcoded to `/events`, so clearing the lens keeps the view and filters the
   * viewer already chose.
   */
  clearLensHref: string;
}

/**
 * Browse's own date-grouped list, seen through a crew. The rows are the shipped
 * `EventRow` on the `crewLens` surface, not a fork: the date headers run the
 * list exactly as they do on Browse, so the surface declares the date carried
 * and the row drops it.
 */
export const CrewLensList = ({
  crewId,
  crewName,
  shows,
  failed = false,
  clearLensHref,
}: CrewLensListProps) => {
  if (failed) {
    return (
      <EmptyState
        state="filtered"
        eyebrow={COPY.lens.failedEyebrow}
        title={COPY.lens.failedTitle}
        body={COPY.lens.failedBody}
        railLabel={COPY.lens.failedRail}
        secondaryCta={{ label: COPY.lens.emptyCta, href: clearLensHref }}
      />
    );
  }

  // B+ (bp-s-empty_crewlens_m): the generic hex patch over the words, in a
  // dashed card, and the way out as the primary action (addendum 5 item 13:
  // the board draws the generic patch here, not the crew's own).
  if (shows.length === 0) {
    return (
      <section
        className="flex flex-col items-center gap-3 text-center"
        style={{
          padding: '28px 20px 30px',
          borderRadius: 20,
          border: '1.5px dashed var(--border-strong)',
        }}
      >
        <span aria-hidden="true" className="pb-2">
          <CrewPatch crewId={crewId} generic size={76} scale="hero" />
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--accent)',
          }}
        >
          {COPY.lens.emptyEyebrow}
        </span>
        <h2
          style={{
            margin: 0,
            maxWidth: 320,
            fontFamily: 'var(--font-ui)',
            fontSize: 25,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            textWrap: 'balance',
            color: 'var(--fg)',
          }}
        >
          {COPY.lens.emptyTitle}
        </h2>
        <p
          style={{
            margin: 0,
            maxWidth: 300,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            textWrap: 'pretty',
            color: 'var(--fg-muted)',
          }}
        >
          {COPY.lens.emptyBody(crewName)}
        </p>
        <Link
          href={clearLensHref}
          style={{ ...pillPrimary, marginTop: 6, padding: '0 22px' }}
        >
          {COPY.lens.emptyCta}
        </Link>
      </section>
    );
  }

  const groups = groupInOrder(shows, (show) => show.iso);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 15.5,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {group.items[0]
              ? fromCrewShow(group.items[0]).dateLabel
              : group.key}
          </h2>
          <div className="flex flex-col">
            {group.items.map((show, index) => (
              <div
                key={show.eventId}
                style={{
                  borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <EventRow show={fromCrewShow(show)} surface="crewLens" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
