'use client'

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import {
  filtersToFetchQuery,
  type AllEventsFilters,
} from '@/components/admin/review/all/filters'
import { type AllEvent } from '@/components/admin/review/all/types'
import { type MissingRowEvent } from '@/components/admin/review/missing/MissingRow'

// Default page sizes — small enough that returning to a tab feels instant,
// large enough that admins rarely need a second page for routine work. We're
// migrating these from the historical defaults (50–200) as part of #688.
export const REVIEW_ALL_EVENTS_PAGE_SIZE = 20
export const REVIEW_PRICE_EVENTS_PAGE_SIZE = 20
export const REVIEW_EVENT_FLAGS_PAGE_SIZE = 20
export const REVIEW_MISSING_PAGE_SIZE = 50

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

// Stable query key roots. Hooks combine these with the filter / page params
// that affect server output. `queryClient.invalidateQueries({ queryKey: [...,
// 'review'] })` blasts everything when a coarse refresh is needed.
export const reviewQueryKeys = {
  root: ['admin', 'review'] as const,
  allEvents: (filterQuery: string) =>
    ['admin', 'review', 'all-events', filterQuery] as const,
  eventFlags: ['admin', 'review', 'event-flags'] as const,
  missing: ['admin', 'review', 'missing'] as const,
  priceEvents: (filter: 'missing' | 'all') =>
    ['admin', 'review', 'price-events', filter] as const,
}

// ───── All Events tab ────────────────────────────────────────────────────────
// `useInfiniteQuery` because the table grows page-by-page from a single
// endpoint with `limit` + `offset`. Each filter change produces a fresh key,
// so cache for the previous filter sticks around (cheap revisits) and stale
// fetches can't write into the new filter's state.
export function useReviewAllEvents(
  filters: AllEventsFilters,
  pageSize: number = REVIEW_ALL_EVENTS_PAGE_SIZE,
) {
  const { getToken } = useAuth()
  const filterQuery = filtersToFetchQuery(filters)
  return useInfiniteQuery({
    queryKey: reviewQueryKeys.allEvents(filterQuery),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<AllEvent[]> => {
      const token = await getToken()
      if (!token) return []
      const suffix = filterQuery ? `&${filterQuery}` : ''
      return apiClient.get<AllEvent[]>(
        `/v1/admin/events?limit=${pageSize}&offset=${pageParam}${suffix}`,
        token,
      )
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize
        ? allPages.reduce((sum, page) => sum + page.length, 0)
        : undefined,
  })
}

// ───── Event Flags tab ───────────────────────────────────────────────────────
// Initial page comes from SSR (`initialData`) so the first paint matches the
// previous behavior. Additional pages flow through `useInfiniteQuery`.
export function useReviewEventFlags(
  initialEvents: EventFlag[],
  pageSize: number = REVIEW_EVENT_FLAGS_PAGE_SIZE,
) {
  const { getToken } = useAuth()
  return useInfiniteQuery({
    queryKey: reviewQueryKeys.eventFlags,
    initialPageParam: 0,
    initialData: { pages: [initialEvents], pageParams: [0] },
    queryFn: async ({ pageParam }): Promise<EventFlag[]> => {
      const token = await getToken()
      if (!token) return []
      return apiClient.get<EventFlag[]>(
        `/v1/admin/events?verified=false&limit=${pageSize}&offset=${pageParam}`,
        token,
      )
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize
        ? allPages.reduce((sum, page) => sum + page.length, 0)
        : undefined,
  })
}

// ───── Missing tab ───────────────────────────────────────────────────────────
// Single fetch, no pagination — the dataset is naturally small (events the
// crawler stopped seeing). `enabled` gates the fetch until the tab is opened.
export function useReviewMissingEvents(
  enabled: boolean,
  pageSize: number = REVIEW_MISSING_PAGE_SIZE,
) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: reviewQueryKeys.missing,
    enabled,
    queryFn: async (): Promise<MissingRowEvent[]> => {
      const token = await getToken()
      if (!token) return []
      return apiClient.get<MissingRowEvent[]>(
        `/v1/admin/events?missing=true&limit=${pageSize}`,
        token,
      )
    },
  })
}

// ───── Price Coverage tab ────────────────────────────────────────────────────
// Toggle between "missing" and "all" splits into two cache slots so flipping
// back and forth is instant. Pagination uses `useInfiniteQuery` like All Events.
export function useReviewPriceEvents(
  filter: 'missing' | 'all',
  pageSize: number = REVIEW_PRICE_EVENTS_PAGE_SIZE,
) {
  const { getToken } = useAuth()
  return useInfiniteQuery({
    queryKey: reviewQueryKeys.priceEvents(filter),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PriceEvent[]> => {
      const token = await getToken()
      if (!token) return []
      const missingOnly = filter === 'missing'
      return apiClient.get<PriceEvent[]>(
        `/v1/admin/prices/events?missingOnly=${String(missingOnly)}&limit=${pageSize}&offset=${pageParam}`,
        token,
      )
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize
        ? allPages.reduce((sum, page) => sum + page.length, 0)
        : undefined,
  })
}

// ───── Invalidation helpers ──────────────────────────────────────────────────
// Mutations call these on success so the table mirrors server state. We
// invalidate at the surface level because mutations can affect multiple
// filter slots (e.g. verifying an event removes it from the unverified list
// AND adds it to the All Events verified slot).

export function useInvalidateReviewQueries() {
  const queryClient = useQueryClient()
  return {
    allEvents: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'all-events'],
      }),
    eventFlags: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.eventFlags }),
    missing: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.missing }),
    priceEvents: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'review', 'price-events'],
      }),
    all: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.root }),
  }
}
