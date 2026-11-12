// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CachedShortcuts, formatEventLine } from '../CachedShortcuts';

afterEach(cleanup);

const base = {
  id: 'evt-1',
  title: 'Amyl at the Roxy',
  date: '2026-08-14',
  venue: { name: 'The Roxy', slug: 'the-roxy' },
};

describe('formatEventLine', () => {
  it('leads with the time when one was cached', () => {
    expect(formatEventLine({ ...base, showTime: '20:00:00' })).toBe(
      '8:00 PM · The Roxy',
    );
  });

  it('falls back to venue and date for a row cached without a time', () => {
    expect(formatEventLine(base)).toBe('The Roxy · Aug 14');
  });
});

describe('CachedShortcuts', () => {
  it('draws a saved night with artist, genre chip and price', () => {
    render(
      <CachedShortcuts
        events={[
          {
            ...base,
            artist: 'Jonah Kagen',
            genre: ['folk'],
            showTime: '20:00:00',
            ticketPriceMin: '22.00',
          },
        ]}
        venues={[]}
      />,
    );
    expect(screen.getByText('Jonah Kagen')).toBeTruthy();
    expect(screen.getByText('$22')).toBeTruthy();
    expect(screen.getByTestId('genre-chip')).toBeTruthy();
    expect(screen.getByTestId('cached-event-row').getAttribute('href')).toBe(
      '/events/evt-1',
    );
  });

  it('shows tba for a row with no price, and the title when no artist was cached', () => {
    render(<CachedShortcuts events={[base]} venues={[]} />);
    expect(screen.getByText('tba')).toBeTruthy();
    expect(screen.getByText('Amyl at the Roxy')).toBeTruthy();
  });

  it('titles the venue list only when events sit above it', () => {
    const venue = { id: 'v1', name: 'Globe Hall', slug: 'globe-hall' };
    const { rerender } = render(
      <CachedShortcuts events={[]} venues={[venue]} />,
    );
    expect(screen.queryByText('Venues')).toBeNull();
    rerender(<CachedShortcuts events={[base]} venues={[venue]} />);
    expect(screen.getByText('Venues')).toBeTruthy();
  });
});
