'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Panel, AdminButton } from '@/components/admin/primitives'
import { EventFlagRow } from './EventFlagRow'
import { EventFlagInspector } from './EventFlagInspector'
import { BulkActionDock } from './BulkActionDock'

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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
      setSelectedIds(new Set(events.map((ev) => ev.id)))
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
    if (activeId === id) setActiveId(null)
  }

  const handleReject = (id: string) => {
    onReject(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (activeId === id) setActiveId(null)
  }

  const handleBulkApprove = () => {
    for (const id of selectedIds) {
      onApprove(id)
    }
    setSelectedIds(new Set())
    setActiveId(null)
  }

  const handleBulkReject = () => {
    for (const id of selectedIds) {
      onReject(id)
    }
    setSelectedIds(new Set())
    setActiveId(null)
  }

  if (events.length === 0) {
    return (
      <Panel title="Event flags">
        <div
          style={{
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              }}
            >
              <CheckCircle2 size={18} color="var(--success)" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Queue clear
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--fg-muted)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                No events pending review
              </div>
            </div>
          </div>
        </div>
      </Panel>
    )
  }

  const allSelected = events.length > 0 && selectedIds.size === events.length

  return (
    <Panel title="Event flags" padding={0}>
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(evt) => handleSelectAll(evt.target.checked)}
            style={{ accentColor: 'var(--signal)', width: 15, height: 15 }}
          />
          Select all
        </label>

        {selectedIds.size > 0 && (
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect all
          </AdminButton>
        )}

        <span
          style={{
            marginLeft: 'auto',
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {events.length}
        </span>
      </div>

      {/* Body: split grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          minHeight: 420,
          position: 'relative',
        }}
      >
        {/* Left: list */}
        <div style={{ overflowY: 'auto' }}>
          {events.map((ev) => (
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
          event={events.find((ev) => ev.id === activeId) ?? null}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setActiveId(null)}
        />
      </div>

      {/* Bulk action dock */}
      {selectedIds.size > 0 && (
        <BulkActionDock
          count={selectedIds.size}
          onApproveAll={handleBulkApprove}
          onRejectAll={handleBulkReject}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </Panel>
  )
}
