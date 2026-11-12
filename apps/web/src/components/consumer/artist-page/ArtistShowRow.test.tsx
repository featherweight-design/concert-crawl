// @vitest-environment jsdom

import type { ArtistShow } from '@concert-crawl/types';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EVENT_ROW_COPY } from '../event-row/definitions/copy';

import { ArtistShowRow } from './ArtistShowRow';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}));

afterEach(cleanup);

const show = (overrides: Partial<ArtistShow> = {}): ArtistShow => ({
  eventId: 'evt_marquis',
  iso: '2026-11-10',
  showTime: '19:00:00',
  venue: 'Marquis Theater',
  venueSlug: 'marquis-theater',
  city: 'Denver',
  price: null,
  tourName: null,
  genres: ['electronic'],
  imageUrl: null,
  status: 'upcoming',
  ...overrides,
});

describe('ArtistShowRow', () => {
  it('leads with the date tile, month included, tinted by the genre', () => {
    render(<ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />);
    const tile = screen.getByTestId('day-tile');
    expect(tile.textContent).toBe('Tue10Nov');
    expect(tile.style.background).toContain('var(--genre-electronic)');
  });

  it('names the venue in the row link, with the date for screen readers', () => {
    const { container } = render(
      <ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />,
    );
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/events/evt_marquis');
    expect(link?.className).toContain('event-row-stretch');
    expect(link?.textContent).toContain('Marquis Theater');
    expect(link?.querySelector('.sr-only')?.textContent).toMatch(/Nov/);
    // The page carries the artist, so the row never prints it.
    expect(container.textContent).not.toContain('Puma Blue');
  });

  it('draws the venue icon beside the name', () => {
    const { container } = render(
      <ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />,
    );
    expect(container.querySelector('a [data-venue-tile]')).not.toBeNull();
  });

  it('puts the time and city on the second line', () => {
    render(<ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />);
    expect(screen.getByTestId('artist-show-meta').textContent).toMatch(
      /^7:00\sPM·Denver$/,
    );
  });

  // At 320 the text column is under 100px. The board's rows read whole, so a
  // narrow row follows EventRow's rules: wrap the name, keep the time, drop
  // the city. Before this, all three ellipsised ("Fiddle…", "6:00 PM · D…").
  describe('on a narrow row (320 viewport)', () => {
    const atWidth = (width: number) =>
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        width,
        height: 80,
        right: width,
        bottom: 80,
        toJSON: () => ({}),
      });

    // At 320 "tba" and the eye left the name ~90px, and a two-line clamp cut
    // it to "Red Rocks / Amphithe…". The price moves under the name instead,
    // as EventRow moves a wide chip under the title, and nothing clamps it.
    it('shows the whole venue name, unclamped, with the price moved under it', () => {
      const spy = atWidth(292);
      try {
        render(
          <ArtistShowRow
            show={show({ venue: 'Red Rocks Amphitheatre' })}
            artist="Puma Blue"
            photoUrl={null}
          />,
        );
        expect(screen.getByTestId('artist-show-row').dataset.narrow).toBe(
          'true',
        );
        const venue = screen.getByTestId('artist-show-venue');
        expect(venue.textContent).toBe('Red Rocks Amphitheatre');
        expect(venue.className).not.toContain('truncate');
        expect(venue.dataset.lines).toBe('all');
        expect(venue.style.getPropertyValue('-webkit-line-clamp')).toBe('');
        expect(venue.style.display).not.toBe('-webkit-box');
        expect(venue.style.overflow).not.toBe('hidden');
        // The price rides the meta line, so the right side holds only the eye.
        const meta = screen.getByTestId('artist-show-meta');
        const under = screen.getByTestId('artist-show-price-under');
        expect(meta.contains(under)).toBe(true);
        expect(under.textContent).toBe(EVENT_ROW_COPY.price.tba);
        expect(screen.getAllByText(EVENT_ROW_COPY.price.tba)).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('keeps the price column and the two-line name at 390', () => {
      // A 390 viewport less the 16px gutters is a 358px row.
      const spy = atWidth(358);
      try {
        render(
          <ArtistShowRow
            show={show({ venue: 'Red Rocks Amphitheatre' })}
            artist="Puma Blue"
            photoUrl={null}
          />,
        );
        expect(screen.getByTestId('artist-show-row').dataset.narrow).toBe(
          'true',
        );
        expect(screen.getByTestId('artist-show-venue').dataset.lines).toBe('2');
        expect(screen.queryByTestId('artist-show-price-under')).toBeNull();
        expect(screen.getByText(EVENT_ROW_COPY.price.tba)).toBeTruthy();
      } finally {
        spy.mockRestore();
      }
    });

    it('still carries the price when there is no time or city', () => {
      const spy = atWidth(292);
      try {
        render(
          <ArtistShowRow
            show={show({ showTime: null, city: '' })}
            artist="Puma Blue"
            photoUrl={null}
          />,
        );
        expect(screen.getByTestId('artist-show-price-under').textContent).toBe(
          EVENT_ROW_COPY.price.tba,
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('keeps the time whole and drops the city', () => {
      const spy = atWidth(288);
      try {
        render(
          <ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />,
        );
        const time = screen.getByTestId('artist-show-time');
        expect(time.textContent).toMatch(/^7:00\sPM$/);
        expect(time.style.flexShrink).toBe('0');
        expect(screen.queryByTestId('artist-show-city')).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });

    it('keeps the city when there is no time to show', () => {
      const spy = atWidth(288);
      try {
        render(
          <ArtistShowRow
            show={show({ showTime: null })}
            artist="Puma Blue"
            photoUrl={null}
          />,
        );
        expect(screen.getByTestId('artist-show-city').textContent).toBe(
          'Denver',
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('keeps the wide layout on a wide row', () => {
      const spy = atWidth(600);
      try {
        render(
          <ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />,
        );
        expect(
          screen.getByTestId('artist-show-row').dataset.narrow,
        ).toBeUndefined();
        expect(screen.getByTestId('artist-show-venue').className).toContain(
          'truncate',
        );
        expect(screen.getByTestId('artist-show-city')).toBeTruthy();
      } finally {
        spy.mockRestore();
      }
    });
  });

  it('drops the time when the crawl found none', () => {
    render(
      <ArtistShowRow
        show={show({ showTime: null })}
        artist="Puma Blue"
        photoUrl={null}
      />,
    );
    expect(screen.getByText('Denver')).toBeTruthy();
  });

  it("wears the carded row's genre edge, neutral when ungenred", () => {
    const { rerender } = render(
      <ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />,
    );
    const row = screen.getByTestId('artist-show-row');
    expect(row.style.borderLeftColor).toBe('var(--genre-electronic)');

    rerender(
      <ArtistShowRow
        show={show({ genres: [] })}
        artist="Puma Blue"
        photoUrl={null}
      />,
    );
    expect(screen.getByTestId('artist-show-row').style.borderLeftColor).toBe(
      'var(--border-strong)',
    );
  });

  it('says tba with no price and keeps the watch control', () => {
    render(<ArtistShowRow show={show()} artist="Puma Blue" photoUrl={null} />);
    expect(screen.getByText(EVENT_ROW_COPY.price.tba)).toBeTruthy();
    expect(screen.getByTestId('watch-stub')).toBeTruthy();
  });

  it('strikes the venue and names the status on a cancelled show', () => {
    render(
      <ArtistShowRow
        show={show({ status: 'cancelled' })}
        artist="Puma Blue"
        photoUrl={null}
      />,
    );
    expect(screen.getByTestId('row-cancelled')).toBeTruthy();
    expect(screen.getByText('Marquis Theater').style.textDecoration).toBe(
      'line-through',
    );
  });
});
