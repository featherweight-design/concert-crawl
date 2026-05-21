'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api'
import { EventFlagsSection } from './EventFlagsSection'
import { PendingSubmissionsPanel } from './PendingSubmissionsPanel'
import { PriceCoverageTable } from './PriceCoverageTable'

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
  priceEvents: PriceEvent[]
}

export const ReviewPageClient = ({
  initialEvents,
  initialSubmissions,
  priceEvents,
}: ReviewPageClientProps) => {
  const { getToken } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<EventFlag[]>(initialEvents)
  const [submissions, setSubmissions] =
    useState<PriceSubmission[]>(initialSubmissions)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border:
              '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
            background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
            fontSize: 13,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </div>
      )}

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
        <PriceCoverageTable events={priceEvents} />
      </div>
    </div>
  )
}
