'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ApiError, apiClient } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { EventsTable } from '../all/EventsTable'
import { EventsMobileList } from '../all/EventsMobileList'
import { type AllEvent } from '../all/types'

export interface AllEventsTabContentProps {
  isDesktop: boolean
  onRowClick: (id: string) => void
}

const PAGE_SIZE = 50

const Skeleton = () => (
  <div
    aria-busy="true"
    aria-label={ADMIN_COPY.review.allEvents.skeletonAriaLabel}
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    {Array.from({ length: 5 }).map((_, idx) => (
      <div
        key={idx}
        style={{
          height: 36,
          borderRadius: 8,
          background: 'var(--surface-2)',
          opacity: 0.55,
        }}
      />
    ))}
  </div>
)

const EmptyState = () => (
  <div
    style={{
      padding: '48px 32px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--fg)',
        marginBottom: 8,
      }}
    >
      {ADMIN_COPY.review.allEvents.empty.heading}
    </div>
    <div
      style={{
        fontSize: 14,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {ADMIN_COPY.review.allEvents.empty.body}
    </div>
  </div>
)

export const AllEventsTabContent = ({
  isDesktop,
  onRowClick,
}: AllEventsTabContentProps) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<AllEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (offset: number, append: boolean): Promise<void> => {
      setError(null)
      try {
        const token = await getToken()
        if (!token) {
          setHasMore(false)
          return
        }
        const rows = await apiClient.get<AllEvent[]>(
          `/v1/admin/events?limit=${PAGE_SIZE}&offset=${offset}`,
          token,
        )
        setEvents((prev) => (append ? [...prev, ...rows] : rows))
        setHasMore(rows.length === PAGE_SIZE)
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to load events.'
        console.error('AllEventsTabContent fetch error:', err)
        setError(message)
        setHasMore(false)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [getToken],
  )

  useEffect(() => {
    void fetchPage(0, false)
  }, [fetchPage])

  const onLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    void fetchPage(events.length, true)
  }, [events.length, fetchPage, hasMore, loadingMore])

  if (loading) return <Skeleton />
  if (!loading && events.length === 0) return <EmptyState />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          }}
        >
          {error}
        </div>
      )}
      {isDesktop ? (
        <EventsTable events={events} onRowClick={onRowClick} />
      ) : (
        <EventsMobileList events={events} onRowClick={onRowClick} />
      )}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AdminButton
            variant="outline"
            size="md"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? ADMIN_COPY.review.allEvents.loadingMore
              : ADMIN_COPY.review.allEvents.loadMore}
          </AdminButton>
        </div>
      )}
    </div>
  )
}
