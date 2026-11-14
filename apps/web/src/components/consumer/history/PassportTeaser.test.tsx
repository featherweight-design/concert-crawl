// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { HistoryShow, HistoryStats } from '@concert-crawl/types';
import {
  denverYear,
  PassportTeaser,
  TEASER_SHELL_STYLE,
  TEASER_STAMP_GROUND,
  TEASER_STAMP_SIZE,
  teaserStampsFor,
} from './PassportTeaser';
import { PASSPORT_ROUTE } from './definitions/constants';
import { HISTORY_COPY } from './definitions/copy';

afterEach(cleanup);

const COPY = HISTORY_COPY.passport;

const show = (eventId: string, artist: string): HistoryShow => ({
  eventId,
  artist,
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: null,
  date: '2026-05-14',
  dateLabel: 'Thu, May 14',
  showTime: null,
  priceFinal: null,
  genre: 'indie',
  attendingAt: '2026-05-14T02:00:00.000Z',
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: null,
});

const STATS: HistoryStats = {
  nights: 4,
  venues: 2,
  artists: 4,
  topGenre: 'indie',
  topVenue: 'Larimer Lounge',
  first: '2026-01-18',
  last: '2026-05-14',
  totalSpent: 88,
};

const SHOWS = [show('a', 'Wednesday'), show('b', 'Slaughter Beach, Dog')];

describe('PassportTeaser', () => {
  it('renders the stat strip', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />);

    expect(screen.getByText(COPY.headline)).toBeInTheDocument();
    expect(screen.getByText(COPY.summary(4, 2))).toBeInTheDocument();
  });

  // addendum-2 concerts-round-stamps: "PASSPORT · 2026", "Your Passport", "Open it →".
  it('draws the eyebrow with the year, the title and the link as the board does', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />);

    expect(screen.getByText(COPY.eyebrow(denverYear()))).toBeInTheDocument();
    expect(COPY.headline).toBe('Your Passport');
    expect(screen.getByText('Open it →')).toBeInTheDocument();
  });

  // 00:30 UTC on New Year's Day is still New Year's Eve in Denver.
  it('reads the year in Mountain Time', () => {
    expect(denverYear(new Date('2027-01-01T00:30:00Z'))).toBe(2026);
    expect(denverYear(new Date('2027-01-01T08:00:00Z'))).toBe(2027);
  });

  it('drops the genre segment when there is no top genre', () => {
    render(
      <PassportTeaser stats={{ ...STATS, topGenre: null }} shows={SHOWS} />,
    );

    expect(screen.getByText('4 nights · 2 venues')).toBeInTheDocument();
    expect(screen.queryByText(/—/)).toBeNull();
  });

  it('singularizes a one-night, one-venue strip', () => {
    render(
      <PassportTeaser
        stats={{ ...STATS, nights: 1, venues: 1 }}
        shows={[SHOWS[0]!]}
      />,
    );

    expect(screen.getByText('1 night · 1 venue')).toBeInTheDocument();
    // The boards draw no top genre on the teaser.
    expect(screen.queryByText(/indie/)).toBeNull();
  });

  it('links to the Passport page now that #85 has shipped one', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />);

    expect(PASSPORT_ROUTE).toBe('/passport');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/passport');
    expect(screen.getByText(COPY.link)).toBeInTheDocument();
  });

  it('keeps the decorative stamp strip out of the accessibility tree', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

// B+ rule 4: the teaser carries the Passport venue stamp, not a ticket stub.
describe('PassportTeaser stamps', () => {
  it('stamps one solid venue stamp per recent venue', () => {
    const { container } = render(
      <PassportTeaser
        stats={STATS}
        shows={[
          show('a', 'Wednesday'),
          { ...show('b', 'MJ Lenderman'), venueSlug: 'mission-ballroom' },
          // Same venue as the first night, so it adds no second stamp.
          show('c', 'Slaughter Beach, Dog'),
        ]}
      />,
    );

    const stamps = container.querySelectorAll('[data-venue-stamp]');
    expect(stamps).toHaveLength(2);
    for (const stamp of stamps) {
      expect(stamp).toHaveAttribute('data-venue-stamp', 'solid');
      // The board's teaser stamp is 50px.
      expect(stamp).toHaveStyle({ width: `${TEASER_STAMP_SIZE}px` });
    }
    expect(TEASER_STAMP_SIZE).toBe(50);
  });

  // Audit rows (`concerts-round-stamps-m`, "Your Passport" card).
  it('draws the board shell: gradient hairline, radius 18, no pink wash', () => {
    render(<PassportTeaser stats={STATS} shows={[show('a', 'Wednesday')]} />);
    const card = screen.getByRole('link');
    expect(card.className).toContain('rounded-[18px]');
    expect(TEASER_SHELL_STYLE.background).toContain(
      'linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
    );
    expect(card.getAttribute('style')).not.toContain('var(--accent) 14%');
    expect(screen.getByTestId('passport-teaser-body').style.background).toBe(
      'linear-gradient(135deg, var(--surface-2), var(--surface-1))',
    );
  });

  it('sets the stamps on the dot grid', () => {
    expect(TEASER_STAMP_GROUND).toContain(
      'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fg) 6%, transparent) 1px, transparent 1.5px) 0 0 / 12px 12px',
    );
  });

  it('colours "Open it" in signal, not accent', () => {
    render(<PassportTeaser stats={STATS} shows={[]} />);
    expect(screen.getByText(COPY.link).style.color).toBe('var(--signal)');
  });

  // Without a stamp the column is only its dashed left rule.
  it('drops the stamp column when there are no shows to stamp', () => {
    render(<PassportTeaser stats={STATS} shows={[]} />);

    expect(screen.queryByTestId('passport-teaser-stamps')).toBeNull();
    expect(screen.getByText(COPY.headline)).toBeInTheDocument();
  });

  it('keeps the stamp column when there is a show to stamp', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />);

    expect(screen.getByTestId('passport-teaser-stamps')).toBeInTheDocument();
  });

  it('caps the block at four stamps', () => {
    const slugs = [
      'larimer-lounge',
      'mission-ballroom',
      'bluebird-theater',
      'ogden-theatre',
      'gothic-theatre',
    ];
    expect(
      teaserStampsFor(
        slugs.map((slug, index) => ({
          ...show(String(index), `Artist ${index}`),
          venueSlug: slug,
        })),
      ).map((picked) => picked.venueSlug),
    ).toEqual(slugs.slice(0, 4));
  });
});
