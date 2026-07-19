'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  reviewQueryKeys,
  useInvalidateReviewQueries,
  useReviewCounts,
  useReviewEventFlags,
  useReviewMissingEvents,
  useReviewPriceEvents,
  type EventFlag,
  type PriceEvent,
  type ReviewCounts,
} from '@/lib/queries/use-admin-review'
import { useQueryClient } from '@tanstack/react-query'
import { AdminReviewMobile } from './AdminReviewMobile'
import { ReviewTabs, type ReviewTabDescriptor } from './ReviewTabs'
import { EventFlagsTabContent } from './_tabs/EventFlagsTabContent'
import { editEventHref } from '@/lib/admin/edit-event-link'
import { computePendingCount } from '@/lib/admin/review-pending'
import { PricesTabContent } from './_tabs/PricesTabContent'
import { AllEventsTabContent } from './_tabs/AllEventsTabContent'
import { ContestsTabContent } from './_tabs/ContestsTabContent'
import {
  EMPTY_PAGINATION,
  parseFiltersFromParams,
  parsePaginationFromParams,
  serializeFiltersToParams,
  serializePaginationToParams,
  type PaginationState,
} from './all/filters'
import { type AllEvent } from './all/types'
import { MissingTabContent } from './_tabs/MissingTabContent'
import { type MissingRowEvent } from './missing/MissingRow'

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  note?: string | null
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

interface ReviewPageClientProps {
  initialEvents: EventFlag[]
  initialSubmissions: PriceSubmission[]
  initialCounts: ReviewCounts
}

type ReviewTabKey =
  'event-flags' | 'prices' | 'missing' | 'all-events' | 'contests'

const VALID_TAB_KEYS: ReadonlySet<string> = new Set([
  'event-flags',
  'prices',
  'missing',
  'all-events',
  'contests',
])

const isValidTabKey = (value: string | null): value is ReviewTabKey =>
  value !== null && VALID_TAB_KEYS.has(value)

const resolveTabFromSearchParams = (params: URLSearchParams): ReviewTabKey => {
  const tab = params.get('tab')
  if (isValidTabKey(tab)) return tab
  // Back-compat: legacy `?section=submissions` → prices tab
  if (params.get('section') === 'submissions') return 'prices'
  return 'event-flags'
}

export const ReviewPageClient = ({
  initialEvents,
  initialSubmissions,
  initialCounts,
}: ReviewPageClientProps) => {
  const { getToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReviewQueries()

  // Push helper — pushing an empty query string leaves a trailing "?" in
  // the URL, so route through pathname when there are no params.
  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )
  const activeTab: ReviewTabKey = resolveTabFromSearchParams(
    new URLSearchParams(searchParams?.toString() ?? ''),
  )

  // Pagination state is parsed straight out of the URL — one (page, pageSize)
  // shared across whichever tab is active. Switching tabs strips the keys so
  // each tab opens at page 1 (sitting on page 40 of the previous tab's data
  // is never what the admin wants).
  const pagination: PaginationState = parsePaginationFromParams(
    new URLSearchParams(searchParams?.toString() ?? ''),
  )

  const onPaginationChange = useCallback(
    (next: PaginationState) => {
      const base = new URLSearchParams(searchParams?.toString() ?? '')
      pushParams(serializePaginationToParams(next, base))
    },
    [pushParams, searchParams],
  )

  const setActiveTab = useCallback(
    (next: string) => {
      if (!isValidTabKey(next)) return
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('tab', next)
      params.delete('section') // retire legacy key once user navigates
      // Each tab opens at its own page 1 — strip pagination from the URL.
      pushParams(serializePaginationToParams(EMPTY_PAGINATION, params))
    },
    [pushParams, searchParams],
  )

  const [submissions, setSubmissions] =
    useState<PriceSubmission[]>(initialSubmissions)
  const [priceFilter, setPriceFilter] = useState<'missing' | 'all'>('missing')
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  // Pending-remove IDs let mutations feel instant without touching the cached
  // page arrays. Mutating the cache (filter() on each page) was shrinking
  // page lengths, which `getNextPageParam` then summed for the next offset —
  // pagination would silently re-fetch earlier rows. Filter at render time
  // instead; invalidate the cache; clear the pending id on settle.
  const [pendingRemoveFlagIds, setPendingRemoveFlagIds] = useState<Set<string>>(
    new Set(),
  )
  const [pendingRemoveMissingIds, setPendingRemoveMissingIds] = useState<
    Set<string>
  >(new Set())

  // Each data-bearing tab is its own paginated useQuery, keyed by
  // (filterQuery, page, pageSize). Page-replacement model: changing page
  // refetches just that page. SSR's `initialEvents` becomes the first-paint
  // fallback before the client query lands.
  //
  // Desktop gates each query to the active tab so paging in one tab doesn't
  // refetch its neighbours in the background. Mobile renders all surfaces
  // through a single shell (AdminReviewMobile owns the visible tab), so
  // queries stay enabled there.
  //
  // Event Flags is server-paginated like the other tabs (#694): the desktop
  // split-list renders one server page and drives the footer pager off
  // `eventFlagsTotal`. Tab pill count still comes from /admin/review/counts.
  const eventFlagsQuery = useReviewEventFlags(
    pagination,
    !isDesktop || activeTab === 'event-flags',
  )
  const events = useMemo<EventFlag[]>(() => {
    const all = eventFlagsQuery.data?.rows ?? initialEvents
    return pendingRemoveFlagIds.size === 0
      ? all
      : all.filter((event) => !pendingRemoveFlagIds.has(event.id))
  }, [eventFlagsQuery.data, initialEvents, pendingRemoveFlagIds])
  // Before the paged query resolves, fall back to the SSR pending count (not
  // the single-page `events.length`, which would undercount and hide the pager
  // / show a wrong badge on first paint). The query `total` is authoritative
  // once loaded.
  const eventFlagsTotal =
    eventFlagsQuery.data?.total ?? initialCounts.eventFlags

  // Missing: gated by tab activation so we don't fetch until the admin
  // looks. The mobile shell also nudges the gate via onEnterMissingTab.
  const [missingActivated, setMissingActivated] = useState(
    activeTab === 'missing',
  )
  useEffect(() => {
    if (activeTab === 'missing') setMissingActivated(true)
  }, [activeTab])
  const missingQuery = useReviewMissingEvents(missingActivated, pagination)
  const missingTotal = missingQuery.data?.total ?? 0
  const missingEvents = useMemo<MissingRowEvent[]>(() => {
    const all = missingQuery.data?.rows ?? []
    return pendingRemoveMissingIds.size === 0
      ? all
      : all.filter((event) => !pendingRemoveMissingIds.has(event.id))
  }, [missingQuery.data, pendingRemoveMissingIds])
  const missingLoading = missingActivated && !missingQuery.isFetched

  // Price coverage: keyed by both the filter toggle and the current page so
  // flipping the toggle resets to page 1 cleanly (handled in togglePriceFilter).
  // Same gate as event flags — desktop only fetches when the prices tab is
  // active.
  const priceEventsQuery = useReviewPriceEvents(
    priceFilter,
    pagination,
    !isDesktop || activeTab === 'prices',
  )
  const priceEventsTotal = priceEventsQuery.data?.total ?? 0
  const priceEvents: PriceEvent[] = priceEventsQuery.data?.rows ?? []

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    setIsDesktop(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('section') === 'submissions') {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        const el = document.getElementById('submissions-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isDesktop])

  const togglePriceFilter = useCallback(() => {
    setPriceFilter((prev) => (prev === 'missing' ? 'all' : 'missing'))
    // Reset to page 1 — page 5 of "missing" rarely lines up with page 5 of "all".
    onPaginationChange({ page: 1, pageSize: pagination.pageSize })
  }, [onPaginationChange, pagination.pageSize])

  // Mark/unmark helpers for the render-time pending-remove filters. The
  // mutation flow is: addPending → fire request → on settle, remove pending.
  // Invalidation runs in parallel so the cache refetches without the row.
  const addPendingFlag = useCallback((id: string) => {
    setPendingRemoveFlagIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPendingFlag = useCallback((id: string) => {
    setPendingRemoveFlagIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])
  const addPendingMissing = useCallback((id: string) => {
    setPendingRemoveMissingIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPendingMissing = useCallback((id: string) => {
    setPendingRemoveMissingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const patchMissingEvent = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<void> => {
      setError(null)
      addPendingMissing(id)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/events/${id}`, token, body)
        await invalidate.missing()
        void invalidate.counts()
        router.refresh()
      } catch (patchErr) {
        const message =
          patchErr instanceof ApiError
            ? patchErr.message
            : 'Failed to update event.'
        console.error('patchMissingEvent error:', patchErr)
        setError(message)
      } finally {
        clearPendingMissing(id)
      }
    },
    [addPendingMissing, clearPendingMissing, getToken, invalidate, router],
  )

  const markMissingPostponed = useCallback(
    (id: string) => patchMissingEvent(id, { status: 'postponed' }),
    [patchMissingEvent],
  )
  const markMissingCancelled = useCallback(
    (id: string) => patchMissingEvent(id, { status: 'cancelled' }),
    [patchMissingEvent],
  )
  const dismissMissing = useCallback(
    (id: string) => patchMissingEvent(id, { firstMissingAt: null }),
    [patchMissingEvent],
  )

  // (Auto-fetch-when-low effect removed — the old infinite query needed it to
  // keep the visible queue from emptying mid-scroll. With true pagination the
  // admin advances pages explicitly via <Pagination/> on each tab.)

  // Tab-pill counts. SSR seeds initial values so all three numbers paint on
  // first render; subsequent mutations call `invalidate.counts()` to refresh.
  const countsQuery = useReviewCounts(initialCounts)
  const counts = countsQuery.data ?? initialCounts

  const approveEvent = useCallback(
    async (id: string) => {
      setError(null)
      addPendingFlag(id)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
        await Promise.all([invalidate.eventFlags(), invalidate.allEvents()])
        void invalidate.counts()
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to approve event.'
        console.error('approveEvent error:', err)
        setError(message)
      } finally {
        clearPendingFlag(id)
      }
    },
    [addPendingFlag, clearPendingFlag, getToken, invalidate, router],
  )

  const rejectEvent = useCallback(
    async (id: string) => {
      setError(null)
      addPendingFlag(id)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.delete(`/v1/admin/events/${id}`, token)
        await Promise.all([invalidate.eventFlags(), invalidate.allEvents()])
        void invalidate.counts()
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to reject event.'
        console.error('rejectEvent error:', err)
        setError(message)
      } finally {
        clearPendingFlag(id)
      }
    },
    [addPendingFlag, clearPendingFlag, getToken, invalidate, router],
  )

  const approveSubmission = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/prices/submissions/${id}`, token, {
          status: 'corroborated',
        })
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id))
        void invalidate.priceEvents()
        void invalidate.counts()
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to approve submission.'
        console.error('approveSubmission error:', err)
        setError(message)
      }
    },
    [getToken, invalidate, router],
  )

  const addPrice = useCallback(
    async (
      eventId: string,
      priceMin: string,
      priceMax: string | null,
      vendor: string,
      howFound: string,
    ) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.post('/v1/admin/prices/submissions', token, {
          eventId,
          priceMin,
          ...(priceMax !== null && { priceMax }),
          vendor,
          howFound,
        })
        // Optimistic patch on the active price-events cache slot: the row
        // that just got a price gets the new min/max + 'community' source so
        // the admin sees the change without waiting on a refetch. The
        // invalidate below sweeps every (page, pageSize) slot so the truth
        // wins eventually.
        queryClient.setQueryData<{
          rows: PriceEvent[]
          total: number
        }>(
          reviewQueryKeys.priceEvents(
            priceFilter,
            pagination.page,
            pagination.pageSize,
          ),
          (prev) => {
            if (!prev) return prev
            return {
              ...prev,
              rows: prev.rows.map((ev) =>
                ev.eventId === eventId
                  ? { ...ev, priceMin, priceMax, priceSource: 'community' }
                  : ev,
              ),
            }
          },
        )
        void invalidate.priceEvents()
        void invalidate.counts()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to save price.'
        console.error('addPrice error:', err)
        setError(message)
      }
    },
    [
      getToken,
      invalidate,
      pagination.page,
      pagination.pageSize,
      priceFilter,
      queryClient,
    ],
  )

  const denySubmission = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/prices/submissions/${id}`, token, {
          status: 'disputed',
        })
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id))
        void invalidate.priceEvents()
        void invalidate.counts()
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to deny submission.'
        console.error('denySubmission error:', err)
        setError(message)
      }
    },
    [getToken, invalidate, router],
  )

  // Pending count formula is extracted so a unit test can pin it — see
  // lib/admin/review-pending.ts. Server-driven counts so the number
  // stays accurate beyond the first page of any individual tab.
  const pendingCount = computePendingCount(counts)

  const sectionHead = (
    <SectionHead
      eyebrow={ADMIN_COPY.review.reviewPageClient.eyebrow}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {ADMIN_COPY.review.reviewPageClient.title}
          {pendingCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 20,
                border: '1.5px solid var(--warning)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--warning)',
                letterSpacing: 0,
                lineHeight: 1.4,
              }}
            >
              {pendingCount} pending
            </span>
          )}
        </span>
      }
      subtitle={ADMIN_COPY.review.reviewPageClient.subtitle}
    />
  )

  const allEventsApi = {
    verify: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.patch(`/v1/admin/events/${event.id}/verify`, token, {})
      void invalidate.eventFlags()
      void invalidate.counts()
    },
    unverify: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
        verified: false,
      })
      void invalidate.eventFlags()
      void invalidate.counts()
    },
    setStatus: async (
      event: AllEvent,
      status: 'upcoming' | 'cancelled' | 'postponed',
    ) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, { status })
    },
    markSoldOut: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post(`/v1/admin/events/${event.id}/sold-out`, token, {})
    },
    markAvailable: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post(`/v1/admin/events/${event.id}/available`, token, {})
    },
    markNonConcert: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
        hiddenFromConsumer: true,
      })
    },
    deleteEvent: async (event: AllEvent) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.delete(`/v1/admin/events/${event.id}`, token)
      void invalidate.eventFlags()
      void invalidate.counts()
    },
    bulkUnverify: async (ids: string[]) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post('/v1/admin/events/bulk/unverify', token, { ids })
      void invalidate.eventFlags()
      void invalidate.counts()
    },
    bulkMarkNonConcert: async (ids: string[]) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post('/v1/admin/events/bulk/mark-non-concert', token, {
        ids,
      })
    },
    bulkMarkAsConcert: async (ids: string[]) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post('/v1/admin/events/bulk/mark-as-concert', token, {
        ids,
      })
    },
    bulkDelete: async (ids: string[]) => {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post('/v1/admin/events/bulk/delete', token, {
        ids,
        confirmation: 'DELETE',
      })
      void invalidate.eventFlags()
      void invalidate.counts()
    },
  }

  const onAllEventsEdit = (event: AllEvent) =>
    router.push(editEventHref(event.id))
  const onAllEventsViewDetail = (event: AllEvent) => {
    window.open(`/events/${event.id}`, '_blank', 'noopener,noreferrer')
  }

  const errorBanner = error && (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
        background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
        fontSize: 13,
        color: 'var(--danger)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {error}
    </div>
  )

  if (!isDesktop) {
    const mobileSectionHead = (
      <div style={{ padding: '4px 0' }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          {ADMIN_COPY.review.reviewPageClient.mobileTitle}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          {ADMIN_COPY.review.reviewPageClient.mobileSubtitle(
            counts.eventFlags,
            counts.prices,
            counts.missing,
          )}
        </div>
      </div>
    )

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 16,
        }}
      >
        <div style={{ flexShrink: 0 }}>{mobileSectionHead}</div>
        {errorBanner && <div style={{ flexShrink: 0 }}>{errorBanner}</div>}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AdminReviewMobile
            events={events}
            submissions={submissions}
            priceEvents={priceEvents}
            onApprove={approveEvent}
            onReject={rejectEvent}
            onApproveSubmission={approveSubmission}
            onDenySubmission={denySubmission}
            onAddPrice={addPrice}
            initialTab={
              activeTab === 'missing'
                ? 'missing'
                : activeTab === 'prices'
                  ? 'prices'
                  : activeTab === 'all-events'
                    ? 'all-events'
                    : activeTab === 'contests'
                      ? 'contests'
                      : 'flags'
            }
            contestCount={counts.priceContests}
            pricesMissingOnly={priceFilter === 'missing'}
            priceEventsPage={pagination.page}
            priceEventsPageSize={pagination.pageSize}
            priceEventsTotal={priceEventsTotal}
            onTogglePriceFilter={togglePriceFilter}
            onPriceEventsPageChange={(next) =>
              onPaginationChange({ page: next, pageSize: pagination.pageSize })
            }
            onPriceEventsPageSizeChange={(next) =>
              onPaginationChange({ page: 1, pageSize: next })
            }
            missingEvents={missingEvents}
            missingLoading={missingLoading}
            missingPage={pagination.page}
            missingPageSize={pagination.pageSize}
            missingTotal={missingTotal}
            onMissingPageChange={(next) =>
              onPaginationChange({ page: next, pageSize: pagination.pageSize })
            }
            onMissingPageSizeChange={(next) =>
              onPaginationChange({ page: 1, pageSize: next })
            }
            onMarkMissingPostponed={markMissingPostponed}
            onMarkMissingCancelled={markMissingCancelled}
            onDismissMissing={dismissMissing}
            onEnterMissingTab={() => setMissingActivated(true)}
            onAllEventsRowClick={(id) => router.push(editEventHref(id))}
            allEventsFilters={parseFiltersFromParams(
              new URLSearchParams(searchParams?.toString() ?? ''),
            )}
            onAllEventsFiltersChange={(next) => {
              const base = new URLSearchParams(searchParams?.toString() ?? '')
              const merged = serializeFiltersToParams(next, base)
              merged.set('tab', 'all-events')
              // Reset pagination in the same push so changing filters
              // doesn't briefly retain a stale ?page=N. See PR #702
              // comment #28.
              pushParams(serializePaginationToParams(EMPTY_PAGINATION, merged))
            }}
            allEventsPagination={pagination}
            onAllEventsPaginationChange={onPaginationChange}
            allEventsApi={allEventsApi}
            onAllEventsEdit={onAllEventsEdit}
            onAllEventsViewDetail={onAllEventsViewDetail}
          />
        </div>
      </div>
    )
  }

  const tabs: ReadonlyArray<ReviewTabDescriptor> = [
    {
      key: 'event-flags',
      label: ADMIN_COPY.review.tabs.eventFlags,
      count: counts.eventFlags,
      kind: 'warning',
    },
    {
      key: 'prices',
      label: ADMIN_COPY.review.tabs.prices,
      count: counts.prices,
      kind: 'signal',
    },
    {
      key: 'missing',
      label: ADMIN_COPY.review.tabs.missing,
      count: counts.missing,
      kind: 'danger',
    },
    { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
    {
      key: 'contests',
      label: ADMIN_COPY.review.tabs.contests,
      count: counts.priceContests,
      kind: 'warning',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sectionHead}
      {errorBanner}

      <ReviewTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label={ADMIN_COPY.review.tabs.ariaLabel}
      />

      {activeTab === 'event-flags' && (
        <EventFlagsTabContent
          events={events}
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={eventFlagsTotal}
          onPageChange={(next) =>
            onPaginationChange({ page: next, pageSize: pagination.pageSize })
          }
          onPageSizeChange={(next) =>
            onPaginationChange({ page: 1, pageSize: next })
          }
          onApprove={approveEvent}
          onReject={rejectEvent}
          onEdit={(id) => router.push(editEventHref(id))}
        />
      )}

      {activeTab === 'prices' && (
        <PricesTabContent
          submissions={submissions}
          onApproveSubmission={approveSubmission}
          onDenySubmission={denySubmission}
          priceEvents={priceEvents}
          priceEventsLoading={priceEventsQuery.isPending}
          pricesMissingOnly={priceFilter === 'missing'}
          onTogglePriceFilter={togglePriceFilter}
          priceEventsPage={pagination.page}
          priceEventsPageSize={pagination.pageSize}
          priceEventsTotal={priceEventsTotal}
          onPriceEventsPageChange={(next) =>
            onPaginationChange({ page: next, pageSize: pagination.pageSize })
          }
          onPriceEventsPageSizeChange={(next) =>
            onPaginationChange({ page: 1, pageSize: next })
          }
          onAddPrice={addPrice}
        />
      )}

      {activeTab === 'missing' && (
        <MissingTabContent
          events={missingEvents}
          isDesktop
          nowIso={new Date().toISOString()}
          loading={missingLoading}
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={missingTotal}
          onPageChange={(next) =>
            onPaginationChange({ page: next, pageSize: pagination.pageSize })
          }
          onPageSizeChange={(next) =>
            onPaginationChange({ page: 1, pageSize: next })
          }
          onMarkPostponed={markMissingPostponed}
          onMarkCancelled={markMissingCancelled}
          onDismiss={dismissMissing}
        />
      )}

      {activeTab === 'all-events' && (
        <AllEventsTabContent
          isDesktop
          onRowClick={(id) => router.push(editEventHref(id))}
          onEdit={onAllEventsEdit}
          onViewDetail={onAllEventsViewDetail}
          api={allEventsApi}
          filters={parseFiltersFromParams(
            new URLSearchParams(searchParams?.toString() ?? ''),
          )}
          onFiltersChange={(next) => {
            const base = new URLSearchParams(searchParams?.toString() ?? '')
            const merged = serializeFiltersToParams(next, base)
            merged.set('tab', 'all-events')
            // Filter changes reset pagination in the same push — see
            // PR #702 comment #28.
            pushParams(serializePaginationToParams(EMPTY_PAGINATION, merged))
          }}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}

      {activeTab === 'contests' && <ContestsTabContent />}
    </div>
  )
}
