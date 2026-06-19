import { describe, it, expect } from 'vitest'
import {
  countActiveFilters,
  EMPTY_FILTERS,
  filtersToFetchQuery,
  parseFiltersFromParams,
  serializeFiltersToParams,
} from './filters'

describe('parseFiltersFromParams', () => {
  it('returns EMPTY_FILTERS for an empty URL', () => {
    expect(parseFiltersFromParams(new URLSearchParams())).toEqual(EMPTY_FILTERS)
  })

  it('parses query, verified, dateFrom/dateTo', () => {
    const params = new URLSearchParams(
      'query=lord+huron&verified=verified&dateFrom=2026-07-01&dateTo=2026-08-01',
    )
    expect(parseFiltersFromParams(params)).toEqual({
      ...EMPTY_FILTERS,
      query: 'lord huron',
      verified: 'verified',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-01',
    })
  })

  it('parses comma-separated genre + missingData and discards unknown flags', () => {
    const params = new URLSearchParams(
      'genre=indie,folk&missingData=no-price,nonsense,no-genre',
    )
    const parsed = parseFiltersFromParams(params)
    expect(parsed.genre).toEqual(['indie', 'folk'])
    expect(parsed.missingData).toEqual(['no-price', 'no-genre'])
  })

  it('dedupes repeated genre and missingData tags from the URL', () => {
    const params = new URLSearchParams(
      'genre=indie,indie,folk&missingData=no-price,no-price',
    )
    const parsed = parseFiltersFromParams(params)
    expect(parsed.genre).toEqual(['indie', 'folk'])
    expect(parsed.missingData).toEqual(['no-price'])
  })

  it('falls back to verified=all when the param is invalid', () => {
    const params = new URLSearchParams('verified=garbage')
    expect(parseFiltersFromParams(params).verified).toBe('all')
  })
})

describe('serializeFiltersToParams', () => {
  it('omits every key when filters are empty', () => {
    const params = serializeFiltersToParams(EMPTY_FILTERS)
    expect(params.toString()).toBe('')
  })

  it('writes only the set keys and preserves unrelated existing params', () => {
    const base = new URLSearchParams('tab=all-events')
    const filters = {
      ...EMPTY_FILTERS,
      query: 'lord huron',
      verified: 'verified' as const,
      genre: ['indie', 'folk'],
    }
    const next = serializeFiltersToParams(filters, base)
    expect(next.get('tab')).toBe('all-events')
    expect(next.get('query')).toBe('lord huron')
    expect(next.get('verified')).toBe('verified')
    expect(next.get('genre')).toBe('indie,folk')
  })

  it('removes a previously-set key when the filter is cleared', () => {
    const base = new URLSearchParams('query=stale&verified=verified')
    const next = serializeFiltersToParams(EMPTY_FILTERS, base)
    expect(next.get('query')).toBeNull()
    expect(next.get('verified')).toBeNull()
  })
})

describe('filtersToFetchQuery', () => {
  it('builds the API query string', () => {
    const filters = {
      ...EMPTY_FILTERS,
      query: 'lord huron',
      verified: 'verified' as const,
      dateFrom: '2026-07-01',
      genre: ['indie'],
      missingData: ['no-price' as const],
    }
    const query = filtersToFetchQuery(filters)
    const parsed = new URLSearchParams(query)
    expect(parsed.get('query')).toBe('lord huron')
    expect(parsed.get('verified')).toBe('true')
    expect(parsed.get('dateFrom')).toBe('2026-07-01')
    expect(parsed.get('genre')).toBe('indie')
    expect(parsed.get('missingData')).toBe('no-price')
  })

  it('maps unverified → verified=false', () => {
    const query = filtersToFetchQuery({
      ...EMPTY_FILTERS,
      verified: 'unverified',
    })
    expect(new URLSearchParams(query).get('verified')).toBe('false')
  })

  it('drops single-character query so deep-links cannot bypass the 2-char minimum', () => {
    const query = filtersToFetchQuery({ ...EMPTY_FILTERS, query: 'a' })
    expect(new URLSearchParams(query).get('query')).toBeNull()
  })

  it('drops a query that trims down to a single character', () => {
    const query = filtersToFetchQuery({ ...EMPTY_FILTERS, query: '  a  ' })
    expect(new URLSearchParams(query).get('query')).toBeNull()
  })

  it('keeps a 2-character query', () => {
    const query = filtersToFetchQuery({ ...EMPTY_FILTERS, query: 'ab' })
    expect(new URLSearchParams(query).get('query')).toBe('ab')
  })
})

describe('countActiveFilters', () => {
  it('returns 0 when no filters are set', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
  })

  it('counts each active filter group exactly once', () => {
    expect(
      countActiveFilters({
        query: 'spoon',
        verified: 'verified',
        dateFrom: '2026-07-01',
        dateTo: '',
        genre: ['indie', 'folk'],
        missingData: ['no-price'],
      }),
    ).toBe(5)
  })

  it('does not count a single-character query as an active filter', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(0)
  })
})

import {
  EMPTY_PAGINATION,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_URL_DEFAULT_PAGE_SIZE,
  parsePaginationFromParams,
  serializePaginationToParams,
} from './filters'

describe('parsePaginationFromParams', () => {
  it('returns defaults when the URL is empty', () => {
    expect(parsePaginationFromParams(new URLSearchParams())).toEqual(
      EMPTY_PAGINATION,
    )
  })

  it('parses page + pageSize from the URL', () => {
    const params = new URLSearchParams('page=3&pageSize=50')
    expect(parsePaginationFromParams(params)).toEqual({ page: 3, pageSize: 50 })
  })

  it('snaps a garbage pageSize to the default rather than passing it through', () => {
    const params = new URLSearchParams('pageSize=37')
    expect(parsePaginationFromParams(params).pageSize).toBe(
      PAGINATION_URL_DEFAULT_PAGE_SIZE,
    )
  })

  it('clamps page<=0 up to 1', () => {
    expect(parsePaginationFromParams(new URLSearchParams('page=0')).page).toBe(
      PAGINATION_DEFAULT_PAGE,
    )
    expect(parsePaginationFromParams(new URLSearchParams('page=-5')).page).toBe(
      PAGINATION_DEFAULT_PAGE,
    )
  })
})

describe('serializePaginationToParams', () => {
  it('omits page + pageSize when they match the defaults', () => {
    const next = serializePaginationToParams(EMPTY_PAGINATION)
    expect(next.toString()).toBe('')
  })

  it('writes only the non-default keys and preserves unrelated params', () => {
    const base = new URLSearchParams('tab=all-events')
    const next = serializePaginationToParams({ page: 3, pageSize: 50 }, base)
    expect(next.get('tab')).toBe('all-events')
    expect(next.get('page')).toBe('3')
    expect(next.get('pageSize')).toBe('50')
  })

  it('strips previously-set keys when state returns to defaults', () => {
    const base = new URLSearchParams('page=3&pageSize=50')
    const next = serializePaginationToParams(EMPTY_PAGINATION, base)
    expect(next.get('page')).toBeNull()
    expect(next.get('pageSize')).toBeNull()
  })
})
