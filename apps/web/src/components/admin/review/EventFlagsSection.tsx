'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import {
  Panel,
  AdminButton,
  StatusBadge,
  Pagination,
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
  // Pagination is parent-controlled: `events` is a single server page already
  // sliced to `pageSize`, and `total` is the full server-side flag count. The
  // parent owns page state and re-fetches on page/size change, mirroring the
  // prices/missing/all-events Review tabs.
  page: number
  pageSize: number
  total: number
  onPageChange: (next: number) => void
  onPageSizeChange: (next: number) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onEdit?: (id: string) => void
}

export const EventFlagsSection = ({
  events,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onApprove,
  onReject,
  onEdit,
}: EventFlagsSectionProps) => {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hideNonConcert, setHideNonConcert] = useState(false)
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

  // Single source of truth for "what's visible on this page": the non-concert
  // narrowing plus the optimistic bulk-approve mask. `shouldHideNonConcert`
  // defaults to the current toggle state but can be overridden so the toggle
  // handler can compute the *next* visible set without waiting for a re-render.
  const filterVisible = (
    list: EventFlag[],
    shouldHideNonConcert: boolean = hideNonConcert,
  ): EventFlag[] =>
    (shouldHideNonConcert
      ? list.filter(
          (ev) =>
            !ev.genre?.some((tag) => tag.toLowerCase().includes('non-concert')),
        )
      : list
    ).filter((ev) => !pendingApprovalIds.has(ev.id))

  // `events` is already the server page for the current `page`/`pageSize`, so
  // the only client-side narrowing is the hide-non-concert filter and the
  // optimistic bulk-approve mask. No slicing — the footer pager drives fetches.
  const visibleEvents = filterVisible(events)

  // The active event can drift off the visible list without being explicitly
  // closed — e.g. a bulk approve masks the still-selected inspector row, or an
  // approval on another page shifts rows. When `activeId` is set but no longer
  // visible, fall back to the first visible row. A null `activeId` is an
  // explicit "inspector closed" and must be preserved so the empty state can
  // render while rows remain.
  const effectiveActiveId =
    activeId === null
      ? null
      : visibleEvents.some((ev) => ev.id === activeId)
        ? activeId
        : (visibleEvents[0]?.id ?? null)

  // Reconcile the stored selection with what the inspector actually shows so
  // the id-keyed handlers (approve/reject guards) stay in sync after a drift.
  useEffect(() => {
    if (activeId !== effectiveActiveId) setActiveId(effectiveActiveId)
  }, [activeId, effectiveActiveId])

  // Track the last (page, pageSize) we seeded the inspector for. Initialised to
  // the mount page so the initial `useState(events[0])` already counts as
  // seeded and we don't re-seed on first paint.
  const seededPageKeyRef = useRef(`${page}:${pageSize}`)

  // When the parent swaps in a new server page (page or pageSize changed), land
  // the inspector on that page's first visible row — but only once rows for the
  // new page have actually arrived. `useReviewEventFlags` keeps the previous
  // page visible while refetching (`placeholderData: keepPrevious`), so right
  // after a page change `visibleEvents` can briefly be the prior page or, if the
  // active row was just approved and is pending-removed, empty. Seeding against
  // that interim empty set would set `activeId` to null, which `effectiveActiveId`
  // then preserves as an explicit close — stranding the inspector empty even
  // once the real rows land. Guarding on the first real row avoids that, and
  // keying on the page signal keeps a same-page approval refetch from yanking
  // the inspector.
  useEffect(() => {
    const pageKey = `${page}:${pageSize}`
    if (seededPageKeyRef.current === pageKey) return
    const firstVisibleId = visibleEvents[0]?.id
    if (firstVisibleId === undefined) return
    seededPageKeyRef.current = pageKey
    setActiveId(firstVisibleId)
  }, [page, pageSize, visibleEvents])

  // After removing the active row (approve/reject/bulk-approve), anchor the
  // inspector to the row that slides into the first removed slot (or the new
  // last row) within the current visible page — so the inspector never empties
  // while visible flags remain on this page.
  const resolveActiveAfterRemoval = (
    removedIds: Set<string>,
  ): string | null => {
    const firstRemovedIndex = visibleEvents.findIndex((ev) =>
      removedIds.has(ev.id),
    )
    const remaining = visibleEvents.filter((ev) => !removedIds.has(ev.id))
    if (remaining.length === 0) return null
    const anchor = firstRemovedIndex < 0 ? 0 : firstRemovedIndex
    const nextIndex = Math.min(anchor, remaining.length - 1)
    return remaining[nextIndex]?.id ?? null
  }

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
        for (const ev of visibleEvents) next.add(ev.id)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const ev of visibleEvents) next.delete(ev.id)
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
      setActiveId(resolveActiveAfterRemoval(new Set([id])))
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
      setActiveId(resolveActiveAfterRemoval(new Set([id])))
    }
  }

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds)
    const approving = new Set(ids)

    setShowBulkModal(false)
    setSelectedIds(new Set())
    if (activeId && approving.has(activeId)) {
      setActiveId(resolveActiveAfterRemoval(approving))
    }
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

  // Page nav is parent-controlled: delegate so the parent re-fetches the new
  // server page. Once fresh `events` arrive the old active row is no longer in
  // the visible list, so the `effectiveActiveId` fallback (and its reconcile
  // effect) clamps the inspector to the new page's first row. We leave
  // `activeId` non-null here precisely so that fallback fires — nulling it
  // would be read as an explicit close and strand the inspector empty.
  const handlePageChange = (nextPage: number) => {
    onPageChange(nextPage)
  }

  const handlePageSizeChange = (nextSize: number) => {
    onPageSizeChange(nextSize)
  }

  // A filter change re-narrows the current page: drop the id-keyed checkbox
  // selection (it can't span a re-filtered set) and land the inspector on the
  // new first visible row. Also snap back to page 1 — a filter change against a
  // deep server page would otherwise strand the user on a slice that may be
  // entirely filtered out, matching the "reset to first page on filter" UX of
  // the sibling Review tabs.
  const handleToggleHideNonConcert = () => {
    const next = !hideNonConcert
    setHideNonConcert(next)
    setSelectedIds(new Set())
    if (page > 1) onPageChange(1)
    const nextVisible = filterVisible(events, next)
    setActiveId(nextVisible[0]?.id ?? null)
  }

  // Only the genuinely-empty queue (total === 0) gets the "all clear" state.
  // An out-of-range deep link (e.g. ?page=99) yields an empty server page while
  // total > 0; that must fall through to the normal render so <Pagination/>
  // mounts and its clamp-sync effect can pull the page back into range.
  if (total === 0) {
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
    visibleEvents.length > 0 &&
    visibleEvents.every((ev) => selectedIds.has(ev.id))

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
        {total} pending
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
          {visibleEvents.map((ev) => (
            <EventFlagRow
              key={ev.id}
              event={ev}
              isActive={effectiveActiveId === ev.id}
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
          event={
            visibleEvents.find((ev) => ev.id === effectiveActiveId) ?? null
          }
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setActiveId(null)}
          onEdit={onEdit}
        />
      </div>

      {/* Hide the pager for single-page results, but keep it mounted on
          page > 1 so the Pagination clamp-sync effect can recover an invalid
          deep-link (e.g. ?page=99 after the queue drains). */}
      {(total > pageSize || page > 1) && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
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
