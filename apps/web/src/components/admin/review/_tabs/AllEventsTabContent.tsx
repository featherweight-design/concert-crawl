'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { Pagination } from '@/components/admin/primitives'
import {
  REVIEW_ALL_EVENTS_PAGE_SIZE,
  useInvalidateReviewQueries,
  useReviewAllEvents,
} from '@/lib/queries/use-admin-review'
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
  type PaginationState,
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
  pagination?: PaginationState
  onPaginationChange?: (next: PaginationState) => void
}

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

const EmptyState = ({ flagged }: { flagged: boolean }) => (
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
      {flagged
        ? ADMIN_COPY.review.allEvents.filters.flaggedChipEmpty
        : ADMIN_COPY.review.allEvents.empty.heading}
    </div>
    {!flagged && (
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
    )}
  </div>
)

const noopFiltersChange = (_next: AllEventsFilters): void => undefined
const noopPaginationChange = (_next: PaginationState): void => undefined
const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: REVIEW_ALL_EVENTS_PAGE_SIZE,
}

export const AllEventsTabContent = ({
  isDesktop,
  onRowClick,
  onEdit,
  onViewDetail,
  api,
  filters = EMPTY_FILTERS,
  onFiltersChange = noopFiltersChange,
  pagination = DEFAULT_PAGINATION,
  onPaginationChange = noopPaginationChange,
}: AllEventsTabContentProps) => {
  // Local error state for mutation failures (network errors from the `api`
  // prop). Fetch errors come straight out of `useQuery` below.
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: 'delete' | 'non-concert'
    event: AllEvent
  } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<BulkKind | null>(null)
  const [bulkPending, setBulkPending] = useState(false)

  const query = useReviewAllEvents(filters, pagination)
  const invalidate = useInvalidateReviewQueries()

  const events: AllEvent[] = query.data?.rows ?? []
  const total = query.data?.total ?? 0

  // Filter changes (vs page changes) clear the selection — selections are
  // keyed by id, so they survive paging but can't span a re-filtered set.
  // The pagination component, by contrast, only changes `pagination.page` /
  // `pagination.pageSize` and leaves the filter fingerprint untouched.
  const filterQuery = filtersToFetchQuery(filters)
  useEffect(() => {
    setSelectedIds(new Set())
    // Stale mutation errors from the previous filter set don't apply to the
    // new dataset — clear them so a successful filter change doesn't leave
    // an unrelated banner up.
    setActionError(null)
  }, [filterQuery])

  // Filter changes forward straight to `onFiltersChange`. Resetting the
  // pager to page 1 is the parent's responsibility — ReviewPageClient
  // strips pagination from the URL in its filter-change handler so both
  // updates land in a single router.push. If a future caller forgets
  // that, Pagination's clamp-sync effect catches it on the next render.
  const onFilterUpdate = useCallback(
    (next: AllEventsFilters) => {
      onFiltersChange(next)
    },
    [onFiltersChange],
  )

  const refresh = useCallback(() => {
    setSelectedIds(new Set())
    void invalidate.allEvents()
  }, [invalidate])

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
      setActionError(null)
      try {
        await fn()
        refresh()
      } catch (apiErr) {
        const message =
          apiErr instanceof ApiError
            ? apiErr.message
            : 'Failed to apply the change.'
        console.error('AllEventsTabContent action error:', apiErr)
        setActionError(message)
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
      setActionError(message)
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
      setActionError(message)
      // Close the modal on failure — the page-level banner sits behind the
      // scrim, so leaving the modal up hides the failure from the admin.
      setBulkConfirm(null)
    } finally {
      setBulkPending(false)
    }
  }, [api, bulkConfirm, refresh, selectedIds])

  const filterBar = (
    <EventsFilterBar filters={filters} onChange={onFilterUpdate} />
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

  // Show the skeleton on the very first load only. Subsequent filter changes
  // re-use TanStack's cached pages and only show fresh data when it arrives,
  // so the user never sees an empty flash mid-fetch.
  if (query.isPending)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filterBar}
        <Skeleton />
      </div>
    )

  const fetchErrorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : query.error
        ? 'Failed to load events.'
        : null
  const errorMessage = actionError ?? fetchErrorMessage

  const errorBanner = errorMessage && (
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
      {errorMessage}
    </div>
  )

  // Only the absence-of-error empty case is a true "no events" state — a
  // failed fetch leaves events=[] too, but the admin needs to see the error
  // banner, not an empty state that hides the failure.
  //
  // Gate on `total === 0` (not events.length === 0) so a deep-link to
  // ?page=99 (rows:[], total:>0) still mounts the pager — its clamp-sync
  // effect resets page to the last valid one. The brief intermediate frame
  // with no rows is acceptable; the alternative is a stuck empty page.
  if (!errorMessage && total === 0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filterBar}
        <EmptyState flagged={filters.flagged} />
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
      {(total > pagination.pageSize || pagination.page > 1) && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={total}
          onPageChange={(next) =>
            onPaginationChange({ ...pagination, page: next })
          }
          onPageSizeChange={(next) =>
            onPaginationChange({ page: 1, pageSize: next })
          }
          loading={query.isFetching}
          itemLabel="events"
        />
      )}
      {bulkDock}
      {confirmModal}
      {bulkModal}
    </div>
  )
}
