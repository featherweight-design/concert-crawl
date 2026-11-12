import { describe, it, expect, vi, afterEach } from 'vitest';
import { EVENTS_QUERY_KEYS, MAX_LIST_PARAM_VALUES } from '@concert-crawl/types';
import { buildEventsApiParams } from './events-api-params';

afterEach(() => {
  vi.useRealTimers();
});

const asObject = (qs: URLSearchParams): Record<string, string> =>
  Object.fromEntries(qs.entries());

describe('buildEventsApiParams', () => {
  it('translates the chip params the API does not accept under their URL names', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams({
        filterWhere: 'ogden-theatre',
        filterPrice: 'under-25',
        filterVibe: 'indie',
        search: 'khruangbin',
      }),
      { limit: 20, offset: 20 },
    );

    expect(asObject(qs)).toEqual({
      search: 'khruangbin',
      venueSlug: 'ogden-theatre',
      filterPrice: 'under-25',
      filterVibe: 'indie',
      offset: '20',
      limit: '20',
    });
    // The chip's own name must not ride along: `listEventsSchema` ignores an
    // unknown key, so an untranslated one is dropped server-side and the
    // filter silently stops applying.
    expect(qs.has('filterWhere')).toBe(false);
  });

  it('resolves filterWhen into a concrete from/to window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'));

    const qs = buildEventsApiParams(
      new URLSearchParams({ filterWhen: 'tonight' }),
      {
        limit: 20,
      },
    );

    expect(qs.get('from')).toBe('2026-05-14');
    expect(qs.get('to')).toBe('2026-05-14');
    expect(qs.has('filterWhen')).toBe(false);
  });

  it('lets the filterWhen shorthand win over an explicit from/to', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'));

    const qs = buildEventsApiParams(
      new URLSearchParams({
        filterWhen: 'tonight',
        from: '2026-07-01',
        to: '2026-07-02',
      }),
      { limit: 20 },
    );

    expect(qs.get('from')).toBe('2026-05-14');
    expect(qs.get('to')).toBe('2026-05-14');
  });

  it('takes the window as a pair rather than resolving each end alone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'));

    // A half-specified pair must not mix an explicit end with a chip-derived
    // one — that window belongs to neither, under a chip still claiming the
    // week.
    const qs = buildEventsApiParams(
      new URLSearchParams({ filterWhen: 'tonight', from: '2026-07-01' }),
      { limit: 20 },
    );

    expect(qs.get('from')).toBe('2026-05-14');
    expect(qs.get('to')).toBe('2026-05-14');
  });

  it('falls back to an explicit from/to when no chip is set', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams({ from: '2026-07-01', to: '2026-07-02' }),
      { limit: 20 },
    );

    expect(qs.get('from')).toBe('2026-07-01');
    expect(qs.get('to')).toBe('2026-07-02');
  });

  it('forwards every value of a repeated Where or Vibe key, whichever shape it arrives in', () => {
    // Next hands the server component an array; the client holds a
    // URLSearchParams. Disagreeing here reopens the page-1/page-2 scope
    // mismatch from the other side.
    const fromArray = buildEventsApiParams(
      {
        filterWhere: ['ogden-theatre', 'bluebird'],
        filterVibe: ['indie', 'punk'],
      },
      { limit: 20 },
    );
    const fromSearch = buildEventsApiParams(
      new URLSearchParams([
        ['filterWhere', 'ogden-theatre'],
        ['filterWhere', 'bluebird'],
        ['filterVibe', 'indie'],
        ['filterVibe', 'punk'],
      ]),
      { limit: 20 },
    );

    for (const qs of [fromArray, fromSearch]) {
      // A repeated key, one entry per value: the API reads it as an array.
      expect(qs.getAll('venueSlug')).toEqual(['ogden-theatre', 'bluebird']);
      expect(qs.getAll('filterVibe')).toEqual(['indie', 'punk']);
      expect(qs.has('filterWhere')).toBe(false);
    }
  });

  it('never treats a comma in the page URL as a separator', () => {
    // The filter UI reads these keys with `searchParams.get`; splitting here
    // would ask for more than the UI shows. A legacy raw-genre bookmark can
    // contain a comma and must go out whole for its exact match.
    const qs = buildEventsApiParams(
      new URLSearchParams({ filterVibe: 'folk, americana' }),
      { limit: 20 },
    );

    expect(qs.getAll('filterVibe')).toEqual(['folk, americana']);
  });

  it('trims, drops blank and dedupes the values of a list', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams([
        ['filterWhere', 'bluebird'],
        ['filterWhere', ''],
        ['filterWhere', ' bluebird '],
        ['filterVibe', '  '],
      ]),
      { limit: 20 },
    );

    expect(qs.getAll('venueSlug')).toEqual(['bluebird']);
    expect(qs.has('filterVibe')).toBe(false);
  });

  it('caps a list at the shared limit, truncating rather than throwing', () => {
    const many = Array.from(
      { length: MAX_LIST_PARAM_VALUES + 5 },
      (_, i) => `venue-${i}`,
    );
    const qs = buildEventsApiParams(
      { filterWhere: [...many, ...many] },
      { limit: 20 },
    );

    // Deduped first, so the doubled list still yields the first 25.
    expect(qs.getAll('venueSlug')).toEqual(
      many.slice(0, MAX_LIST_PARAM_VALUES),
    );
  });

  it('only ever emits keys GET /v1/events knows (#1698)', () => {
    // The API ignores an unknown key (with a warning) rather than rejecting
    // it, so a key this mapper forgets to translate would silently drop its
    // filter. Feed it every page-URL key Browse uses, all at once.
    const qs = buildEventsApiParams(
      new URLSearchParams([
        ['search', 'khruangbin'],
        ['filterWhere', 'ogden-theatre'],
        ['filterWhere', 'bluebird'],
        ['venueSlug', 'gothic'],
        ['filterWhen', 'this-week'],
        ['from', '2026-07-01'],
        ['to', '2026-07-31'],
        ['filterPrice', 'under-25'],
        ['filterVibe', 'indie'],
        ['filterVibe', 'punk'],
        ['filterTaste', '1'],
        ['filterFollowing', '1'],
        ['offset', '40'],
        ['view', 'cal'],
        ['weekOffset', '2'],
        ['page', '3'],
        ['selectedDate', '2026-07-04'],
        ['crew', 'crew-1'],
        ['someFutureKey', 'x'],
      ]),
      { limit: 20, taste: true, following: true },
    );

    const known: readonly string[] = EVENTS_QUERY_KEYS;
    const emitted = [...new Set(qs.keys())];
    expect(emitted.filter((key) => !known.includes(key))).toEqual([]);
    expect(emitted).toEqual(
      expect.arrayContaining([
        'search',
        'venueSlug',
        'from',
        'to',
        'filterPrice',
        'filterVibe',
        'taste',
        'following',
        'offset',
        'limit',
      ]),
    );
  });

  it('sends a legacy single-value URL exactly as it always did', () => {
    // A bookmarked `?filterWhere=red-rocks&filterVibe=dubstep` from before
    // multi-select must produce the same request, byte for byte.
    const qs = buildEventsApiParams(
      new URLSearchParams({ filterWhere: 'red-rocks', filterVibe: 'dubstep' }),
      { limit: 20 },
    );

    expect(qs.toString()).toBe(
      'venueSlug=red-rocks&filterVibe=dubstep&limit=20',
    );
  });

  it('falls back to every venueSlug value when no filterWhere is set', () => {
    const qs = buildEventsApiParams(
      { venueSlug: ['ogden-theatre', 'bluebird'] },
      { limit: 20 },
    );

    expect(qs.getAll('venueSlug')).toEqual(['ogden-theatre', 'bluebird']);
  });

  it('emits the scope flags only when the caller says the viewer holds them', () => {
    const params = new URLSearchParams({
      filterTaste: '1',
      filterFollowing: '1',
    });

    const granted = buildEventsApiParams(params, {
      limit: 20,
      taste: true,
      following: true,
    });
    expect(granted.get('taste')).toBe('1');
    expect(granted.get('following')).toBe('1');

    // A bookmarked URL is not an entitlement — the flags come from the caller,
    // never from the URL alone.
    const denied = buildEventsApiParams(params, { limit: 20 });
    expect(denied.has('taste')).toBe(false);
    expect(denied.has('following')).toBe(false);
    expect(denied.has('filterFollowing')).toBe(false);
  });

  it('keeps view-only params out of the request', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams({
        view: 'cal',
        weekOffset: '2',
        page: '3',
        selectedDate: '2026-05-14',
      }),
      { limit: 20 },
    );

    expect(asObject(qs)).toEqual({ limit: '20' });
  });

  it('reads a Next searchParams object as well as URLSearchParams', () => {
    const qs = buildEventsApiParams(
      { filterWhere: 'bluebird', offset: '40', from: undefined },
      { limit: 20 },
    );

    expect(qs.get('venueSlug')).toBe('bluebird');
    expect(qs.get('offset')).toBe('40');
  });

  it('drops a malformed offset rather than sending one the API rejects', () => {
    const qs = buildEventsApiParams({ offset: 'not-a-number' }, { limit: 20 });
    expect(qs.has('offset')).toBe(false);

    const negative = buildEventsApiParams({ offset: '-5' }, { limit: 20 });
    expect(negative.has('offset')).toBe(false);
  });

  it('prefers the caller offset over the one left in the URL', () => {
    const qs = buildEventsApiParams({ offset: '0' }, { limit: 20, offset: 60 });
    expect(qs.get('offset')).toBe('60');
  });
});
