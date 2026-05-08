'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import {
  ConfidenceBar,
  AdminButton,
  Panel,
  Kbd,
} from '@/components/admin/primitives'
import { EventFilterRail } from './EventFilterRail'
import { Check, X } from 'lucide-react'

type StatusFilter = 'low_conf' | 'unverified' | 'verified'

interface AdminEvent {
  id: string
  title: string
  artist: string
  venue?: { name: string }
  date: string
  doorsTime?: string | null
  showTime?: string | null
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

type FilterKind = 'pending' | 'low-conf' | 'all'

interface Props {
  initialEvents: AdminEvent[]
}

export const EventQueueSplit = ({ initialEvents }: Props) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState(initialEvents)
  const [selectedId, setSelectedId] = useState<string | null>(
    events[0]?.id ?? null,
  )
  const [filter, setFilter] = useState<FilterKind>('pending')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = events.filter((ev) => {
    if (filter === 'low-conf') return Number(ev.confidenceScore) < 0.7
    if (statusFilter === 'low_conf') return Number(ev.confidenceScore) < 0.7
    if (statusFilter === 'unverified') return !ev.verified
    if (statusFilter === 'verified') return ev.verified
    return true
  })

  const selectedIdx = filtered.findIndex((ev) => ev.id === selectedId)
  const selected = filtered.find((ev) => ev.id === selectedId)

  const approve = useCallback(
    async (id: string) => {
      setProcessing(id)
      setActionError(null)
      try {
        const tok = await getToken()
        if (!tok) return
        await apiClient.patch(`/v1/admin/events/${id}/verify`, tok, {})
        setEvents((prev) => prev.filter((ev) => ev.id !== id))
        const remaining = filtered.filter((ev) => ev.id !== id)
        const nextIdx = Math.min(selectedIdx, remaining.length - 1)
        setSelectedId(remaining[nextIdx]?.id ?? null)
      } catch (err) {
        console.error('[EventQueueSplit] action failed:', err)
        setActionError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setProcessing(null)
      }
    },
    [getToken, selectedIdx, filtered],
  )

  const reject = useCallback(
    async (id: string) => {
      if (!confirm('Delete this event? Cannot be undone.')) return
      setProcessing(id)
      setActionError(null)
      try {
        const tok = await getToken()
        if (!tok) return
        await apiClient.delete(`/v1/admin/events/${id}`, tok)
        setEvents((prev) => prev.filter((ev) => ev.id !== id))
        const remaining = filtered.filter((ev) => ev.id !== id)
        const nextIdx = Math.min(selectedIdx, remaining.length - 1)
        setSelectedId(remaining[nextIdx]?.id ?? null)
      } catch (err) {
        console.error('[EventQueueSplit] action failed:', err)
        setActionError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setProcessing(null)
      }
    },
    [getToken, selectedIdx, filtered],
  )

  // Keyboard nav: J/K/A/R
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (
        ev.target instanceof HTMLInputElement ||
        ev.target instanceof HTMLTextAreaElement
      )
        return
      if (ev.key === 'j' || ev.key === 'ArrowDown') {
        const next = filtered[selectedIdx + 1]
        if (next) setSelectedId(next.id)
      } else if (ev.key === 'k' || ev.key === 'ArrowUp') {
        const prev = filtered[selectedIdx - 1]
        if (prev) setSelectedId(prev.id)
      } else if (ev.key === 'a' && selectedId) {
        void approve(selectedId)
      } else if (ev.key === 'r' && selectedId) {
        void reject(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, selectedIdx, filtered, approve, reject])

  const FILTERS: { key: FilterKind; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: events.length },
    {
      key: 'low-conf',
      label: 'Low conf.',
      count: events.filter((ev) => Number(ev.confidenceScore) < 0.7).length,
    },
    { key: 'all', label: 'All', count: events.length },
  ]

  if (events.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 12,
          color: 'var(--fg-muted)',
        }}
      >
        <div style={{ fontSize: 24 }}>&#x2713;</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>
          Queue is clear.
        </div>
        <div style={{ fontSize: 13 }}>Every event has been reviewed.</div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Filter rail */}
      <div style={{ display: 'flex', gap: 8 }}>
        {FILTERS.map((ff) => (
          <button
            key={ff.key}
            onClick={() => setFilter(ff.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: filter === ff.key ? 'var(--signal)' : 'transparent',
              color:
                filter === ff.key ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
              border: `1px solid ${filter === ff.key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {ff.label}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              {ff.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left queue list */}
        <div
          style={{
            width: 480,
            flexShrink: 0,
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--bg-elevated)',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <EventFilterRail
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
          </div>
          {filtered.map((ev) => {
            const conf = Number(ev.confidenceScore ?? 0)
            const active = ev.id === selectedId
            return (
              <button
                key={ev.id}
                onClick={() => setSelectedId(ev.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  borderLeft: active
                    ? '2px solid var(--signal)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(ev.id)}
                  onChange={(chev) => {
                    chev.stopPropagation()
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(ev.id)) next.delete(ev.id)
                      else next.add(ev.id)
                      return next
                    })
                  }}
                  onClick={(chev) => chev.stopPropagation()}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--fg)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {ev.artist || ev.title}
                    </span>
                    {ev.confidenceScore !== null &&
                      parseFloat(ev.confidenceScore) < 0.7 && (
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 999,
                            fontSize: 10,
                            background: 'rgba(184,117,20,0.12)',
                            color: 'var(--warning)',
                            border: '1px solid rgba(184,117,20,0.25)',
                            flexShrink: 0,
                          }}
                        >
                          low conf.
                        </span>
                      )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {ev.venue?.name ?? '—'} ·{' '}
                    {new Date(ev.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'America/Denver',
                    })}
                  </div>
                  <ConfidenceBar score={conf} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Right inspector */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Panel title={selected.artist || selected.title}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <AdminButton
                    variant="ghost"
                    icon={X}
                    disabled={processing === selected.id}
                    onClick={() => {
                      void reject(selected.id)
                    }}
                  >
                    Reject
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    icon={Check}
                    disabled={processing === selected.id}
                    onClick={() => {
                      void approve(selected.id)
                    }}
                  >
                    Approve
                  </AdminButton>
                </div>
                {actionError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--danger)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(220,38,38,0.08)',
                      border: '1px solid rgba(220,38,38,0.2)',
                    }}
                  >
                    {actionError}
                  </div>
                )}

                {/* Vitals */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                  }}
                >
                  {[
                    {
                      label: 'Confidence',
                      value: (
                        <ConfidenceBar
                          score={Number(selected.confidenceScore ?? 0)}
                        />
                      ),
                    },
                    {
                      label: 'Source',
                      value: selected.extractionStrategy ?? '—',
                    },
                    {
                      label: 'Date',
                      value: new Date(selected.date).toLocaleDateString(
                        'en-US',
                        { weekday: 'short', month: 'long', day: 'numeric' },
                      ),
                    },
                    { label: 'Venue', value: selected.venue?.name ?? '—' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-subtle)',
                          marginBottom: 4,
                        }}
                      >
                        {row.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Field rows */}
                {[
                  ['Title', selected.title],
                  ['Artist', selected.artist],
                  ['Doors', selected.doorsTime ?? '—'],
                  ['Show', selected.showTime ?? '—'],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      paddingBottom: 8,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        width: 64,
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--fg)' }}>
                      {val}
                    </span>
                  </div>
                ))}

                {/* Keyboard cues */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                  }}
                >
                  <Kbd>J</Kbd>
                  <span>next</span>
                  <Kbd>K</Kbd>
                  <span>prev</span>
                  <Kbd>A</Kbd>
                  <span>approve</span>
                  <Kbd>R</Kbd>
                  <span>reject</span>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
          }}
        >
          <span
            style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}
          >
            {selectedIds.size} selected
          </span>
          <AdminButton variant="success" size="sm" disabled>
            Approve all
          </AdminButton>
          <AdminButton variant="danger" size="sm" disabled>
            Reject
          </AdminButton>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            style={{ color: 'var(--paper)' }}
          >
            Dismiss
          </AdminButton>
        </div>
      )}
    </div>
  )
}
