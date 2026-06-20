'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import {
  filtersToFetchQuery,
  type AllEventsFilters,
} from '@/components/admin/review/all/filters'
import { type AllEvent } from '@/components/admin/review/all/types'
import { type MissingRowEvent } from '@/components/admin/review/missing/MissingRow'

// Page-replacement model: each `useQuery` returns just the rows for the
// current page plus the server-reported `total`. The new <Pagination/>
// component drives `page` / `pageSize`; the query key includes both so
// changing them produces fresh data (TanStack's cache holds adjacent pages
// for the same filter, so flipping forward and back is instant).

// Local default for AllEventsTabContent's standalone-prop fallback. The
// URL is the source of truth in the wired-up parent (ReviewPageClient ↔
// PAGINATION_URL_DEFAULT_PAGE_SIZE), so this only kicks in when the tab
// is rendered without a parent-controlled pagination state.
export const REVIEW_ALL_EVENTS_PAGE_SIZE = 20

// Re-exported types so consumers can import everything review-related from
// one place. The shapes mirror the inline interfaces in ReviewPageClient.
export interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

export interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

// Backend response shape when ?count=true is passed.
interface CountedResponse<TRow> {
  rows: TRow[]
  total: number
}

// Aggregate counts for the Review tab pills — surfaced on initial mount via
// the SSR fetch in /admin/review/page.tsx and refreshed client-side after
// mutations.
export interface ReviewCounts {
  eventFlags: number
  prices: number
  missing: number
}

// Stable query key roots. Each `(page, pageSize)` pair gets its own cache
// slot, so paging back is instant. Filter changes produce a fresh filterQuery
// which moves to a new slot — selection clears in the parent on that signal.
export const reviewQueryKeys = {
  root: ['admin', 'review'] as const,
  counts: ['admin', 'review', 'counts'] as const,
  allEvents: (filterQuery: string, page: number, pageSize: number) =>
    ['admin', 'review', 'all-events', filterQuery, page, pageSize] as const,
  eventFlags: (page: number, pageSize: number) =>
    ['admin', 'review', 'event-flags', page, pageSize] as const,
  missing: (page: number, pageSize: number) =>
    ['admin', 'review', 'missing', page, pageSize] as const,
  priceEvents: (filter: 'missing' | 'all', page: number, pageSize: number) =>
    ['admin', 'review', 'price-events', filter, page, pageSize] as const,
}

export interface PaginatedQueryInput {
  page: number
  pageSize: number
}

// ───── Counts (Review tab pills + sidebar badge) ─────────────────────────────
export function useReviewCounts(initialData?: ReviewCounts) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: reviewQueryKeys.counts,
    queryFn: async (): Promise<ReviewCounts> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.get<ReviewCounts>('/v1/admin/review/counts', token)
    },
    ...(initialData ? { initialData } : {}),
  })
}

// ───── All Events tab ────────────────────────────────────────────────────────
export function useReviewAllEvents(
  filters: AllEventsFilters,
  pagination: PaginatedQueryInput,
) {
  const { getToken } = useAuth()
  const { page, pageSize } = pagination
  const filterQuery = filtersToFetchQuery(filters)
  return useQuery({
    queryKey: reviewQueryKeys.allEvents(filterQuery, page, pageSize),
    queryFn: async (): Promise<CountedResponse<AllEvent>> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const offset = (page - 1) * pageSize
      const suffix = filterQuery ? `&${filterQuery}` : ''
      return apiClient.get<CountedResponse<AllEvent>>(
        `/v1/admin/events?count=true&limit=${pageSize}&offset=${offset}${suffix}`,
        token,
      )
    },
    placeholderData: (prev) => prev,
  })
}

// ───── Event Flags tab ───────────────────────────────────────────────────────
// `enabled` lets the caller gate the query on tab activity so paging in a
// neighbour tab doesn't refetch this surface in the background.
export function useReviewEventFlags(
  pagination: PaginatedQueryInput,
  enabled: boolean = true,
) {
  const { getToken } = useAuth()
  const { page, pageSize } = pagination
  return useQuery({
    queryKey: reviewQueryKeys.eventFlags(page, pageSize),
    enabled,
    queryFn: async (): Promise<CountedResponse<EventFlag>> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const offset = (page - 1) * pageSize
      return apiClient.get<CountedResponse<EventFlag>>(
        `/v1/admin/events?count=true&verified=false&limit=${pageSize}&offset=${offset}`,
        token,
      )
    },
    placeholderData: (prev) => prev,
  })
}

// ───── Missing tab ───────────────────────────────────────────────────────────
// Paginated single-endpoint query gated on `enabled` until the tab is opened.
export function useReviewMissingEvents(
  enabled: boolean,
  pagination: PaginatedQueryInput,
) {
  const { getToken } = useAuth()
  const { page, pageSize } = pagination
  return useQuery({
    queryKey: reviewQueryKeys.missing(page, pageSize),
    enabled,
    queryFn: async (): Promise<CountedResponse<MissingRowEvent>> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const offset = (page - 1) * pageSize
      return apiClient.get<CountedResponse<MissingRowEvent>>(
        `/v1/admin/events?count=true&missing=true&limit=${pageSize}&offset=${offset}`,
        token,
      )
    },
    placeholderData: (prev) => prev,
  })
}

// ───── Price Coverage tab ────────────────────────────────────────────────────
export function useReviewPriceEvents(
  filter: 'missing' | 'all',
  pagination: PaginatedQueryInput,
  enabled: boolean = true,
) {
  const { getToken } = useAuth()
  const { page, pageSize } = pagination
  return useQuery({
    queryKey: reviewQueryKeys.priceEvents(filter, page, pageSize),
    enabled,
    queryFn: async (): Promise<CountedResponse<PriceEvent>> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const offset = (page - 1) * pageSize
      const missingOnly = filter === 'missing'
      return apiClient.get<CountedResponse<PriceEvent>>(
        `/v1/admin/prices/events?count=true&missingOnly=${String(missingOnly)}&limit=${pageSize}&offset=${offset}`,
        token,
      )
    },
    placeholderData: (prev) => prev,
  })
}

// ───── Invalidation helpers ──────────────────────────────────────────────────
// Mutations invalidate at the surface level: every (page, pageSize) slot for
// a given surface goes stale at once. The active page refetches; the rest
// refetch lazily on next render.

export function useInvalidateReviewQueries() {
  const queryClient = useQueryClient()
  return {
    allEvents: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'all-events'],
      }),
    eventFlags: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'event-flags'],
      }),
    missing: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'missing'],
      }),
    priceEvents: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'price-events'],
      }),
    counts: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.counts }),
    all: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.root }),
  }
}
