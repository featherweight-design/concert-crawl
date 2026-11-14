import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  STATUS_CHIP,
  apiParams,
  eventsListHref,
  filtersFromParams,
  filtersToParams,
  formatPrice,
  hasFilters,
} from './events-rules';

const params = (query: string) => new URLSearchParams(query);

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
      query: 'Clipse',
      when: 'past',
    });
    expect(filtersFromParams(params('when=nonsense'))).toEqual(EMPTY_FILTERS);
  });

  it('round-trips through the URL, leaving defaults out', () => {
    const filters = filtersFromParams(params('q=FKJ&when=past'));
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
    expect(eventsListHref(EMPTY_FILTERS)).toBe('/admin/events');
    expect(eventsListHref({ ...EMPTY_FILTERS, when: 'past' })).toBe(
      '/admin/events?when=past',
    );
  });

  it('knows when a search narrows the list', () => {
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, when: 'past' })).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, query: 'x' })).toBe(true);
  });
});

describe('apiParams', () => {
  it('names each filter as the API does', () => {
    expect(
      Object.fromEntries(
        apiParams({ query: ' Olive ', when: 'upcoming' }, 25, 25),
      ),
    ).toEqual({ query: 'Olive', when: 'upcoming', limit: '25', offset: '25' });
  });

  it('leaves an empty search out', () => {
    expect(Object.fromEntries(apiParams(EMPTY_FILTERS, 0, 25))).toEqual({
      when: 'upcoming',
      limit: '25',
      offset: '0',
    });
  });
});
