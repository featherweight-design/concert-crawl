'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import {
  Panel,
  AdminButton,
  StatusBadge,
  Pagination,
  PAGINATION_DEFAULT_PAGE_SIZE,
  derivePagination,
} from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EventFlagRow } from './EventFlagRow'
import { EventFlagInspector } from './EventFlagInspector'
import { BulkActionDock } from './BulkActionDock'
import { BulkApproveModal } from './BulkApproveModal'

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

interface EventFlagsSectionProps {
  events: EventFlag[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onEdit?: (id: string) => void
}

export const EventFlagsSection = ({
  events,
  onApprove,
  onReject,
  onEdit,
}: EventFlagsSectionProps) => {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hideNonConcert, setHideNonConcert] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION_DEFAULT_PAGE_SIZE)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [pendingApprovalIds, setPendingApprovalIds] = useState<Set<string>>(
    new Set(),
  )
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [])

  const filterVisible = (list: EventFlag[]): EventFlag[] =>
    (hideNonConcert
      ? list.filter(
          (ev) =>
            !ev.genre?.some((tag) => tag.toLowerCase().includes('non-concert')),
        )
      : list
    ).filter((ev) => !pendingApprovalIds.has(ev.id))

  const visibleEvents = filterVisible(events)
  // `page` is the controlled value; derivePagination clamps it so a stale
  // page (e.g. after approvals shrink the list) slices the last valid page.
  // The <Pagination> footer syncs the controlled value back on the next tick.
  const pager = derivePagination({
    page,
    pageSize,
    total: visibleEvents.length,
  })
  const pagedEvents = visibleEvents.slice(
    pager.offset,
    pager.offset + pager.limit,
  )

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const ev of pagedEvents) next.add(ev.id)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const ev of pagedEvents) next.delete(ev.id)
        return next
      })
    }
  }

  const handleApprove = (id: string) => {
    onApprove(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (activeId === id) {
      const remaining = pagedEvents.filter((ev) => ev.id !== id)
      setActiveId(remaining[0]?.id ?? null)
    }
  }

  const handleReject = (id: string) => {
    onReject(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (activeId === id) {
      const remaining = pagedEvents.filter((ev) => ev.id !== id)
      setActiveId(remaining[0]?.id ?? null)
    }
  }

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds)
    const approving = new Set(ids)

    setShowBulkModal(false)
    setSelectedIds(new Set())
    setActiveId((prev) =>
      prev && approving.has(prev)
        ? (pagedEvents.find((ev) => !approving.has(ev.id))?.id ?? null)
        : prev,
    )
    setPendingApprovalIds(approving)

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)

    pendingTimerRef.current = setTimeout(() => {
      void Promise.allSettled(ids.map((id) => onApprove(id)))
      setPendingApprovalIds(new Set())
      pendingTimerRef.current = null
    }, 6000)

    toast(ADMIN_COPY.review.bulkToast.approved(ids.length), {
      duration: 6000,
      action: {
        label: ADMIN_COPY.review.bulkToast.undo,
        onClick: () => {
          if (pendingTimerRef.current) {
            clearTimeout(pendingTimerRef.current)
            pendingTimerRef.current = null
          }
          setPendingApprovalIds(new Set())
        },
      },
    })
  }

  const handleBulkReject = async () => {
    await Promise.allSettled(Array.from(selectedIds).map((id) => onReject(id)))
    setSelectedIds(new Set())
    setActiveId(null)
  }

  // Page nav clamps the inspector to the new page's first row so the active
  // event is always one the admin can see in the list. selectedIds are left
  // untouched — checkbox selections are id-keyed and survive paging.
  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    const nextPager = derivePagination({
      page: nextPage,
      pageSize,
      total: visibleEvents.length,
    })
    const nextFirst = visibleEvents.slice(
      nextPager.offset,
      nextPager.offset + nextPager.limit,
    )[0]
    setActiveId(nextFirst?.id ?? null)
  }

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize)
    setPage(1)
    setActiveId(visibleEvents.slice(0, nextSize)[0]?.id ?? null)
  }

  // A filter change re-slices the dataset: reset to page 1, drop the id-keyed
  // checkbox selection (it can't span a re-filtered set), and land the
  // inspector on the new page 1's first row.
  const handleToggleHideNonConcert = () => {
    const next = !hideNonConcert
    setHideNonConcert(next)
    setPage(1)
    setSelectedIds(new Set())
    const nextVisible = (
      next
        ? events.filter(
            (ev) =>
              !ev.genre?.some((tag) =>
                tag.toLowerCase().includes('non-concert'),
              ),
          )
        : events
    ).filter((ev) => !pendingApprovalIds.has(ev.id))
    setActiveId(nextVisible[0]?.id ?? null)
  }

  if (events.length === 0) {
    const emptyTitle = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {ADMIN_COPY.review.eventFlags.panelTitle}
        <StatusBadge kind="success">
          {ADMIN_COPY.review.eventFlags.queueClearBadge}
        </StatusBadge>
      </span>
    )

    return (
      <Panel title={emptyTitle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 0',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background:
                'color-mix(in oklab, var(--success) 14%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--fg)',
              }}
            >
              {ADMIN_COPY.review.eventFlags.queueClearHeading}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg-muted)',
                marginTop: 2,
              }}
            >
              {ADMIN_COPY.review.eventFlags.queueClearBody}
            </div>
          </div>
        </div>
      </Panel>
    )
  }

  // Select-all is scoped to the current page — the checkbox reflects whether
  // every visible row is selected, not the whole (possibly multi-page) set.
  const allSelected =
    pagedEvents.length > 0 && pagedEvents.every((ev) => selectedIds.has(ev.id))

  const panelTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {ADMIN_COPY.review.eventFlags.panelTitle}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 9px',
          borderRadius: 20,
          border: '1.5px solid var(--warning)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--warning)',
          letterSpacing: 0,
          lineHeight: 1.4,
        }}
      >
        {events.length} pending
      </span>
    </span>
  )

  const panelAction = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--fg-muted)',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(evt) => handleSelectAll(evt.target.checked)}
          style={{ accentColor: 'var(--signal)', width: 15, height: 15 }}
        />
        {ADMIN_COPY.review.eventFlags.selectAll}
      </label>
      <AdminButton
        variant={hideNonConcert ? 'outline' : 'ghost'}
        size="sm"
        icon={Filter}
        onClick={handleToggleHideNonConcert}
      >
        {ADMIN_COPY.review.eventFlags.hideNonConcert}
      </AdminButton>
    </div>
  )

  return (
    <Panel title={panelTitle} action={panelAction} padding={0}>
      {/* Body: split grid with fixed height so list scrolls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          height: 560,
          position: 'relative',
        }}
      >
        {/* Left: scrollable list */}
        <div style={{ overflowY: 'auto' }}>
          {pagedEvents.map((ev) => (
            <EventFlagRow
              key={ev.id}
              event={ev}
              isActive={activeId === ev.id}
              isSelected={selectedIds.has(ev.id)}
              onSelect={handleSelect}
              onActivate={setActiveId}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>

        {/* Right: inspector */}
        <EventFlagInspector
          event={pagedEvents.find((ev) => ev.id === activeId) ?? null}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setActiveId(null)}
          onEdit={onEdit}
        />
      </div>

      {(visibleEvents.length > pageSize || page > 1) && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={visibleEvents.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="flags"
        />
      )}

      {/* Bulk action dock */}
      {selectedIds.size > 0 && (
        <BulkActionDock
          count={selectedIds.size}
          onApproveAll={() => {
            setShowBulkModal(true)
          }}
          onRejectAll={() => void handleBulkReject()}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {showBulkModal && (
        <BulkApproveModal
          events={visibleEvents.filter((ev) => selectedIds.has(ev.id))}
          onConfirm={() => void handleBulkApprove()}
          onCancel={() => setShowBulkModal(false)}
        />
      )}
    </Panel>
  )
}
