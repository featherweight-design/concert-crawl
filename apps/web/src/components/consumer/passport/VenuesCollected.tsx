import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import type { CollectedVenue } from '@/lib/passport/booklet';

const COPY = CONSUMER_COPY.passport;

/** Five across still fits a 320px phone. */
const TILE_SIZE = 56;

interface VenuesCollectedProps {
  venues: CollectedVenue[];
  collected: number;
  total: number;
}

/**
 * Every active venue as its tile: lit with a check once it has a stamp, an
 * empty slot until then. The total is the live active count, never a fixed 21.
 */
export function VenuesCollected({
  venues,
  collected,
  total,
}: VenuesCollectedProps) {
  if (total === 0) return null;
  return (
    <section aria-label={COPY.venuesCollected} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <h2 className="text-fg-subtle">{COPY.venuesCollected}</h2>
        <span className="font-bold text-signal">
          {COPY.collectedCount(collected, total)}
        </span>
      </div>
      <ul className="grid grid-cols-5 gap-2 lg:gap-3">
        {venues.map((venue) => (
          <li
            key={venue.slug}
            data-venue-collected={venue.collected ? 'yes' : 'no'}
            className="relative flex justify-center"
          >
            <span
              style={
                venue.collected
                  ? undefined
                  : { filter: 'grayscale(1)', opacity: 0.28 }
              }
              // 56px where the row has room; below 400px the five tiles step
              // back to 48 so a 320px phone still fits them.
              className="inline-flex max-[399px]:scale-[0.857]"
            >
              <VenueTile
                slug={venue.slug}
                name={venue.name}
                size={TILE_SIZE}
                labelled
              />
            </span>
            {venue.collected && (
              <span className="sr-only">{`, ${COPY.collectedSuffix}`}</span>
            )}
            {venue.collected && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-[var(--success)] text-bg"
              >
                <svg width="10" height="10" viewBox="0 0 24 24">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
