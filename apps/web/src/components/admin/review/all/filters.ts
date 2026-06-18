export const MISSING_DATA_FLAGS = [
  'no-price',
  'no-show-time',
  'no-genre',
  'no-doors-time',
] as const

export type MissingDataFlag = (typeof MISSING_DATA_FLAGS)[number]

export type VerificationFilter = 'all' | 'verified' | 'unverified'

export interface AllEventsFilters {
  query: string
  verified: VerificationFilter
  dateFrom: string
  dateTo: string
  genre: string[]
  missingData: MissingDataFlag[]
}

export const EMPTY_FILTERS: AllEventsFilters = {
  query: '',
  verified: 'all',
  dateFrom: '',
  dateTo: '',
  genre: [],
  missingData: [],
}

const isVerification = (val: string | null): val is VerificationFilter =>
  val === 'all' || val === 'verified' || val === 'unverified'

const isMissingDataFlag = (val: string): val is MissingDataFlag =>
  (MISSING_DATA_FLAGS as ReadonlyArray<string>).includes(val)

export const parseFiltersFromParams = (
  params: URLSearchParams,
): AllEventsFilters => {
  const verifiedRaw = params.get('verified')
  const verified: VerificationFilter = isVerification(verifiedRaw)
    ? verifiedRaw
    : 'all'

  // Dedupe parsed lists so `?genre=indie,indie` doesn't yield duplicate chips
  // (React key collisions). Preserve insertion order via Set.
  const genre = Array.from(
    new Set(
      (params.get('genre') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  )

  const missingData = Array.from(
    new Set(
      (params.get('missingData') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(isMissingDataFlag),
    ),
  )

  return {
    query: params.get('query') ?? '',
    verified,
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    genre,
    missingData,
  }
}

export const serializeFiltersToParams = (
  filters: AllEventsFilters,
  base?: URLSearchParams,
): URLSearchParams => {
  const next = new URLSearchParams(base?.toString() ?? '')
  // Strip every filter key first so unsetting a filter actually removes it.
  for (const key of [
    'query',
    'verified',
    'dateFrom',
    'dateTo',
    'genre',
    'missingData',
  ]) {
    next.delete(key)
  }
  if (effectiveQuery(filters)) next.set('query', effectiveQuery(filters))
  if (filters.verified !== 'all') next.set('verified', filters.verified)
  if (filters.dateFrom) next.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) next.set('dateTo', filters.dateTo)
  if (filters.genre.length > 0) next.set('genre', filters.genre.join(','))
  if (filters.missingData.length > 0) {
    next.set('missingData', filters.missingData.join(','))
  }
  return next
}

// Minimum query length that triggers an actual filter. 1-char searches were
// too noisy in beta — they fired a backend search for every single keystroke
// at the start of a word. The input debounces above this threshold so users
// rarely notice; URL deep-links with a 1-char query are silently ignored.
export const SEARCH_MIN_CHARS = 2

// Returns the query that should actually be sent to the backend / written to
// the URL. Trims whitespace and drops drafts below SEARCH_MIN_CHARS so a
// single-letter `query` (typed or deep-linked) never reaches the API. Empty
// string is also returned as empty — callers decide what to do with that.
export const effectiveQuery = (filters: AllEventsFilters): string => {
  const trimmed = filters.query.trim()
  return trimmed.length >= SEARCH_MIN_CHARS ? trimmed : ''
}

export const filtersToFetchQuery = (filters: AllEventsFilters): string => {
  const params = new URLSearchParams()
  const query = effectiveQuery(filters)
  if (query) params.set('query', query)
  if (filters.verified === 'verified') params.set('verified', 'true')
  if (filters.verified === 'unverified') params.set('verified', 'false')
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.genre.length > 0) params.set('genre', filters.genre.join(','))
  if (filters.missingData.length > 0) {
    params.set('missingData', filters.missingData.join(','))
  }
  return params.toString()
}

export const countActiveFilters = (filters: AllEventsFilters): number => {
  let count = 0
  if (effectiveQuery(filters)) count++
  if (filters.verified !== 'all') count++
  if (filters.dateFrom) count++
  if (filters.dateTo) count++
  if (filters.genre.length > 0) count++
  if (filters.missingData.length > 0) count++
  return count
}
