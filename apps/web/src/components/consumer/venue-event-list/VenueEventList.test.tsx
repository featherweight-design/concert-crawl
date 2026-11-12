// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { EventWithVenue } from '@concert-crawl/types';

vi.mock('../event-row', () => ({
  EventRow: ({ show }: { show: { id: string } }) => (
    <div data-testid="event-row" data-event-id={show.id} />
  ),
  fromEventWithVenue: (event: EventWithVenue) => ({ id: event.id }),
}));

import { VenueEventList } from './VenueEventList';

function makeEvent(overrides: Partial<EventWithVenue>): EventWithVenue {
  return {
    id: 'ev-1',
    venueId: 'v-1',
    title: 'Show',
    artist: 'Artist',
    supportingArtists: null,
    tourName: null,
    date: '2099-07-15',
    doorsTime: null,
    showTime: '20:00',
    ticketUrl: null,
    eventUrl: null,
    ticketLinks: null,
    ticketPriceMin: null,
    ticketPriceMax: null,
    priceSource: null,
    pipelineExhaustedAt: null,
    description: null,
    imageUrl: null,
    genre: null,
    status: 'upcoming',
    confidenceScore: null,
    verified: false,
    sourceUrl: null,
    createdAt: '',
    updatedAt: '',
    venue: {
      id: 'v-1',
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
      city: 'Denver',
      websiteUrl: 'https://example.com',
      timezone: 'America/Denver',
    },
    ...overrides,
  };
}

// Design addendum 2 (#178) item 17: Upcoming is ungrouped, as `bp-venue`
// draws it. Each row states its own date; there are no date headers.
describe('VenueEventList', () => {
  it('renders one flat list with no date-group sections or headers', () => {
    const events = [
      makeEvent({ id: 'a', date: '2099-07-15' }),
      makeEvent({ id: 'b', date: '2099-07-15' }),
      makeEvent({ id: 'c', date: '2099-07-16' }),
    ];
    const { queryAllByRole, container } = render(
      <VenueEventList events={events} />,
    );
    expect(queryAllByRole('region')).toEqual([]);
    expect(queryAllByRole('heading')).toEqual([]);
    expect(container.textContent).not.toMatch(/\d+ shows?/);
  });

  it('keeps the events in the order given', () => {
    const events = [
      makeEvent({ id: 'a', date: '2099-07-15' }),
      makeEvent({ id: 'b', date: '2099-07-16' }),
      makeEvent({ id: 'c', date: '2099-07-15' }),
    ];
    const { getAllByTestId } = render(<VenueEventList events={events} />);
    const cards = getAllByTestId('event-row');
    expect(cards.map((node) => node.getAttribute('data-event-id'))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('renders nothing when events array is empty', () => {
    const { container } = render(<VenueEventList events={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
