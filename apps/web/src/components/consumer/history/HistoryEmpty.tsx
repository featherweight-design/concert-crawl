// Entitled user with nothing behind them yet (#70),
// design_handoff_concert_history/history-routes.jsx:57-93.
//
// B+ (`bp-s-empty_concerts_m`): the shared My shows empty card, the same shape
// Watching uses, badged with three overlapping dashed venue stamps inked grey
// (rule 4): stamps not yet earned.

import { VenueStamp } from '@/components/consumer/venue-stamp';
import { MyShowsEmptyCard } from './MyShowsEmptyCard';
import { HISTORY_COPY } from './definitions/copy';

const COPY = HISTORY_COPY.empty;

// Fixed venues so the empty state never shifts between renders.
const PLACEHOLDER_STAMPS = [
  { slug: 'bluebird-theater', name: 'Bluebird Theater' },
  { slug: 'mission-ballroom', name: 'Mission Ballroom' },
  { slug: 'red-rocks-amphitheatre', name: 'Red Rocks Amphitheatre' },
] as const;

const STAMP_SIZE = 56;

const Badge = () => (
  <div
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
          variant="dashed"
          size={STAMP_SIZE}
        />
      </span>
    ))}
  </div>
);

export const HistoryEmpty = () => (
  <MyShowsEmptyCard
    badge={<Badge />}
    eyebrow={COPY.eyebrow}
    tone="accent"
    title={COPY.headline}
    body={COPY.body}
    cta={{ label: COPY.cta, href: '/events' }}
  />
);
