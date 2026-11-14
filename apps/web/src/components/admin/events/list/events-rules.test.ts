import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  MAX_VENUE_FILTER,
  STATUS_CHIP,
  apiParams,
  eventsListHref,
  filtersFromParams,
  filtersToParams,
  formatPrice,
  hasFilters,
  showCount,
  type EventFilters,
} from './events-rules';

const params = (query: string) => new URLSearchParams(query);
const V1 = '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6';
const V2 = '7f6e5d4c-3b2a-4190-8f7e-6d5c4b3a2910';

describe('formatPrice', () => {
  it('writes a range, a single price and a wide range as the board does', () => {
    expect(formatPrice('65.00', '495.00')).toBe('$65–$495');
    expect(formatPrice('15.00', null)).toBe('$15');
    expect(formatPrice('15.00', '15.00')).toBe('$15');
    expect(formatPrice('89.50', '1250.00')).toBe('$89.50–$1,250');
  });

  it('is null with no price, so each surface words it', () => {
    expect(formatPrice(null, null)).toBeNull();
    expect(formatPrice(null, '20.00')).toBeNull();
    expect(formatPrice('', null)).toBeNull();
    expect(formatPrice('n/a', null)).toBeNull();
  });
});

describe('STATUS_CHIP', () => {
  it('draws No longer listed as the fan chip and Played muted', () => {
    expect(STATUS_CHIP.delisted).toBe('removed');
    expect(STATUS_CHIP.played).toBe('played');
    expect(STATUS_CHIP.soldout).toBe('soldout');
  });
});

describe('page URL and filters', () => {
  it('reads the search and the side from the URL', () => {
    expect(filtersFromParams(params('q=%20Clipse%20&when=past'))).toEqual({
      ...EMPTY_FILTERS,
      query: 'Clipse',
      when: 'past',
    });
    expect(filtersFromParams(params('when=nonsense'))).toEqual(EMPTY_FILTERS);
  });

  it('reads every filter from the URL, dropping what the API would refuse', () => {
    expect(
      filtersFromParams(
        params(
          `venueIds=${V1},${V2},${V1},not-a-uuid&statuses=postponed,cancelled,moved&noPrice=1&hidden=1`,
        ),
      ),
    ).toEqual({
      ...EMPTY_FILTERS,
      venueIds: [V1, V2],
      // Moved waits for Hugh (4b#1), so it is not a filter yet.
      statuses: ['postponed', 'cancelled'],
      noPrice: true,
      hidden: true,
    });
  });

  it('keeps at most 50 venues from the URL', () => {
    const ids = Array.from(
      { length: 60 },
      (_, i) => `0b9c4f3e-1d2a-4c5b-8e7f-${String(i).padStart(12, '0')}`,
    );
    const filters = filtersFromParams(params(`venueIds=${ids.join(',')}`));
    expect(filters.venueIds).toEqual(ids.slice(0, MAX_VENUE_FILTER));
    expect(MAX_VENUE_FILTER).toBe(50);
  });

  it('drops the upcoming-only filters on Past, which draws none', () => {
    expect(
      filtersFromParams(params(`when=past&q=fuzz&venueIds=${V1}&noPrice=1`)),
    ).toEqual({ ...EMPTY_FILTERS, when: 'past', query: 'fuzz' });
  });

  it('round-trips through the URL, leaving defaults out', () => {
    for (const query of [
      'q=FKJ&when=past',
      `q=FKJ&venueIds=${V1}&statuses=soldout,delisted&hidden=1`,
    ]) {
      const filters = filtersFromParams(params(query));
      expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
    }
    expect(eventsListHref(EMPTY_FILTERS)).toBe('/admin/events');
    expect(eventsListHref({ ...EMPTY_FILTERS, when: 'past' })).toBe(
      '/admin/events?when=past',
    );
    expect(eventsListHref({ ...EMPTY_FILTERS, noPrice: true })).toBe(
      '/admin/events?noPrice=1',
    );
  });

  it('knows when anything narrows the list', () => {
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, when: 'past' })).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, query: 'x' })).toBe(true);
    expect(hasFilters({ ...EMPTY_FILTERS, venueIds: [V1] })).toBe(true);
    expect(hasFilters({ ...EMPTY_FILTERS, statuses: ['soldout'] })).toBe(true);
    expect(hasFilters({ ...EMPTY_FILTERS, noPrice: true })).toBe(true);
    expect(hasFilters({ ...EMPTY_FILTERS, hidden: true })).toBe(true);
  });
});

describe('apiParams', () => {
  it('names each filter as the API does', () => {
    const filters = {
      query: ' Olive ',
      when: 'upcoming',
      venueIds: [V1, V2],
      statuses: ['available', 'delisted'],
      noPrice: true,
      hidden: true,
    } satisfies EventFilters;
    expect(Object.fromEntries(apiParams(filters, 25, 25))).toEqual({
      query: 'Olive',
      when: 'upcoming',
      venueIds: `${V1},${V2}`,
      statuses: 'available,delisted',
      noPrice: 'true',
      hidden: 'true',
      limit: '25',
      offset: '25',
    });
  });

  it('leaves an empty search out', () => {
    expect(Object.fromEntries(apiParams(EMPTY_FILTERS, 0, 25))).toEqual({
      when: 'upcoming',
      limit: '25',
      offset: '0',
    });
  });

  it('sends only the side, the search and the page on Past', () => {
    const filters = {
      ...EMPTY_FILTERS,
      when: 'past',
      venueIds: [V1],
      noPrice: true,
    } satisfies EventFilters;
    expect(Object.fromEntries(apiParams(filters, 0, 25))).toEqual({
      when: 'past',
      limit: '25',
      offset: '0',
    });
  });
});

describe('showCount', () => {
  const counts: Record<string, number> = { postponed: 6, cancelled: 9 };
  const countOf = (key: string) => counts[key] ?? 0;

  it('adds the ticked rows, as Postponed 6 and Cancelled 9 make Show 15', () => {
    expect(showCount(['postponed', 'cancelled'], countOf, 1204)).toBe(15);
  });

  it('shows every row when nothing is ticked', () => {
    expect(showCount([], countOf, 1204)).toBe(1204);
  });
});
