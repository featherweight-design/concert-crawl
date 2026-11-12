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
    expect(screen.getByText(/^7:00\sPM · Denver$/)).toBeTruthy();
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
