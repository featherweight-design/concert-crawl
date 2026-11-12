// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { HistoryShow } from '@concert-crawl/types';
import { HistoryItem } from './HistoryItem';
import { HISTORY_COPY } from './definitions/copy';
import { genreColor } from '@/lib/genre-color';

vi.mock('@/lib/hooks/useIsMobileViewport', () => ({
  useIsMobileViewport: () => false,
}));

afterEach(cleanup);

const SHOW: HistoryShow = {
  eventId: 'evt-1',
  artist: 'Wednesday',
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: 'RiNo',
  date: '2026-05-14',
  dateLabel: 'Thu, May 14',
  showTime: '8:00 PM',
  priceFinal: 22,
  genre: 'indie',
  attendingAt: '2026-05-14T02:00:00.000Z',
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: null,
};

describe('HistoryItem', () => {
  it('links the row to the event and names the artist', () => {
    render(<HistoryItem show={SHOW} density="cozy" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-1');
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
  });

  it('joins venue, date, and show time into one meta line', () => {
    render(<HistoryItem show={SHOW} density="cozy" />);

    expect(
      screen.getByText('Larimer Lounge · Thu, May 14 · 8:00 PM'),
    ).toBeInTheDocument();
  });

  it('drops the show time from the meta line when it is null', () => {
    render(<HistoryItem show={{ ...SHOW, showTime: null }} density="cozy" />);

    expect(
      screen.getByText('Larimer Lounge · Thu, May 14'),
    ).toBeInTheDocument();
  });

  it.each(['compact', 'cozy'] as const)(
    'hides the genre/price detail line at %s density',
    (density) => {
      render(<HistoryItem show={SHOW} density={density} />);

      expect(screen.queryByText(/indie/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(new RegExp(HISTORY_COPY.item.paid(22))),
      ).not.toBeInTheDocument();
    },
  );

  it('shows the genre and paid price at roomy density', () => {
    render(<HistoryItem show={SHOW} density="roomy" />);

    expect(
      screen.getByText(`indie · ${HISTORY_COPY.item.paid(22)}`),
    ).toBeInTheDocument();
  });

  it('omits the paid price at roomy density when none was observed', () => {
    render(
      <HistoryItem show={{ ...SHOW, priceFinal: null }} density="roomy" />,
    );

    expect(screen.getByText('indie')).toBeInTheDocument();
    expect(screen.queryByText(/paid \$/)).not.toBeInTheDocument();
  });

  it('renders no detail line at roomy density when genre and price are both null', () => {
    render(
      <HistoryItem
        show={{ ...SHOW, genre: null, priceFinal: null }}
        density="roomy"
      />,
    );

    expect(screen.queryByText(/paid \$/)).not.toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
  });

  it('keeps the venue stamp out of the accessibility tree', () => {
    const { container } = render(<HistoryItem show={SHOW} density="cozy" />);

    // Every svg on the row (identity art + stamp) is decoration.
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('draws the headliner portrait when the artist row has one', () => {
    const { container } = render(
      <HistoryItem
        show={{ ...SHOW, artistPhotoUrl: 'https://cdn.test/wednesday.jpg' }}
        density="cozy"
      />,
    );

    const photo = container.querySelector('img');
    expect(photo).toHaveAttribute('src', 'https://cdn.test/wednesday.jpg');
    // Still decorative: the row's link already names the artist.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls through to generated art when there is no portrait', () => {
    const { container } = render(<HistoryItem show={SHOW} density="cozy" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  // B+ rule 4: one stamp everywhere, the Passport venue stamp.
  it('stamps an attended night with the solid venue stamp', () => {
    const { container } = render(<HistoryItem show={SHOW} density="cozy" />);

    const stamp = container.querySelector('[data-venue-stamp]');
    expect(stamp).toHaveAttribute('data-venue-stamp', 'solid');
    expect(container.querySelector('[data-venue-glyph]')).toHaveAttribute(
      'data-venue-glyph',
      'larimer',
    );
  });

  it('stamps an upcoming night with the dashed stamp it will become', () => {
    const { container } = render(
      <HistoryItem show={SHOW} density="cozy" stamp="dashed" />,
    );

    expect(container.querySelector('[data-venue-stamp]')).toHaveAttribute(
      'data-venue-stamp',
      'dashed',
    );
  });

  // B+ rule 2: the lead genre colours the image ring and the left edge.
  it('rings the art and edges the card in the genre colour', () => {
    render(<HistoryItem show={SHOW} density="cozy" />);

    const indie = genreColor('indie');
    if (indie === null) throw new Error('indie has no genre colour');
    expect(screen.getByTestId('history-image-ring').style.boxShadow).toContain(
      indie,
    );
    expect(screen.getByTestId('history-item').style.borderLeftColor).toBe(
      indie,
    );
  });

  it('falls back to the neutral edge when the night has no genre', () => {
    render(<HistoryItem show={{ ...SHOW, genre: null }} density="cozy" />);

    expect(screen.getByTestId('history-item').style.borderLeftColor).toBe(
      'var(--border-strong)',
    );
  });

  it('fades an Undone row back in, and no other row', () => {
    const { rerender } = render(<HistoryItem show={SHOW} density="cozy" />);
    expect(screen.getByTestId('history-item').className).not.toContain(
      'starting:opacity-0',
    );

    rerender(<HistoryItem show={SHOW} density="cozy" restored />);
    expect(screen.getByTestId('history-item').className).toContain(
      'starting:opacity-0',
    );
    expect(screen.getByTestId('history-item').className).toContain(
      '--motion-base',
    );
  });

  it('lets the title and the date wrap instead of truncating', () => {
    const { container } = render(<HistoryItem show={SHOW} density="cozy" />);

    expect(container.querySelector('.truncate')).toBeNull();
  });

  it('draws no menu button when the row has no actions', () => {
    render(<HistoryItem show={SHOW} density="cozy" />);

    expect(screen.queryByTestId('row-menu')).not.toBeInTheDocument();
  });

  it('puts the menu beside the link, never inside it', () => {
    const { container } = render(
      <HistoryItem
        show={SHOW}
        density="cozy"
        menu={{ onRemove: vi.fn(), onShare: vi.fn() }}
      />,
    );

    expect(screen.getByTestId('row-menu')).toBeInTheDocument();
    expect(container.querySelector('a button')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-1');
    expect(screen.getByTestId('history-item')).toContainElement(
      screen.getByTestId('row-menu'),
    );
  });

  it('gives a dashed-stamp row the upcoming menu', () => {
    render(
      <HistoryItem
        show={SHOW}
        density="cozy"
        stamp="dashed"
        menu={{ onRemove: vi.fn(), onShare: vi.fn() }}
      />,
    );

    expect(screen.getByTestId('row-menu')).toHaveAttribute(
      'data-tense',
      'upcoming',
    );
  });
});
