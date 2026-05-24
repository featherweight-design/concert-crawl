'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Panel, AdminButton, StatusBadge } from '@/components/admin/primitives'
import { REVIEW_COPY } from './definitions/copy'
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
}

export const EventFlagsSection = ({
  events,
  onApprove,
  onReject,
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
      setSelectedIds(new Set(visibleEvents.map((ev) => ev.id)))
    } else {
      setSelectedIds(new Set())
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
      const remaining = visibleEvents.filter((ev) => ev.id !== id)
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
      const remaining = visibleEvents.filter((ev) => ev.id !== id)
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
        ? (visibleEvents.find((ev) => !approving.has(ev.id))?.id ?? null)
        : prev,
    )
    setPendingApprovalIds(approving)

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)

    pendingTimerRef.current = setTimeout(() => {
      void Promise.allSettled(ids.map((id) => onApprove(id)))
      setPendingApprovalIds(new Set())
      pendingTimerRef.current = null
    }, 6000)

    toast(REVIEW_COPY.bulkToast.approved(ids.length), {
      duration: 6000,
      action: {
        label: REVIEW_COPY.bulkToast.undo,
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

  if (events.length === 0) {
    const emptyTitle = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {REVIEW_COPY.eventFlags.panelTitle}
        <StatusBadge kind="success">
          {REVIEW_COPY.eventFlags.queueClearBadge}
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
              {REVIEW_COPY.eventFlags.queueClearHeading}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg-muted)',
                marginTop: 2,
              }}
            >
              {REVIEW_COPY.eventFlags.queueClearBody}
            </div>
          </div>
        </div>
      </Panel>
    )
  }

  const visibleEvents = (
    hideNonConcert
      ? events.filter(
          (ev) =>
            !ev.genre?.some((tag) => tag.toLowerCase().includes('non-concert')),
        )
      : events
  ).filter((ev) => !pendingApprovalIds.has(ev.id))

  const allSelected =
    visibleEvents.length > 0 && selectedIds.size === visibleEvents.length

  const panelTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {REVIEW_COPY.eventFlags.panelTitle}
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
        {REVIEW_COPY.eventFlags.selectAll}
      </label>
      <AdminButton
        variant={hideNonConcert ? 'outline' : 'ghost'}
        size="sm"
        icon={Filter}
        onClick={() => setHideNonConcert((prev) => !prev)}
      >
        {REVIEW_COPY.eventFlags.hideNonConcert}
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
          event={visibleEvents.find((ev) => ev.id === activeId) ?? null}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setActiveId(null)}
        />
      </div>

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
