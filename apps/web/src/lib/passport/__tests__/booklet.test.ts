import { describe, expect, it } from 'vitest';
import type { HistoryShow } from '@concert-crawl/types';
import {
  bookletPages,
  bookletSpreads,
  collectedVenues,
  daysUntil,
  passportCodeLine,
  spreadHasStamps,
  spreadLabel,
  spreadName,
  upcomingQueue,
} from '../booklet';

const show = (
  id: string,
  date: string,
  over: Partial<HistoryShow> = {},
): HistoryShow => ({
  eventId: id,
  artist: `Artist ${id}`,
  artistPhotoUrl: null,
  venueName: 'Bluebird Theater',
  venueSlug: 'bluebird-theater',
  venueCity: 'Denver',
  neighborhood: null,
  date,
  dateLabel: 'Mon, Feb 22',
  showTime: null,
  priceFinal: null,
  genre: null,
  attendingAt: `${date}T01:00:00Z`,
  ...over,
});

const nights = (count: number): HistoryShow[] =>
  Array.from({ length: count }, (_, i) =>
    show(
      `n${i}`,
      `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, '0')}`,
    ),
  );

const kinds = (pages: ReturnType<typeof bookletPages>) =>
  pages.map((page) => page.slots.map((slot) => slot.kind));

describe('bookletPages', () => {
  it('stamps oldest first, whatever order history arrives in', () => {
    const pages = bookletPages(
      [show('late', '2026-03-01'), show('early', '2026-01-01')],
      null,
    );
    const first = pages[0]?.slots[0];
    expect(first?.kind === 'stamp' && first.show.eventId).toBe('early');
  });

  it('puts the next show in the slot after the latest stamp', () => {
    expect(kinds(bookletPages(nights(2), show('up', '2027-01-01')))).toEqual([
      ['stamp', 'stamp', 'next', 'empty'],
    ]);
  });

  // A full page always has a page waiting after it: the board's four-night
  // booklet is "spread 1 of 2, next page is waiting".
  it('opens a waiting page once a page fills', () => {
    expect(kinds(bookletPages(nights(4), null))).toEqual([
      ['stamp', 'stamp', 'stamp', 'stamp'],
      ['empty', 'empty', 'empty', 'empty'],
    ]);
    expect(bookletPages(nights(11), null)).toHaveLength(3);
  });

  // The waiting page is where the next stamp lands when page 1 is full.
  it('puts the next show at the top of the waiting page after a full page', () => {
    const pages = bookletPages(nights(4), show('up', '2027-01-01'));
    expect(kinds(pages)).toEqual([
      ['stamp', 'stamp', 'stamp', 'stamp'],
      ['next', 'empty', 'empty', 'empty'],
    ]);
    const slot = pages[1]?.slots[0];
    expect(slot?.kind === 'next' && slot.show.eventId).toBe('up');
  });

  it('numbers pages from 1', () => {
    expect(bookletPages(nights(5), null).map((page) => page.number)).toEqual([
      1, 2,
    ]);
  });
});

describe('bookletSpreads', () => {
  const pages = bookletPages(nights(11), null);

  it('pairs pages on desktop, the identity page with page 1', () => {
    const spreads = bookletSpreads(pages, 'spread');
    expect(spreads.map(spreadName)).toEqual(['ID · 1', '2 · 3']);
  });

  it('stacks the identity page over page 1 on a phone, then one page each', () => {
    const spreads = bookletSpreads(pages, 'stack');
    expect(spreads.map(spreadName)).toEqual(['ID · 1', '2', '3']);
  });

  it('labels each spread by the pages in it', () => {
    const spreads = bookletSpreads(bookletPages(nights(16), null), 'spread');
    expect(spreads.map(spreadLabel)).toEqual([
      'Identity and page 1',
      'Pages 2 and 3',
      'Pages 4 and 5',
    ]);
    expect(
      spreadLabel(
        bookletSpreads(bookletPages(nights(8), null), 'spread')[1] ?? [],
      ),
    ).toBe('Pages 2 and 3');
  });

  it('knows a spread with no stamps is waiting', () => {
    const spreads = bookletSpreads(bookletPages(nights(4), null), 'spread');
    expect(spreads.map(spreadHasStamps)).toEqual([true, false]);
  });
});

describe('daysUntil and upcomingQueue', () => {
  it('counts whole Denver days', () => {
    expect(daysUntil('2026-11-12', '2026-11-11')).toBe(1);
    expect(daysUntil('2027-02-22', '2026-11-11')).toBe(103);
    expect(daysUntil('2026-11-11', '2026-11-11')).toBe(0);
  });

  it('keeps tonight and later, soonest first', () => {
    const queue = upcomingQueue(
      [
        show('b', '2026-12-01'),
        show('gone', '2026-11-10'),
        show('a', '2026-11-11'),
      ],
      '2026-11-11',
    );
    expect(queue.map((row) => row.eventId)).toEqual(['a', 'b']);
  });
});

describe('passportCodeLine', () => {
  it('prints the board line', () => {
    expect(
      passportCodeLine({
        handle: '@hugh',
        city: 'Denver',
        year: 2026,
        nights: 4,
        venues: 4,
      }),
    ).toBe('P<CCRAWL<<HUGH<<<<DENVER<<2026<<<4N4V');
  });

  it('fills spaces and punctuation with filler, and survives no city', () => {
    expect(
      passportCodeLine({
        handle: 'dj.k ay',
        city: null,
        year: 2026,
        nights: 1,
        venues: 1,
      }),
    ).toBe('P<CCRAWL<<DJ<K<AY<<<<<<2026<<<1N1V');
  });
});

describe('collectedVenues', () => {
  const active = [
    { slug: 'bluebird-theater', name: 'Bluebird Theater' },
    { slug: 'globe-hall', name: 'Globe Hall' },
    { slug: 'mission-ballroom', name: 'Mission Ballroom' },
  ];

  it('puts stamped venues first and counts against the active total', () => {
    const result = collectedVenues(active, [
      show('a', '2026-01-01', { venueSlug: 'mission-ballroom' }),
      show('b', '2026-01-02', { venueSlug: 'mission-ballroom' }),
      show('c', '2026-01-03', { venueSlug: 'retired-venue' }),
    ]);
    expect(result.venues.map((venue) => venue.slug)).toEqual([
      'mission-ballroom',
      'bluebird-theater',
      'globe-hall',
    ]);
    expect(result.collected).toBe(1);
    expect(result.total).toBe(3);
  });
});
