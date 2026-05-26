'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EventFlagsSection } from './EventFlagsSection'
import { PendingSubmissionsPanel } from './PendingSubmissionsPanel'
import { PriceCoverageTable } from './PriceCoverageTable'
import { AdminReviewMobile } from './AdminReviewMobile'

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

export const ReviewPageClient = ({
  initialEvents,
  initialSubmissions,
}: ReviewPageClientProps) => {
  const { getToken } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<EventFlag[]>(initialEvents)
  const [submissions, setSubmissions] =
    useState<PriceSubmission[]>(initialSubmissions)
  const [priceEvents, setPriceEvents] = useState<PriceEvent[]>([])
  const [priceEventsLoading, setPriceEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingMoreEvents, setIsFetchingMoreEvents] = useState(false)
  // If the server returned a full page, assume there are more unreviewed events.
  const [hasMoreEvents, setHasMoreEvents] = useState(
    initialEvents.length >= 100,
  )
  const [isDesktop, setIsDesktop] = useState(true)
  const [mobileInitialTab, setMobileInitialTab] = useState<'flags' | 'prices'>(
    'flags',
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    setIsDesktop(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches)
    mq.addEventListener('change', handler)

    const params = new URLSearchParams(window.location.search)
    if (params.get('section') === 'submissions') {
      setMobileInitialTab('prices')
    }

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
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const rows = await apiClient.get<PriceEvent[]>(
          '/v1/admin/prices/events',
          token,
        )
        if (!cancelled) setPriceEvents(rows)
      } catch (err) {
        if (!cancelled) console.error('Failed to load price coverage data', err)
      } finally {
        if (!cancelled) setPriceEventsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const fetchMoreEvents = useCallback(async () => {
    if (isFetchingMoreEvents || !hasMoreEvents) return
    setIsFetchingMoreEvents(true)
    try {
      const token = await getToken()
      if (!token) return
      const batch = await apiClient.get<EventFlag[]>(
        '/v1/admin/events?verified=false&limit=10',
        token,
      )
      if (batch.length === 0) {
        setHasMoreEvents(false)
      } else {
        setEvents((prev) => {
          const seen = new Set(prev.map((ev) => ev.id))
          return [...prev, ...batch.filter((ev) => !seen.has(ev.id))]
        })
        if (batch.length < 10) setHasMoreEvents(false)
      }
    } catch (fetchErr) {
      console.error('Failed to fetch more events', fetchErr)
    } finally {
      setIsFetchingMoreEvents(false)
    }
  }, [isFetchingMoreEvents, hasMoreEvents, getToken])

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
            initialTab={mobileInitialTab}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sectionHead}
      {errorBanner}

      <EventFlagsSection
        events={events}
        onApprove={approveEvent}
        onReject={rejectEvent}
      />

      <div
        id="submissions-section"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <PendingSubmissionsPanel
          submissions={submissions}
          onApprove={approveSubmission}
          onDeny={denySubmission}
        />
        <PriceCoverageTable
          events={priceEvents}
          loading={priceEventsLoading}
          onAddPrice={addPrice}
        />
      </div>
    </div>
  )
}
