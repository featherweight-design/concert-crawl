'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminReviewMobile } from './AdminReviewMobile'
import { ReviewTabs, type ReviewTabDescriptor } from './ReviewTabs'
import { EventFlagsTabContent } from './_tabs/EventFlagsTabContent'
import { editEventHref } from '@/lib/admin/edit-event-link'
import { PricesTabContent } from './_tabs/PricesTabContent'
import { AllEventsTabContent } from './_tabs/AllEventsTabContent'
import { MissingTabContent } from './_tabs/MissingTabContent'
import { type MissingRowEvent } from './missing/MissingRow'

interface EventFlag {
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

interface PriceEvent {
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

interface ReviewPageClientProps {
  initialEvents: EventFlag[]
  initialSubmissions: PriceSubmission[]
}

type ReviewTabKey = 'event-flags' | 'prices' | 'missing' | 'all-events'

const VALID_TAB_KEYS: ReadonlySet<string> = new Set([
  'event-flags',
  'prices',
  'missing',
  'all-events',
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
}: ReviewPageClientProps) => {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab: ReviewTabKey = resolveTabFromSearchParams(
    new URLSearchParams(searchParams?.toString() ?? ''),
  )

  const setActiveTab = useCallback(
    (next: string) => {
      if (!isValidTabKey(next)) return
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('tab', next)
      params.delete('section') // retire legacy key once user navigates
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const [events, setEvents] = useState<EventFlag[]>(initialEvents)
  const [submissions, setSubmissions] =
    useState<PriceSubmission[]>(initialSubmissions)
  const [priceEvents, setPriceEvents] = useState<PriceEvent[]>([])
  const [priceEventsLoading, setPriceEventsLoading] = useState(true)
  const [priceFilter, setPriceFilter] = useState<'missing' | 'all'>('missing')
  const [hasMorePriceEvents, setHasMorePriceEvents] = useState(true)
  const [priceLoadingMore, setPriceLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingMoreEvents, setIsFetchingMoreEvents] = useState(false)
  const [eventsOffset, setEventsOffset] = useState(initialEvents.length)
  // If the server returned a full page, assume there are more unreviewed events.
  const [hasMoreEvents, setHasMoreEvents] = useState(
    initialEvents.length >= 100,
  )
  const [isDesktop, setIsDesktop] = useState(true)
  const [missingEvents, setMissingEvents] = useState<MissingRowEvent[]>([])
  const [missingLoaded, setMissingLoaded] = useState(false)

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

  // Lazy-load price coverage data client-side — it's below the fold and has
  // a heavy aggregating query that shouldn't block the initial page render.
  const fetchPriceEvents = useCallback(
    async (filter: 'missing' | 'all', offset: number, append: boolean) => {
      try {
        const token = await getToken()
        if (!token) return
        const missingOnly = filter === 'missing'
        const rows = await apiClient.get<PriceEvent[]>(
          `/v1/admin/prices/events?missingOnly=${String(missingOnly)}&limit=50&offset=${offset}`,
          token,
        )
        if (append) {
          setPriceEvents((prev) => [...prev, ...rows])
        } else {
          setPriceEvents(rows)
        }
        setHasMorePriceEvents(rows.length === 50)
      } catch (err) {
        console.error('Failed to load price coverage data', err)
        setHasMorePriceEvents(false)
      } finally {
        setPriceEventsLoading(false)
        setPriceLoadingMore(false)
      }
    },
    [getToken],
  )

  useEffect(() => {
    void fetchPriceEvents('missing', 0, false)
  }, [fetchPriceEvents])

  const loadMorePriceEvents = useCallback(() => {
    if (!hasMorePriceEvents || priceLoadingMore) return
    setPriceLoadingMore(true)
    void fetchPriceEvents(priceFilter, priceEvents.length, true)
  }, [
    fetchPriceEvents,
    hasMorePriceEvents,
    priceLoadingMore,
    priceEvents.length,
    priceFilter,
  ])

  const togglePriceFilter = useCallback(() => {
    const newFilter: 'missing' | 'all' =
      priceFilter === 'missing' ? 'all' : 'missing'
    setPriceFilter(newFilter)
    setPriceEventsLoading(true)
    setHasMorePriceEvents(true)
    void fetchPriceEvents(newFilter, 0, false)
  }, [fetchPriceEvents, priceFilter])

  // Lazy-fetch missing events on first activation of the Missing tab.
  const fetchMissingEvents = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      const rows = await apiClient.get<MissingRowEvent[]>(
        '/v1/admin/events?missing=true&limit=200',
        token,
      )
      setMissingEvents(rows)
    } catch (fetchErr) {
      console.error('Failed to load missing events', fetchErr)
    } finally {
      setMissingLoaded(true)
    }
  }, [getToken])

  useEffect(() => {
    if (activeTab === 'missing' && !missingLoaded) {
      void fetchMissingEvents()
    }
  }, [activeTab, missingLoaded, fetchMissingEvents])

  // PATCH dispatcher for the three Missing-tab actions; on success removes
  // the row from local state (optimistic-remove is fine — any successful
  // PATCH takes the row out of the ?missing=true result set).
  const patchMissingEvent = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<void> => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/events/${id}`, token, body)
        setMissingEvents((prev) => prev.filter((evt) => evt.id !== id))
        router.refresh()
      } catch (patchErr) {
        const message =
          patchErr instanceof ApiError
            ? patchErr.message
            : 'Failed to update event.'
        console.error('patchMissingEvent error:', patchErr)
        setError(message)
      }
    },
    [getToken, router],
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

  const fetchMoreEvents = useCallback(async () => {
    if (isFetchingMoreEvents || !hasMoreEvents) return
    setIsFetchingMoreEvents(true)
    try {
      const token = await getToken()
      if (!token) {
        setHasMoreEvents(false)
        return
      }
      const batch = await apiClient.get<EventFlag[]>(
        `/v1/admin/events?verified=false&limit=10&offset=${eventsOffset}`,
        token,
      )
      if (batch.length === 0) {
        setHasMoreEvents(false)
      } else {
        setEvents((prev) => {
          const seen = new Set(prev.map((ev) => ev.id))
          return [...prev, ...batch.filter((ev) => !seen.has(ev.id))]
        })
        setEventsOffset((prev) => prev + batch.length)
        if (batch.length < 10) setHasMoreEvents(false)
      }
    } catch (fetchErr) {
      console.error('Failed to fetch more events', fetchErr)
      setHasMoreEvents(false)
    } finally {
      setIsFetchingMoreEvents(false)
    }
  }, [isFetchingMoreEvents, hasMoreEvents, getToken, eventsOffset])

  // Auto-fetch when the queue runs low — fires before the list empties so
  // there's no gap between batches.
  useEffect(() => {
    if (events.length <= 5 && hasMoreEvents && !isFetchingMoreEvents) {
      void fetchMoreEvents()
    }
  }, [events.length, hasMoreEvents, isFetchingMoreEvents, fetchMoreEvents])

  const approveEvent = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
        setEvents((prev) => prev.filter((ev) => ev.id !== id))
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to approve event.'
        console.error('approveEvent error:', err)
        setError(message)
      }
    },
    [getToken, router],
  )

  const rejectEvent = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.delete(`/v1/admin/events/${id}`, token)
        setEvents((prev) => prev.filter((ev) => ev.id !== id))
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to reject event.'
        console.error('rejectEvent error:', err)
        setError(message)
      }
    },
    [getToken, router],
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
    [getToken, router],
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
        setPriceEvents((prev) =>
          prev.map((ev) =>
            ev.eventId === eventId
              ? { ...ev, priceMin, priceMax, priceSource: 'community' }
              : ev,
          ),
        )
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to save price.'
        console.error('addPrice error:', err)
        setError(message)
      }
    },
    [getToken],
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
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to deny submission.'
        console.error('denySubmission error:', err)
        setError(message)
      }
    },
    [getToken, router],
  )

  const pendingCount = events.length + submissions.length

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
            events.length,
            submissions.length,
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
                    : 'flags'
            }
            pricesMissingOnly={priceFilter === 'missing'}
            hasMorePriceEvents={hasMorePriceEvents}
            priceLoadingMore={priceLoadingMore}
            onTogglePriceFilter={togglePriceFilter}
            onLoadMorePriceEvents={loadMorePriceEvents}
            missingEvents={missingEvents}
            onMarkMissingPostponed={markMissingPostponed}
            onMarkMissingCancelled={markMissingCancelled}
            onDismissMissing={dismissMissing}
            onEnterMissingTab={() => {
              if (!missingLoaded) void fetchMissingEvents()
            }}
            onAllEventsRowClick={(id) => router.push(editEventHref(id))}
          />
        </div>
      </div>
    )
  }

  const tabs: ReadonlyArray<ReviewTabDescriptor> = [
    {
      key: 'event-flags',
      label: ADMIN_COPY.review.tabs.eventFlags,
      count: events.length,
      kind: 'warning',
    },
    {
      key: 'prices',
      label: ADMIN_COPY.review.tabs.prices,
      count: submissions.length,
      kind: 'signal',
    },
    {
      key: 'missing',
      label: ADMIN_COPY.review.tabs.missing,
      count: missingEvents.length,
      kind: 'danger',
    },
    { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
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
          priceEventsLoading={priceEventsLoading}
          hasMorePriceEvents={hasMorePriceEvents}
          priceLoadingMore={priceLoadingMore}
          pricesMissingOnly={priceFilter === 'missing'}
          onTogglePriceFilter={togglePriceFilter}
          onLoadMorePriceEvents={loadMorePriceEvents}
          onAddPrice={addPrice}
        />
      )}

      {activeTab === 'missing' && (
        <MissingTabContent
          events={missingEvents}
          isDesktop
          nowIso={new Date().toISOString()}
          onMarkPostponed={markMissingPostponed}
          onMarkCancelled={markMissingCancelled}
          onDismiss={dismissMissing}
        />
      )}

      {activeTab === 'all-events' && (
        <AllEventsTabContent
          isDesktop
          onRowClick={(id) => router.push(editEventHref(id))}
        />
      )}
    </div>
  )
}
