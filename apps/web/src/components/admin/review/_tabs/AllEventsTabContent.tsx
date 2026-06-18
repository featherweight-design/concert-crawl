'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ApiError, apiClient } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { EventsTable } from '../all/EventsTable'
import { EventsMobileList } from '../all/EventsMobileList'
import { EventsFilterBar } from '../all/EventsFilterBar'
import { EventConfirmModal } from '../all/EventConfirmModal'
import { BulkDock } from '../all/BulkDock'
import { BulkDeleteConfirm } from '../all/BulkDeleteConfirm'
import { BulkConfirmModal } from '../all/BulkConfirmModal'
import { type EventRowActions } from '../all/EventRowMenu'
import {
  EMPTY_FILTERS,
  filtersToFetchQuery,
  type AllEventsFilters,
} from '../all/filters'
import { type AllEvent } from '../all/types'

export interface AllEventsApi {
  verify: (event: AllEvent) => Promise<void>
  unverify: (event: AllEvent) => Promise<void>
  setStatus: (
    event: AllEvent,
    status: 'upcoming' | 'cancelled' | 'postponed',
  ) => Promise<void>
  markSoldOut: (event: AllEvent) => Promise<void>
  markAvailable: (event: AllEvent) => Promise<void>
  markNonConcert: (event: AllEvent) => Promise<void>
  deleteEvent: (event: AllEvent) => Promise<void>
  bulkUnverify: (ids: string[]) => Promise<void>
  bulkMarkNonConcert: (ids: string[]) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
}

type BulkKind = 'unverify' | 'non-concert' | 'delete'

const BULK_COPY = ADMIN_COPY.review.allEvents

export interface AllEventsTabContentProps {
  isDesktop: boolean
  onRowClick: (id: string) => void
  onEdit?: (event: AllEvent) => void
  onViewDetail?: (event: AllEvent) => void
  api?: AllEventsApi
  filters?: AllEventsFilters
  onFiltersChange?: (next: AllEventsFilters) => void
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

const noopFiltersChange = (_next: AllEventsFilters): void => undefined

export const AllEventsTabContent = ({
  isDesktop,
  onRowClick,
  onEdit,
  onViewDetail,
  api,
  filters = EMPTY_FILTERS,
  onFiltersChange = noopFiltersChange,
}: AllEventsTabContentProps) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<AllEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: 'delete' | 'non-concert'
    event: AllEvent
  } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<BulkKind | null>(null)
  const [bulkPending, setBulkPending] = useState(false)

  // Serialise filters into a string key — using this as the effect dep means
  // a refetch fires when the filter content changes, not just when the prop
  // identity changes (so parents can pass a fresh object every render).
  const filterQuery = filtersToFetchQuery(filters)

  // A generation counter bumps every time `filterQuery` changes; in-flight
  // fetches capture their generation up front and skip state updates when
  // the current generation has moved on. This prevents stale fetches from
  // overwriting fresh state when the admin types quickly across filters.
  const generationRef = useRef(0)

  const runFetch = useCallback(
    async (offset: number, append: boolean): Promise<void> => {
      const generation = generationRef.current
      const isStale = () => generation !== generationRef.current
      setError(null)
      try {
        const token = await getToken()
        if (!token) {
          if (!isStale()) setHasMore(false)
          return
        }
        const suffix = filterQuery ? `&${filterQuery}` : ''
        const rows = await apiClient.get<AllEvent[]>(
          `/v1/admin/events?limit=${PAGE_SIZE}&offset=${offset}${suffix}`,
          token,
        )
        if (isStale()) return
        setEvents((prev) => (append ? [...prev, ...rows] : rows))
        setHasMore(rows.length === PAGE_SIZE)
      } catch (err) {
        if (isStale()) return
        const message =
          err instanceof ApiError ? err.message : 'Failed to load events.'
        console.error('AllEventsTabContent fetch error:', err)
        setError(message)
        // Leave hasMore as-is so a transient failure on Load more doesn't
        // permanently hide the button — the admin can retry.
      } finally {
        if (!isStale()) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [getToken, filterQuery],
  )

  useEffect(() => {
    // Bump first so any in-flight call from the previous filter immediately
    // sees itself as stale.
    generationRef.current += 1
    setLoading(true)
    setEvents([])
    setHasMore(false)
    // Filter changes reset the rendered list, so the selection set —
    // anchored to ids in that list — is no longer meaningful.
    setSelectedIds(new Set())
    void runFetch(0, false)
  }, [runFetch])

  const onLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    void runFetch(events.length, true)
  }, [events.length, runFetch, hasMore, loadingMore])

  // Re-pull page 0 after a successful mutation so the table mirrors server
  // state. Cheap: page size is 50, filter set is local.
  const refresh = useCallback(() => {
    generationRef.current += 1
    setLoading(true)
    setEvents([])
    setHasMore(false)
    setSelectedIds(new Set())
    void runFetch(0, false)
  }, [runFetch])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (nextAll: boolean) => {
      if (nextAll) setSelectedIds(new Set(events.map((event) => event.id)))
      else setSelectedIds(new Set())
    },
    [events],
  )

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const runApi = useCallback(
    async (fn: () => Promise<void>): Promise<void> => {
      try {
        await fn()
        refresh()
      } catch (apiErr) {
        const message =
          apiErr instanceof ApiError
            ? apiErr.message
            : 'Failed to apply the change.'
        console.error('AllEventsTabContent action error:', apiErr)
        setError(message)
      }
    },
    [refresh],
  )

  const rowActions: EventRowActions = {
    onViewDetail: (event) => onViewDetail?.(event),
    onEdit: (event) => onEdit?.(event),
    onVerify: (event) => {
      if (api) void runApi(() => api.verify(event))
    },
    onSendBackToReview: (event) => {
      if (api) void runApi(() => api.unverify(event))
    },
    onMarkPostponed: (event) => {
      if (api) void runApi(() => api.setStatus(event, 'postponed'))
    },
    onMarkCancelled: (event) => {
      if (api) void runApi(() => api.setStatus(event, 'cancelled'))
    },
    onMarkUpcoming: (event) => {
      if (api) void runApi(() => api.setStatus(event, 'upcoming'))
    },
    onMarkSoldOut: (event) => {
      if (api) void runApi(() => api.markSoldOut(event))
    },
    onMarkAvailable: (event) => {
      if (api) void runApi(() => api.markAvailable(event))
    },
    onRequestMarkNonConcert: (event) =>
      setPendingConfirm({ kind: 'non-concert', event }),
    onRequestDelete: (event) => setPendingConfirm({ kind: 'delete', event }),
  }

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirm || !api) {
      setPendingConfirm(null)
      return
    }
    setConfirmPending(true)
    try {
      if (pendingConfirm.kind === 'delete') {
        await api.deleteEvent(pendingConfirm.event)
      } else {
        await api.markNonConcert(pendingConfirm.event)
      }
      setPendingConfirm(null)
      refresh()
    } catch (confirmErr) {
      const message =
        confirmErr instanceof ApiError
          ? confirmErr.message
          : 'Failed to apply the change.'
      console.error('AllEventsTabContent confirm error:', confirmErr)
      setError(message)
    } finally {
      setConfirmPending(false)
    }
  }, [api, pendingConfirm, refresh])

  const handleBulkConfirm = useCallback(async () => {
    if (!bulkConfirm || !api) {
      setBulkConfirm(null)
      return
    }
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      setBulkConfirm(null)
      return
    }
    setBulkPending(true)
    try {
      if (bulkConfirm === 'delete') await api.bulkDelete(ids)
      else if (bulkConfirm === 'non-concert') await api.bulkMarkNonConcert(ids)
      else await api.bulkUnverify(ids)
      setBulkConfirm(null)
      refresh()
    } catch (bulkErr) {
      const message =
        bulkErr instanceof ApiError
          ? bulkErr.message
          : 'Failed to apply the change.'
      console.error('AllEventsTabContent bulk error:', bulkErr)
      setError(message)
    } finally {
      setBulkPending(false)
    }
  }, [api, bulkConfirm, refresh, selectedIds])

  const filterBar = (
    <EventsFilterBar filters={filters} onChange={onFiltersChange} />
  )

  const confirmModal = pendingConfirm && (
    <EventConfirmModal
      kind={pendingConfirm.kind}
      event={pendingConfirm.event}
      pending={confirmPending}
      onCancel={() => setPendingConfirm(null)}
      onConfirm={handleConfirm}
    />
  )

  const selectionCount = selectedIds.size
  const bulkEnabled = Boolean(api)

  const bulkDock = bulkEnabled && (
    <BulkDock
      count={selectionCount}
      pending={bulkPending}
      onUnverify={() => setBulkConfirm('unverify')}
      onMarkNonConcert={() => setBulkConfirm('non-concert')}
      onDelete={() => setBulkConfirm('delete')}
      onClear={clearSelection}
    />
  )

  const bulkModal =
    bulkConfirm === 'delete' ? (
      <BulkDeleteConfirm
        count={selectionCount}
        pending={bulkPending}
        onCancel={() => setBulkConfirm(null)}
        onConfirm={handleBulkConfirm}
      />
    ) : bulkConfirm === 'non-concert' ? (
      <BulkConfirmModal
        copy={BULK_COPY.bulkNonConcertConfirm}
        count={selectionCount}
        accent="var(--warning)"
        confirmVariant="outline"
        pending={bulkPending}
        onCancel={() => setBulkConfirm(null)}
        onConfirm={handleBulkConfirm}
      />
    ) : bulkConfirm === 'unverify' ? (
      <BulkConfirmModal
        copy={BULK_COPY.bulkUnverifyConfirm}
        count={selectionCount}
        accent="var(--signal)"
        confirmVariant="outline"
        pending={bulkPending}
        onCancel={() => setBulkConfirm(null)}
        onConfirm={handleBulkConfirm}
      />
    ) : null

  if (loading)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filterBar}
        <Skeleton />
      </div>
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
      }}
    >
      {error}
    </div>
  )

  // Only the absence-of-error empty case is a true "no events" state — a
  // failed fetch leaves events=[] too, but the admin needs to see the error
  // banner, not an empty state that hides the failure.
  if (!error && events.length === 0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filterBar}
        <EmptyState />
      </div>
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filterBar}
      {errorBanner}
      {events.length > 0 &&
        (isDesktop ? (
          <EventsTable
            events={events}
            onRowClick={onRowClick}
            {...(api ? { rowActions } : {})}
            {...(bulkEnabled
              ? {
                  selectable: true,
                  selectedIds,
                  onToggleSelected: toggleSelected,
                  onToggleAll: toggleAll,
                }
              : {})}
          />
        ) : (
          <EventsMobileList
            events={events}
            onRowClick={onRowClick}
            {...(api ? { rowActions } : {})}
            {...(bulkEnabled
              ? {
                  selectable: true,
                  selectedIds,
                  onToggleSelected: toggleSelected,
                }
              : {})}
          />
        ))}
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
      {bulkDock}
      {confirmModal}
      {bulkModal}
    </div>
  )
}
