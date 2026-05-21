'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api'
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
  source: string | null
  note: string | null
  status: string
  createdAt: string
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
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    setIsDesktop(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
    async (eventId: string, priceMin: string, priceMax: string | null) => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        await apiClient.patch(`/v1/admin/events/${eventId}`, token, {
          ticketPriceMin: priceMin,
          ticketPriceMax: priceMax,
        })
        router.refresh()
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to save price.'
        console.error('addPrice error:', err)
        setError(message)
      }
    },
    [getToken, router],
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {errorBanner}
        <AdminReviewMobile
          events={events}
          submissions={submissions}
          priceEvents={priceEvents}
          onApprove={approveEvent}
          onReject={rejectEvent}
          onApproveSubmission={approveSubmission}
          onDenySubmission={denySubmission}
          onAddPrice={addPrice}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {errorBanner}

      <EventFlagsSection
        events={events}
        onApprove={approveEvent}
        onReject={rejectEvent}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}
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
