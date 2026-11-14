import { describe, expect, it } from 'vitest';
import { countsFrom } from './events-api';

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
