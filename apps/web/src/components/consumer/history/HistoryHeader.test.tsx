// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { HistoryStats } from '@concert-crawl/types';
import { HistoryHeader, historyTilesFor } from './HistoryHeader';
import { HISTORY_COPY } from './definitions/copy';
import { MY_SHOWS_HEADER_RULE } from './definitions/constants';

afterEach(cleanup);

const COPY = HISTORY_COPY.header;

const STATS: HistoryStats = {
  nights: 12,
  venues: 5,
  artists: 11,
  topGenre: 'indie',
  topVenue: 'Larimer Lounge',
  first: '2026-01-18',
  last: '2026-05-14',
  totalSpent: 264,
};

describe('historyTilesFor', () => {
  it('always emits nights, venues, and artists', () => {
    const keys = historyTilesFor({
      nights: 0,
      venues: 0,
      artists: 0,
      topGenre: null,
      topVenue: null,
      first: null,
      last: null,
      totalSpent: null,
    }).map((tile) => tile.key);

    expect(keys).toEqual(['nights', 'venues', 'artists']);
  });

  it('hides — rather than zeroes — the nullable tiles', () => {
    const keys = historyTilesFor({ ...STATS, topVenue: null }).map(
      (tile) => tile.key,
    );

    expect(keys).not.toContain('topVenue');
    expect(keys).toContain('topGenre');
    expect(keys).toContain('spent');
  });

  it('singularizes the count labels at one', () => {
    const tiles = historyTilesFor({
      ...STATS,
      nights: 1,
      venues: 1,
      artists: 1,
    });

    expect(tiles.map((tile) => tile.label)).toEqual(
      expect.arrayContaining([
        COPY.stats.nightsSingular,
        COPY.stats.venuesSingular,
        COPY.stats.artistsSingular,
      ]),
    );
  });
});

describe('HistoryHeader', () => {
  // No tier chip: this header only renders for a plan that already unlocked
  // History, so naming the tier here sells a subscriber their own plan.
  it('renders the range without naming a tier', () => {
    render(<HistoryHeader stats={STATS} />);

    expect(screen.getByText(COPY.range)).toBeInTheDocument();
    // Match the chip's shape ("+ <tier>"), not one tier's name — renaming the
    // tier shouldn't let the chip regress past this test.
    expect(screen.queryByText(/^\+\s*\S/)).toBeNull();
  });

  it('renders every stat tile with its value', () => {
    render(<HistoryHeader stats={STATS} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('indie')).toBeInTheDocument();
    expect(screen.getByText('Larimer Lounge')).toBeInTheDocument();
    expect(screen.getByText('$264')).toBeInTheDocument();
  });

  it('hides the nullable tiles instead of showing a placeholder', () => {
    render(
      <HistoryHeader
        stats={{ ...STATS, topGenre: null, topVenue: null, totalSpent: null }}
      />,
    );

    expect(screen.queryByText(COPY.stats.topGenre)).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.stats.topVenue)).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.stats.spent)).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders the since line from the first attended date', () => {
    render(<HistoryHeader stats={STATS} />);

    expect(screen.getByText(COPY.since('January 2026'))).toBeInTheDocument();
  });

  it('omits the since line when there is no first date', () => {
    render(<HistoryHeader stats={{ ...STATS, first: null }} />);

    expect(screen.queryByText(/^since /)).not.toBeInTheDocument();
  });
});

// B+ "My shows": in the Concerts stats only Top venue keeps a gradient.
describe('HistoryHeader gradient', () => {
  it('marks Top venue, and only Top venue, for the gradient', () => {
    expect(
      historyTilesFor(STATS)
        .filter((tile) => tile.gradient)
        .map((tile) => tile.key),
    ).toEqual(['topVenue']);
  });

  it('paints only the Top venue figure with the gradient', () => {
    const { container } = render(<HistoryHeader stats={STATS} />);

    const painted = container.querySelectorAll('[data-stat-gradient]');
    expect(painted).toHaveLength(1);
    expect(painted[0]?.textContent).toContain('Larimer Lounge');
  });

  it('clips the gradient to the Top venue text and leaves the others solid', () => {
    const { container } = render(<HistoryHeader stats={STATS} />);

    for (const figure of Array.from(container.querySelectorAll('dd'))) {
      const style = figure.getAttribute('style') ?? '';
      if (figure.textContent === 'Larimer Lounge') {
        expect(style).toContain('linear-gradient');
        expect(figure.style.color).toBe('transparent');
      } else {
        expect(style).not.toContain('linear-gradient');
        expect(figure.style.color).toBe('var(--fg)');
      }
    }
  });
});

// Addendum-2 `03-stamps/concerts-round-stamps-m`: the rule under the stats is
// a 1px gradient hairline, signal 60% into accent 40% at 40%, then the border
// colour at 75%.
describe('HistoryHeader rule', () => {
  it('pins the board gradient', () => {
    expect(MY_SHOWS_HEADER_RULE).toBe(
      'linear-gradient(90deg, color-mix(in oklch, var(--signal) 60%, transparent), color-mix(in oklch, var(--accent) 40%, transparent) 40%, var(--border) 75%)',
    );
  });

  // The boards set the phone's stats in equal thirds; from sm they flow.
  it('lays the stats out in equal thirds on a phone', () => {
    render(<HistoryHeader stats={STATS} />);
    const list = screen.getByTestId('history-header').querySelector('dl');
    expect(list?.classList).toContain('grid-cols-3');
    expect(list?.classList).toContain('lg:flex');
  });

  // The rule must sit in a 1px transparent border row, as the old `border-b`
  // did, or the header loses 1px and everything below moves up.
  it('keeps the border row and paints the rule into it', () => {
    render(<HistoryHeader stats={STATS} />);
    const header = screen.getByTestId('history-header');
    expect(header.classList).toContain('border-b');
    expect(header.classList).toContain('border-transparent');
    expect(header.classList).not.toContain('border-border');
    expect(header.style.backgroundOrigin).toBe('border-box');
    expect(header.style.backgroundClip).toBe('border-box');
  });

  it('draws the gradient hairline along the bottom, not the plain border', () => {
    render(<HistoryHeader stats={STATS} />);
    const header = screen.getByTestId('history-header');
    expect(header.style.backgroundImage).toContain('var(--signal) 60%');
    expect(header.style.backgroundImage).toContain('var(--accent) 40%');
    expect(header.style.backgroundImage).toContain('var(--border) 75%');
    expect(header.style.backgroundSize).toBe('100% 1px');
    expect(header.style.backgroundPosition).toBe('left bottom');
    expect(header.style.backgroundRepeat).toBe('no-repeat');
  });
});
