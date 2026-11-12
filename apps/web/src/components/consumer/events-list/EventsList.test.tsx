// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventWithVenue } from '@concert-crawl/types';

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
vi.mock('@/components/consumer/event-row', () => ({
  EventRow: ({ show }: { show: { id: string } }) => (
    <div data-testid="row">{show.id}</div>
  ),
  fromEventWithVenue: (event: { id: string }) => ({ id: event.id }),
}));

import { EventsList } from './EventsList';

const eventOn = (id: string, date: string): EventWithVenue =>
  ({ id, date }) as unknown as EventWithVenue;

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
