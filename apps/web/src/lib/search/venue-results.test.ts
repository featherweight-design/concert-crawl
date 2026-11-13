// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}));
vi.mock('./useAuthToken', () => ({ useAuthToken: () => vi.fn() }));

import { deriveVenueResults, venueNameMatches } from './useSearch';

const row = (
  id: string,
  artist: string,
  venueName: string,
  venueId: string,
) => ({
  id,
  artist,
  date: '2027-01-01',
  title: artist,
  venue: { id: venueId, name: venueName, slug: venueId },
});

// Regression: searching "red" returned eight venues, seven of which have no
// "red" in their name (Globe Hall, The Black Box, Fillmore...). Venues were
// derived from every event the query matched, so any venue hosting an artist
// called "Red ..." became a venue result.
describe('venue results answer to the venue name', () => {
  const rows = [
    row('1', 'Red Hot Chili Peppers', 'Fillmore Auditorium', 'fillmore'),
    row('2', 'Red Sovine Tribute', 'Globe Hall', 'globe-hall'),
    row('3', 'Mr. Red', 'The Black Box', 'black-box'),
    row('4', 'Khruangbin', 'Red Rocks Amphitheatre', 'red-rocks'),
    row('5', 'Gary Clark Jr.', 'Red Rocks Amphitheatre', 'red-rocks'),
  ];

  it('"red" finds Red Rocks, not the venues that merely host a Red artist', () => {
    const venues = deriveVenueResults(rows, 'red');

    expect(venues.map((venue) => venue.slug)).toEqual(['red-rocks']);
    expect(venues[0]?.showCount).toBe(2);
  });

  it('matches a word in the name, the whole name, and a query that reads on past it', () => {
    expect(venueNameMatches('Red Rocks Amphitheatre', 'red')).toBe(true);
    expect(venueNameMatches('Red Rocks Amphitheatre', 'rocks')).toBe(true);
    expect(venueNameMatches('Bluebird Theater', 'bluebird')).toBe(true);
    expect(
      venueNameMatches('Bluebird Theater', 'bluebird theater tonight'),
    ).toBe(true);
  });

  it('does not match a name that only contains the letters mid-word', () => {
    expect(venueNameMatches('The Gothic Theatre', 'red')).toBe(false);
    expect(venueNameMatches('Fillmore Auditorium', 'red')).toBe(false);
    expect(venueNameMatches('Globe Hall', '')).toBe(false);
  });
});
