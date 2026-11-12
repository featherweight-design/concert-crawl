// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventWithVenue } from '@concert-crawl/types';
import type * as OrderGenres from '@/components/consumer/event-row/lib/order-genres';

let searchString = '';
let pages: { data: EventWithVenue[] }[] = [];

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchString),
}));
vi.mock('@/lib/queries/use-events', () => ({
  useEvents: () => ({
    data: { pages },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: [] }),
}));
// The stub keeps the row's genre lead real: it orders the show's genres by the
// vibes the list handed it, through the same helpers the real row uses, so a
// test can read which genres a row leads with.
vi.mock('@/components/consumer/event-row', async () => {
  const { orderGenres, vibeBucketMembers } = await vi.importActual<
    typeof OrderGenres
  >('@/components/consumer/event-row/lib/order-genres');
  return {
    EventRow: ({
      show,
      filterVibes = [],
    }: {
      show: { id: string; genres: readonly string[] };
      filterVibes?: readonly string[];
    }) => (
      <div
        data-testid="row"
        data-lead-genres={orderGenres(
          show.genres,
          vibeBucketMembers(filterVibes),
        ).join('|')}
      >
        {show.id}
      </div>
    ),
    fromEventWithVenue: (event: { id: string; genre?: string[] }) => ({
      id: event.id,
      genres: event.genre ?? [],
    }),
  };
});

import { EventsList } from './EventsList';

const eventOn = (
  id: string,
  date: string,
  genre: string[] = [],
): EventWithVenue => ({ id, date, genre }) as unknown as EventWithVenue;

const renderList = () =>
  render(
    <EventsList
      initialEvents={[]}
      initialOffset={0}
      total={0}
      limit={20}
      initialWatchedIds={[]}
    />,
  );

const headings = (): string[] =>
  screen
    .getAllByRole('heading', { level: 2 })
    .map((node) => node.textContent ?? '');

beforeEach(() => {
  searchString = '';
  vi.useFakeTimers();
  // 21:22 MST on Wed Nov 11 2026, when UTC has already turned over to Nov 12.
  vi.setSystemTime(new Date('2026-11-12T04:22:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EventsList day groups', () => {
  it('never draws a day before Denver today above Tonight', () => {
    // A payload cached on Nov 10 and served offline still starts on Nov 10.
    pages = [
      {
        data: [
          eventOn('stale', '2026-11-10'),
          eventOn('today', '2026-11-11'),
          eventOn('next', '2026-11-12'),
        ],
      },
    ];
    renderList();

    expect(headings()).toEqual(['Tonight', 'Tomorrow']);
    expect(screen.queryByText('stale')).toBeNull();
  });

  it('keeps today when it is the first day, one second before Denver midnight', () => {
    vi.setSystemTime(new Date('2026-11-12T06:59:59Z'));
    pages = [{ data: [eventOn('today', '2026-11-11')] }];
    renderList();

    expect(headings()).toEqual(['Tonight']);
  });

  it('drops the old day the moment Denver midnight passes', () => {
    vi.setSystemTime(new Date('2026-11-12T07:00:00Z'));
    pages = [
      {
        data: [
          eventOn('yesterday', '2026-11-11'),
          eventOn('today', '2026-11-12'),
        ],
      },
    ];
    renderList();

    expect(headings()).toEqual(['Tonight']);
  });

  it('ignores from beside a filterWhen chip, as the API request does', () => {
    searchString = 'filterWhen=next-week&from=2020-01-01';
    pages = [
      { data: [eventOn('old', '2026-11-10'), eventOn('today', '2026-11-11')] },
    ];
    renderList();

    expect(headings()).toEqual(['Tonight']);
  });

  it('shows an earlier day when the URL asked for one on purpose', () => {
    searchString = 'from=2026-11-10';
    pages = [
      { data: [eventOn('old', '2026-11-10'), eventOn('today', '2026-11-11')] },
    ];
    renderList();

    expect(headings()).toHaveLength(2);
    expect(screen.getByText('old')).toBeTruthy();
  });
});

describe('EventsList vibe lead', () => {
  // Addendum 3, lane a6 row 41: every chosen vibe is highlighted. The key
  // repeats, so reading it with `.get()` would keep only the first vibe and
  // the row would lead with jazz then its unmatched country.
  it('leads each row with the genres every chosen vibe matched', () => {
    searchString = 'filterVibe=jazz&filterVibe=rock';
    pages = [
      {
        data: [
          eventOn('show', '2026-11-11', ['country', 'jazz', 'garage rock']),
        ],
      },
    ];
    renderList();

    expect(screen.getByTestId('row').getAttribute('data-lead-genres')).toBe(
      'jazz|garage rock',
    );
  });
});
