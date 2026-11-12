'use client';

// The History stat hero (#70), from
// design_handoff_concert_history/history-screens.jsx:216-259, with the desktop
// "since <Month Year>" line from history-routes.jsx:500-520 folded in as a
// responsive detail rather than a second component.
//
// Tiles HIDE when their value is null — a Supporter whose rows carry no genre
// shouldn't see a "top genre — " tile. Nights/venues/artists are always
// numbers, so they always render.

import type { HistoryStats } from '@concert-crawl/types';
import { HISTORY_COPY } from './definitions/copy';
import {
  MY_SHOWS_GRADIENT,
  MY_SHOWS_HEADER_RULE_STYLE,
} from './definitions/constants';

const COPY = HISTORY_COPY.header;

// dt precedes dd in the DOM because HTML requires that order inside a <dl>
// wrapper div; flex-col-reverse puts the big number back on top visually.
const StatTile = ({
  value,
  label,
  gradient,
}: {
  value: string;
  label: string;
  gradient: boolean;
}) => (
  <div
    className="flex min-w-0 flex-col-reverse gap-0.5"
    data-stat-gradient={gradient || undefined}
  >
    <dt
      className="truncate"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
      }}
    >
      {label}
    </dt>
    <dd
      className="truncate"
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: '-0.025em',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        color: gradient ? 'transparent' : 'var(--fg)',
        margin: 0,
        ...(gradient && {
          backgroundImage: MY_SHOWS_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }),
      }}
    >
      {value}
    </dd>
  </div>
);

interface Tile {
  key: string;
  value: string;
  label: string;
  /** B+ "My shows": only Top venue keeps a gradient. */
  gradient: boolean;
}

// Kept as a pure function so the null-hiding rule is testable independently of
// the render tree.
export const historyTilesFor = (stats: HistoryStats): Tile[] => {
  const tiles: Tile[] = [
    {
      key: 'nights',
      value: String(stats.nights),
      label:
        stats.nights === 1
          ? COPY.stats.nightsSingular
          : COPY.stats.nightsPlural,
      gradient: false,
    },
    {
      key: 'venues',
      value: String(stats.venues),
      label:
        stats.venues === 1
          ? COPY.stats.venuesSingular
          : COPY.stats.venuesPlural,
      gradient: false,
    },
    {
      key: 'artists',
      value: String(stats.artists),
      label:
        stats.artists === 1
          ? COPY.stats.artistsSingular
          : COPY.stats.artistsPlural,
      gradient: false,
    },
  ];

  if (stats.topGenre !== null) {
    tiles.push({
      key: 'topGenre',
      value: stats.topGenre,
      label: COPY.stats.topGenre,
      gradient: false,
    });
  }
  if (stats.topVenue !== null) {
    tiles.push({
      key: 'topVenue',
      value: stats.topVenue,
      label: COPY.stats.topVenue,
      gradient: true,
    });
  }
  if (stats.totalSpent !== null) {
    tiles.push({
      key: 'spent',
      value: `$${Math.round(stats.totalSpent)}`,
      label: COPY.stats.spent,
      gradient: false,
    });
  }

  return tiles;
};

// `first` is a YYYY-MM-DD event-local date; parsed at local midnight so the
// month never slides backwards a day.
const sinceLabelFor = (first: string | null): string | null => {
  if (first === null) return null;
  const parsed = new Date(`${first}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return COPY.since(
    parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );
};

export const HistoryHeader = ({ stats }: { stats: HistoryStats }) => {
  const tiles = historyTilesFor(stats);
  const since = sinceLabelFor(stats.first);

  return (
    <header
      data-testid="history-header"
      className="mb-5 pb-4 sm:mb-6 sm:pb-5"
      style={MY_SHOWS_HEADER_RULE_STYLE}
    >
      {/* The tier chip that used to sit opposite the eyebrow is gone — this
          page only renders for a plan that already unlocked it. */}
      <div className="mb-3">
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            margin: 0,
          }}
        >
          {COPY.range}
        </p>
      </div>

      {/* Wraps instead of scrolling at 320px — six tiles never fit one row. */}
      <dl className="m-0 flex flex-wrap items-center gap-x-5 gap-y-4">
        {tiles.map((tile) => (
          <StatTile
            key={tile.key}
            value={tile.value}
            label={tile.label}
            gradient={tile.gradient}
          />
        ))}
      </dl>

      {since !== null && (
        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--fg-subtle)',
            margin: '12px 0 0',
          }}
        >
          {since}
        </p>
      )}
    </header>
  );
};
