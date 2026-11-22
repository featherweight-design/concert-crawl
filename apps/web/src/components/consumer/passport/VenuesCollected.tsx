import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { venueTileCaption } from '@/components/consumer/venue-guide/lib';
import type { CollectedVenue } from '@/lib/passport/booklet';

const COPY = CONSUMER_COPY.passport;

/** Addendum 9 item 3: the glyph at 48 with its caption underneath. */
const TILE_SIZE = 48;

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
    <section
      aria-label={COPY.venuesCollected}
      data-testid="passport-venues-collected"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <h2 className="text-fg-subtle">{COPY.venuesCollected}</h2>
        <span className="font-bold text-signal">
          {COPY.collectedCount(collected, total)}
        </span>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-x-2 gap-y-2.5">
        {venues.map((venue) => (
          <li
            key={venue.slug}
            data-venue-collected={venue.collected ? 'yes' : 'no'}
            className="flex min-w-0 flex-col items-center gap-[5px]"
          >
            <span className="relative inline-flex">
              <span
                style={
                  venue.collected
                    ? undefined
                    : { filter: 'grayscale(1)', opacity: 0.28 }
                }
                className="inline-flex"
              >
                <VenueTile
                  slug={venue.slug}
                  name={venue.name}
                  size={TILE_SIZE}
                  labelled
                />
              </span>
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
            </span>
            {venue.collected && (
              <span className="sr-only">{`, ${COPY.collectedSuffix}`}</span>
            )}
            <span
              aria-hidden="true"
              className={`line-clamp-2 h-[26px] w-full text-center text-[10.5px] leading-[1.2] [overflow-wrap:anywhere] ${
                venue.collected
                  ? 'font-semibold text-fg'
                  : 'font-medium text-fg-subtle'
              }`}
            >
              {venueTileCaption(venue.name, venue.shortName)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
