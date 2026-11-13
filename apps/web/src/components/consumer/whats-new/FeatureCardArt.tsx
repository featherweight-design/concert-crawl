import { Eye } from 'lucide-react';
import type { HistoryShow } from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { BookletStamp } from '@/components/consumer/passport/BookletStamp';
import { TrustMark } from '@/components/consumer/PriceDisplay';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { VENUE_SLUG_GLYPHS } from '@/components/consumer/venue-glyph/definitions/venue-glyph-keys';
import type { FeatureCardArt as ArtKey } from '@/lib/definitions/releases';

const COPY = CONSUMER_COPY.releaseNotes.featurePage;

/** The board draws 14 tiles on desktop and the first 8 on a phone. */
// Read off the board where the glyph is legible (bird, disco globe, trumpet,
// crate, arch, chandelier, ramp); the rest are venues we list.
const TILE_SLUGS = [
  'bluebird-theater',
  'globe-hall',
  'marquis-theater',
  'the-black-box',
  'oriental-theater',
  'fillmore-auditorium',
  'red-rocks-amphitheatre',
  'meow-wolf-denver',
  'hi-dive',
  'levitt-pavilion',
  'lost-lake-lounge',
  'the-junkyard',
  'mission-ballroom',
  'larimer-lounge',
].filter((slug) => Object.hasOwn(VENUE_SLUG_GLYPHS, slug));
const PHONE_TILES = 8;

const humanise = (slug: string) =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Made-up nights for the sample stamps; the fields the stamp never draws are
// filled with neutral values.
const SAMPLE_SHOWS: HistoryShow[] = COPY.stampSamples.map((sample, index) => ({
  eventId: `whats-new-stamp-${index}`,
  artist: sample.artist,
  artistPhotoUrl: null,
  venueName: sample.venueName,
  venueSlug: sample.venueSlug,
  neighborhood: null,
  date: sample.date,
  dateLabel: sample.dateLabel,
  showTime: null,
  priceFinal: null,
  genre: null,
  attendingAt: `${sample.date}T00:00:00.000Z`,
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: null,
}));

const STAMP_TILTS = [-8, 6, 10];

function VenuesArt() {
  return (
    <div
      data-testid="feature-art-venues"
      className="mx-auto flex max-w-[300px] flex-wrap justify-center gap-2.5 lg:max-w-[700px]"
    >
      {TILE_SLUGS.map((slug, index) => (
        <span
          key={slug}
          className={
            index >= PHONE_TILES ? 'hidden lg:inline-flex' : 'inline-flex'
          }
        >
          <VenueTile slug={slug} name={humanise(slug)} size={52} multicolour />
        </span>
      ))}
    </div>
  );
}

function WatchingArt() {
  return (
    <span
      data-testid="feature-art-watching"
      className="inline-flex h-[64px] w-[64px] items-center justify-center rounded-[18px] border-[1.5px] border-accent bg-surface-1 text-accent"
      style={{
        boxShadow:
          '0 0 22px color-mix(in oklab, var(--accent) 35%, transparent)',
      }}
    >
      <Eye size={30} strokeWidth={1.6} aria-hidden />
    </span>
  );
}

function CrewsArt() {
  return (
    <span data-testid="feature-art-crews" className="inline-flex">
      <CrewPatch crewId="whats-new-sample" size={96} />
    </span>
  );
}

function PassportArt() {
  return (
    <div
      data-testid="feature-art-passport"
      className="flex items-center justify-center gap-3"
    >
      {SAMPLE_SHOWS.map((show, index) => (
        <BookletStamp
          key={show.eventId}
          show={show}
          size={82}
          tilt={STAMP_TILTS[index] ?? 0}
        />
      ))}
    </div>
  );
}

function PricesArt() {
  return (
    <div
      data-testid="feature-art-prices"
      className="flex items-center justify-center gap-3"
    >
      <span
        className="text-[54px] font-black leading-none tracking-[-0.04em]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--signal), var(--cta-end))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {COPY.priceSample}
      </span>
      <span className="flex flex-col items-start gap-1.5">
        <TrustMark kind="community" glyph={false} />
        <span className="rounded-[6px] border border-success px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-success">
          {COPY.priceFans}
        </span>
      </span>
    </div>
  );
}

const ARTS: Record<ArtKey, () => React.ReactElement> = {
  venues: VenuesArt,
  watching: WatchingArt,
  crews: CrewsArt,
  passport: PassportArt,
  prices: PricesArt,
};

/** The wash under each card's art: one colour per card, as the board tints it. */
const WASH: Record<ArtKey, string> = {
  venues: 'var(--signal)',
  watching: 'var(--accent)',
  crews: 'var(--cta-end)',
  passport: 'var(--warning)',
  prices: 'var(--success)',
};

export function FeatureCardArt({
  art,
  tall = false,
}: {
  art: ArtKey;
  /** The wide first card holds two rows of tiles. */
  tall?: boolean;
}) {
  const Art = ARTS[art];
  return (
    <div
      aria-hidden
      data-testid="feature-card-art"
      className={`relative flex items-center justify-center overflow-hidden px-4 ${
        tall
          ? 'min-h-[230px] lg:min-h-[230px]'
          : 'min-h-[160px] lg:min-h-[170px]'
      }`}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, ${WASH[art]} 22%, transparent), transparent 70%), radial-gradient(1px 1px at 8px 8px, color-mix(in oklab, var(--fg-muted) 28%, transparent), transparent)`,
        backgroundSize: 'auto, 18px 18px',
        backgroundColor: 'var(--surface-2)',
      }}
    >
      <Art />
    </div>
  );
}
