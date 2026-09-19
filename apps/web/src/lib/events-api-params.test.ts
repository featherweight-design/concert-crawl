import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildEventsApiParams } from './events-api-params'

afterEach(() => {
  vi.useRealTimers()
})

const asObject = (qs: URLSearchParams): Record<string, string> =>
  Object.fromEntries(qs.entries())

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
    )

    expect(asObject(qs)).toEqual({
      search: 'khruangbin',
      venueSlug: 'ogden-theatre',
      filterPrice: 'under-25',
      filterVibe: 'indie',
      offset: '20',
      limit: '20',
    })
    // The chip's own name must not ride along: `listEventsSchema` is not
    // strict, so an untranslated key is dropped server-side and the filter
    // silently stops applying.
    expect(qs.has('filterWhere')).toBe(false)
  })

  it('resolves filterWhen into a concrete from/to window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'))

    const qs = buildEventsApiParams(
      new URLSearchParams({ filterWhen: 'tonight' }),
      {
        limit: 20,
      },
    )

    expect(qs.get('from')).toBe('2026-05-14')
    expect(qs.get('to')).toBe('2026-05-14')
    expect(qs.has('filterWhen')).toBe(false)
  })

  it('lets the filterWhen shorthand win over an explicit from/to', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'))

    const qs = buildEventsApiParams(
      new URLSearchParams({
        filterWhen: 'tonight',
        from: '2026-07-01',
        to: '2026-07-02',
      }),
      { limit: 20 },
    )

    expect(qs.get('from')).toBe('2026-05-14')
    expect(qs.get('to')).toBe('2026-05-14')
  })

  it('takes the window as a pair rather than resolving each end alone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'))

    // A half-specified pair must not mix an explicit end with a chip-derived
    // one — that window belongs to neither, under a chip still claiming the
    // week.
    const qs = buildEventsApiParams(
      new URLSearchParams({ filterWhen: 'tonight', from: '2026-07-01' }),
      { limit: 20 },
    )

    expect(qs.get('from')).toBe('2026-05-14')
    expect(qs.get('to')).toBe('2026-05-14')
  })

  it('falls back to an explicit from/to when no chip is set', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams({ from: '2026-07-01', to: '2026-07-02' }),
      { limit: 20 },
    )

    expect(qs.get('from')).toBe('2026-07-01')
    expect(qs.get('to')).toBe('2026-07-02')
  })

  it('reads only the first value of a repeated key, whichever shape it arrives in', () => {
    // Next hands the server component an array; the client holds a
    // URLSearchParams. Disagreeing here reopens the page-1/page-2 scope
    // mismatch from the other side.
    const fromArray = buildEventsApiParams(
      { filterVibe: ['indie', 'punk'] },
      { limit: 20 },
    )
    const fromSearch = buildEventsApiParams(
      new URLSearchParams([
        ['filterVibe', 'indie'],
        ['filterVibe', 'punk'],
      ]),
      { limit: 20 },
    )

    expect(fromArray.get('filterVibe')).toBe('indie')
    expect(fromSearch.get('filterVibe')).toBe('indie')
  })

  it('emits the scope flags only when the caller says the viewer holds them', () => {
    const params = new URLSearchParams({
      filterTaste: '1',
      filterFollowing: '1',
    })

    const granted = buildEventsApiParams(params, {
      limit: 20,
      taste: true,
      following: true,
    })
    expect(granted.get('taste')).toBe('1')
    expect(granted.get('following')).toBe('1')

    // A bookmarked URL is not an entitlement — the flags come from the caller,
    // never from the URL alone.
    const denied = buildEventsApiParams(params, { limit: 20 })
    expect(denied.has('taste')).toBe(false)
    expect(denied.has('following')).toBe(false)
    expect(denied.has('filterFollowing')).toBe(false)
  })

  it('keeps view-only params out of the request', () => {
    const qs = buildEventsApiParams(
      new URLSearchParams({
        view: 'cal',
        weekOffset: '2',
        page: '3',
        selectedDate: '2026-05-14',
      }),
      { limit: 20 },
    )

    expect(asObject(qs)).toEqual({ limit: '20' })
  })

  it('reads a Next searchParams object as well as URLSearchParams', () => {
    const qs = buildEventsApiParams(
      { filterWhere: 'bluebird', offset: '40', from: undefined },
      { limit: 20 },
    )

    expect(qs.get('venueSlug')).toBe('bluebird')
    expect(qs.get('offset')).toBe('40')
  })

  it('drops a malformed offset rather than sending one the API rejects', () => {
    const qs = buildEventsApiParams({ offset: 'not-a-number' }, { limit: 20 })
    expect(qs.has('offset')).toBe(false)

    const negative = buildEventsApiParams({ offset: '-5' }, { limit: 20 })
    expect(negative.has('offset')).toBe(false)
  })

  it('prefers the caller offset over the one left in the URL', () => {
    const qs = buildEventsApiParams({ offset: '0' }, { limit: 20, offset: 60 })
    expect(qs.get('offset')).toBe('60')
  })
})
