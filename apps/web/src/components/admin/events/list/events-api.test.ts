import { describe, expect, it } from 'vitest';
import { countsFrom, rowFrom } from './events-api';

const ROW = {
  id: 'evt-1',
  title: 'Clipse',
  date: '2026-11-12',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  status: 'available',
  hidden: false,
  hiddenReason: null,
  priceMin: '65.00',
  priceMax: null,
  watchingCount: 3,
  wentCount: null,
};

describe('rowFrom', () => {
  it('links the show’s own page over the calendar it was crawled from', () => {
    expect(
      rowFrom({
        ...ROW,
        eventUrl: 'https://x.example/shows/1',
        sourceUrl: 'https://x.example/calendar',
      }),
    ).toMatchObject({ venueUrl: 'https://x.example/shows/1' });
  });

  it('falls back to the calendar when the show page is unsafe or missing', () => {
    expect(
      rowFrom({
        ...ROW,
        eventUrl: 'javascript:alert(1)',
        sourceUrl: 'https://x.example/calendar',
      }),
    ).toMatchObject({ venueUrl: 'https://x.example/calendar' });
    expect(
      rowFrom({ ...ROW, eventUrl: null, sourceUrl: 'javascript:alert(1)' }),
    ).toMatchObject({ venueUrl: null });
  });

  it('reads a row from an API that predates the URLs as no link, not a failure', () => {
    expect(rowFrom(ROW)).toMatchObject({ id: 'evt-1', venueUrl: null });
  });

  it('refuses a non-text URL', () => {
    expect(rowFrom({ ...ROW, sourceUrl: 42 })).toBeNull();
    expect(rowFrom({ ...ROW, eventUrl: 42 })).toBeNull();
  });
});

const VENUE = {
  venueId: '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6',
  name: 'Red Rocks',
  slug: 'red-rocks',
  total: 88,
};

const counts = (overrides: Record<string, unknown> = {}) => ({
  all: 1204,
  noPrice: 214,
  hidden: 4,
  byStatus: { postponed: 6, cancelled: 9 },
  byVenue: [VENUE],
  ...overrides,
});

describe('countsFrom', () => {
  it('reads every count the chips and popovers draw', () => {
    expect(countsFrom(counts())).toEqual({
      all: 1204,
      noPrice: 214,
      hidden: 4,
      byStatus: { postponed: 6, cancelled: 9 },
      byVenue: [VENUE],
    });
  });

  it('reads every status key the API always sends, zeros included', () => {
    const byStatus = {
      available: 3,
      soldout: 0,
      postponed: 1,
      cancelled: 0,
      delisted: 0,
      played: 0,
    };
    expect(countsFrom(counts({ byStatus }))?.byStatus).toEqual(byStatus);
  });

  it('keeps only the statuses it knows, with counts', () => {
    expect(
      countsFrom(counts({ byStatus: { soldout: 3, moved: 2, played: 'x' } }))
        ?.byStatus,
    ).toEqual({ soldout: 3 });
  });

  it('fails on a missing count or a malformed venue, so the page says Couldn’t load', () => {
    expect(countsFrom(null)).toBeNull();
    expect(countsFrom(counts({ noPrice: undefined }))).toBeNull();
    expect(countsFrom(counts({ all: '1204' }))).toBeNull();
    expect(countsFrom(counts({ byStatus: null }))).toBeNull();
    expect(countsFrom(counts({ byVenue: {} }))).toBeNull();
    expect(
      countsFrom(counts({ byVenue: [{ ...VENUE, slug: null }] })),
    ).toBeNull();
  });
});
