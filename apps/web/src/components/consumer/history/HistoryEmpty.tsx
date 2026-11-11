// Entitled user with nothing behind them yet (#70),
// design_handoff_concert_history/history-routes.jsx:57-93.
//
// Reuses the shipped EmptyState so History matches Watching's "Crickets."
// treatment instead of forking a second empty-state look. B+ (rule 4,
// `bp-s-empty_concerts_m`) swaps the old ticket stub above it for three
// overlapping dashed venue stamps, inked grey: stamps not yet earned.

import { EmptyState } from '@/components/consumer/empty-state';
import { VenueStamp } from '@/components/consumer/venue-stamp';
import { HISTORY_COPY } from './definitions/copy';

const COPY = HISTORY_COPY.empty;

// Fixed venues so the empty state never shifts between renders.
const PLACEHOLDER_STAMPS = [
  { slug: 'bluebird-theater', name: 'Bluebird Theater' },
  { slug: 'mission-ballroom', name: 'Mission Ballroom' },
  { slug: 'red-rocks-amphitheatre', name: 'Red Rocks Amphitheatre' },
] as const;

const STAMP_SIZE = 56;

export const HistoryEmpty = () => (
  <div className="flex flex-col items-center">
    <div
      aria-hidden
      data-testid="history-empty-stamps"
      className="flex items-center"
      style={{ filter: 'grayscale(1)' }}
    >
      {PLACEHOLDER_STAMPS.map((venue, index) => (
        <span
          key={venue.slug}
          style={{ marginLeft: index === 0 ? 0 : -STAMP_SIZE / 5 }}
        >
          <VenueStamp
            venueSlug={venue.slug}
            venueName={venue.name}
            seed={venue.slug}
            variant="dashed"
            size={STAMP_SIZE}
          />
        </span>
      ))}
    </div>
    <EmptyState
      state="no-data"
      title={COPY.headline}
      body={COPY.body}
      primaryCta={{ label: COPY.cta, href: '/events' }}
    />
  </div>
);
