'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { ConfidenceBar, AdminButton, Kbd } from '@/components/admin/primitives'
import { Check, X, Edit2 } from 'lucide-react'
import type { AdminEvent } from '@/app/(protected)/admin/events/page'

type StatusTab = 'pending' | 'low_conf' | 'approved' | 'all'

interface Props {
  initialEvents: AdminEvent[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })
}

function formatTime(timeStr: string | null | undefined) {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  if (isNaN(hours) || isNaN(minutes)) return null
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

function formatPrice(min: string | null, max: string | null) {
  if (!min && !max) return null
  const low = min ? Math.round(parseFloat(min)) : null
  const high = max ? Math.round(parseFloat(max)) : null
  if (low !== null && high !== null && low !== high) return `$${low} – $${high}`
  if (low !== null) return `$${low}`
  if (high !== null) return `$${high}`
  return null
}

function formatDiscovered(createdAt: string) {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })
}

function SourceBadge({ strategy }: { strategy: string | null }) {
  if (!strategy) return null
  const isLlm = strategy === 'llm'
  return (
    <span
      style={{
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        border: `1px solid ${isLlm ? 'rgba(122,58,168,0.3)' : 'rgba(29,95,191,0.3)'}`,
        color: isLlm ? 'var(--accent)' : 'var(--signal)',
        background: isLlm ? 'rgba(122,58,168,0.08)' : 'rgba(29,95,191,0.08)',
      }}
    >
      {strategy}
    </span>
  )
}

function FlagBadge({
  kind,
  children,
}: {
  kind: 'warning' | 'danger'
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        background:
          kind === 'warning' ? 'rgba(184,117,20,0.10)' : 'rgba(220,38,38,0.10)',
        color: kind === 'warning' ? 'var(--warning)' : 'var(--danger)',
        border: `1px solid ${kind === 'warning' ? 'rgba(184,117,20,0.25)' : 'rgba(220,38,38,0.25)'}`,
      }}
    >
      {children}
    </span>
  )
}

function VitalCell({
  label,
  children,
  noBorder,
}: {
  label: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRight: noBorder ? 'none' : '1px solid var(--border)',
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
        {children}
      </div>
    </div>
  )
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <div
        style={{
          padding: '5px 9px',
          borderRadius: 6,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontSize: 13,
          color: 'var(--fg)',
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}

export const EventQueueSplit = ({ initialEvents }: Props) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState(initialEvents)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEvents[0]?.id ?? null,
  )
  const [tab, setTab] = useState<StatusTab>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const pendingEvents = events.filter((ev) => !ev.verified)
  const lowConfEvents = events.filter(
    (ev) => !ev.verified && Number(ev.confidenceScore) < 0.7,
  )
  const approvedEvents = events.filter((ev) => ev.verified)

  const filtered =
    tab === 'pending'
      ? pendingEvents
      : tab === 'low_conf'
        ? lowConfEvents
        : tab === 'approved'
          ? approvedEvents
          : events

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
        setEvents((prev) =>
          prev.map((ev) => (ev.id === id ? { ...ev, verified: true } : ev)),
        )
        const remaining = filtered.filter((ev) => ev.id !== id)
        const nextIdx = Math.min(selectedIdx, remaining.length - 1)
        setSelectedId(remaining[nextIdx]?.id ?? null)
      } catch (err) {
        console.error('[EventQueueSplit] approve failed:', err)
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
        console.error('[EventQueueSplit] reject failed:', err)
        setActionError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setProcessing(null)
      }
    },
    [getToken, selectedIdx, filtered],
  )

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

  const TABS: { key: StatusTab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingEvents.length },
    { key: 'low_conf', label: 'Low conf.', count: lowConfEvents.length },
    { key: 'approved', label: 'Approved', count: approvedEvents.length },
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
      {/* Filter tab strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: 3,
          background: 'var(--surface-1)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          width: 'fit-content',
        }}
      >
        {TABS.map((tabItem) => {
          const active = tab === tabItem.key
          return (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                background: active
                  ? 'color-mix(in oklab, var(--signal) 18%, var(--bg-elevated))'
                  : 'transparent',
                color: active ? 'var(--signal)' : 'var(--fg-muted)',
                border: 'none',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {tabItem.label}
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: 999,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? 'var(--signal)' : 'var(--surface-2)',
                  color: active ? '#fff' : 'var(--fg-muted)',
                }}
              >
                {tabItem.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Unified split panel — no gap, shared border */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 480px) minmax(0, 1fr)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left: queue list */}
        <div
          style={{
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* List header row */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              style={{ accentColor: 'var(--signal)' }}
              onChange={(chev) => {
                if (chev.target.checked) {
                  setSelectedIds(new Set(filtered.map((ev) => ev.id)))
                } else {
                  setSelectedIds(new Set())
                }
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
              }}
            >
              {filtered.length} {tab === 'approved' ? 'approved' : 'pending'} ·
              sort: date ↑
            </span>
          </div>

          {/* Event rows */}
          {filtered.map((ev) => {
            const conf = Number(ev.confidenceScore ?? 0)
            const isLowConf = conf > 0 && conf < 0.7
            const active = ev.id === selectedId
            const showTime = formatTime(ev.showTime)

            return (
              <button
                key={ev.id}
                onClick={() => setSelectedId(ev.id)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '16px 1fr',
                  gap: 12,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: active
                    ? '2px solid var(--signal)'
                    : '2px solid transparent',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignItems: 'flex-start',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(ev.id)}
                  style={{ marginTop: 2, accentColor: 'var(--signal)' }}
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
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
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
                    <ConfidenceBar score={conf} />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      fontFamily: "'JetBrains Mono', monospace",
                      marginBottom: isLowConf || ev.extractionStrategy ? 8 : 0,
                    }}
                  >
                    {ev.venueName ?? '—'} · {formatDate(ev.date)}
                    {showTime ? ` · ${showTime}` : ''}
                  </div>
                  {(isLowConf || ev.extractionStrategy) && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {isLowConf && (
                        <FlagBadge kind="warning">low conf.</FlagBadge>
                      )}
                      <SourceBadge strategy={ev.extractionStrategy} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: inspector */}
        {selected ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Inspector header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-1)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                  }}
                >
                  {selected.id.slice(0, 8).toUpperCase()}
                </span>
                {!selected.verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 7px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(184,117,20,0.10)',
                      color: 'var(--warning)',
                      border: '1px solid rgba(184,117,20,0.25)',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--warning)',
                        flexShrink: 0,
                      }}
                    />
                    Pending review
                  </span>
                )}
                {!selected.verified &&
                  Number(selected.confidenceScore) > 0 &&
                  Number(selected.confidenceScore) < 0.7 && (
                    <FlagBadge kind="warning">low confidence</FlagBadge>
                  )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: 'var(--fg)',
                    }}
                  >
                    {selected.artist || selected.title}
                  </h2>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: 'var(--fg-muted)',
                    }}
                  >
                    {selected.venueName ?? '—'} · {formatDate(selected.date)}
                    {formatTime(selected.showTime)
                      ? ` · ${formatTime(selected.showTime)}`
                      : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <AdminButton
                    variant="ghost"
                    icon={X}
                    disabled={processing === selected.id}
                    onClick={() => void reject(selected.id)}
                  >
                    Reject
                  </AdminButton>
                  <AdminButton variant="outline" icon={Edit2}>
                    Edit
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    icon={Check}
                    disabled={processing === selected.id}
                    onClick={() => void approve(selected.id)}
                  >
                    Approve
                  </AdminButton>
                </div>
              </div>
            </div>

            {/* 4-column vitals strip */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <VitalCell label="Confidence">
                <ConfidenceBar score={Number(selected.confidenceScore ?? 0)} />
              </VitalCell>
              <VitalCell label="Source">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {selected.extractionStrategy === 'structured_data'
                    ? 'schema.org/Event'
                    : selected.extractionStrategy === 'llm'
                      ? 'Haiku 4.5 (LLM)'
                      : (selected.extractionStrategy ?? '—')}
                </span>
              </VitalCell>
              <VitalCell label="Discovered">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {formatDiscovered(selected.createdAt)}
                </span>
              </VitalCell>
              <VitalCell label="Price range" noBorder>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color:
                      !selected.ticketPriceMin && !selected.ticketPriceMax
                        ? 'var(--danger)'
                        : 'var(--fg)',
                  }}
                >
                  {formatPrice(
                    selected.ticketPriceMin,
                    selected.ticketPriceMax,
                  ) ?? '—'}
                </span>
              </VitalCell>
            </div>

            {/* Field rows + footer */}
            <div
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
              }}
            >
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

              <FieldRow label="Title" value={selected.title} />
              <FieldRow label="Artist" value={selected.artist} />
              <FieldRow label="Venue" value={selected.venueName} />
              <FieldRow label="Date" value={formatDate(selected.date)} mono />
              <FieldRow
                label="Doors"
                value={formatTime(selected.doorsTime)}
                mono
              />
              <FieldRow
                label="Show"
                value={formatTime(selected.showTime)}
                mono
              />
              <FieldRow
                label="Price low"
                value={
                  selected.ticketPriceMin
                    ? `$${Math.round(parseFloat(selected.ticketPriceMin))}`
                    : null
                }
                mono
              />
              <FieldRow
                label="Price high"
                value={
                  selected.ticketPriceMax
                    ? `$${Math.round(parseFloat(selected.ticketPriceMax))}`
                    : null
                }
                mono
              />

              {selected.genre && selected.genre.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--fg-subtle)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                    }}
                  >
                    Tags
                  </span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {selected.genre.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyboard shortcuts footer */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 16,
                  borderTop: '1px dashed var(--border)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  flexWrap: 'wrap',
                }}
              >
                <Kbd>J</Kbd>
                <span>next</span>
                <Kbd>K</Kbd>
                <span>prev</span>
                <span style={{ width: 4 }} />
                <Kbd>A</Kbd>
                <span>approve</span>
                <Kbd>R</Kbd>
                <span>reject</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
              fontSize: 13,
            }}
          >
            Select an event to review
          </div>
        )}
      </div>

      {/* Bulk action bar (floating, shows when items selected) */}
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
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'var(--signal)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {selectedIds.size}
          </div>
          <span
            style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 600 }}
          >
            events selected
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
