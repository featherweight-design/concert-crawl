'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  useAdminEvents,
  useApproveEvent,
  useRejectEvent,
  useUpdateEvent,
} from '@/lib/queries/use-admin-events'
import {
  ConfidenceBar,
  AdminButton,
  Kbd,
  StatusBadge,
  MonoLabel,
} from '@/components/admin/primitives'
import { Check, X, Edit2, Filter, ChevronRight, Tag } from 'lucide-react'
import type { AdminEvent } from '@/app/(protected)/admin/events/page'

type StatusTab = 'pending' | 'low_conf' | 'duplicates' | 'approved' | 'rejected'

const TAB_KINDS: Record<StatusTab, string> = {
  pending: 'signal',
  low_conf: 'warning',
  duplicates: 'warning',
  approved: 'success',
  rejected: 'danger',
}

interface Props {
  initialEvents: AdminEvent[]
}

function formatDate(dateStr: string) {
  const parts = dateStr.split('-').map(Number)
  return new Date(
    parts[0] ?? 0,
    (parts[1] ?? 1) - 1,
    parts[2] ?? 1,
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        padding: '14px 18px',
        borderRight: noBorder ? 'none' : '1px solid var(--border)',
        flex: 1,
      }}
    >
      <MonoLabel>{label}</MonoLabel>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--fg)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function FieldRow({
  label,
  value,
  mono,
  warn,
  tags,
}: {
  label: string
  value?: string | null
  mono?: boolean
  warn?: boolean
  tags?: string[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
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
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      {tags ? (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {tags.map((tag) => (
            <StatusBadge key={tag} kind="neutral" variant="mono">
              {tag}
            </StatusBadge>
          ))}
          <button
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
              border: '1px dashed var(--border)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            + tag
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: warn
              ? 'color-mix(in oklab, var(--danger) 12%, transparent)'
              : 'var(--bg-elevated)',
            border: warn
              ? '1px solid color-mix(in oklab, var(--danger) 32%, transparent)'
              : '1px solid var(--border)',
            fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
            fontSize: 13,
            color: warn ? 'var(--danger)' : 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value ?? '—'}
        </div>
      )}
    </div>
  )
}

function EditFieldRow({
  label,
  value,
  type = 'text',
  mono,
  onChange,
}: {
  label: string
  value: string
  type?: 'text' | 'date' | 'time' | 'number'
  mono?: boolean
  onChange: (val: string) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
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
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--fg)',
          fontSize: 13,
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          outline: 'none',
        }}
        onFocus={(ev) => {
          ev.currentTarget.style.borderColor = 'var(--signal)'
        }}
        onBlur={(ev) => {
          ev.currentTarget.style.borderColor = 'var(--border)'
        }}
      />
    </div>
  )
}

export const EventQueueSplit = ({ initialEvents }: Props) => {
  const approveMutation = useApproveEvent()
  const rejectMutation = useRejectEvent()
  const updateEvent = useUpdateEvent()
  const { data: queriedEvents } = useAdminEvents(initialEvents)
  const [events, setEvents] = useState<AdminEvent[]>(queriedEvents)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEvents[0]?.id ?? null,
  )
  const [tab, setTab] = useState<StatusTab>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<{
    title: string
    artist: string
    date: string
    doorsTime: string
    showTime: string
    ticketPriceMin: string
    ticketPriceMax: string
  }>({
    title: '',
    artist: '',
    date: '',
    doorsTime: '',
    showTime: '',
    ticketPriceMin: '',
    ticketPriceMax: '',
  })

  // Keep local state in sync with background refetches
  useEffect(() => {
    setEvents(queriedEvents)
  }, [queriedEvents])

  // Exit edit mode when a different event is selected
  useEffect(() => {
    setIsEditing(false)
  }, [selectedId])

  const pendingEvents = events.filter((ev) => !ev.verified)
  const lowConfEvents = events.filter(
    (ev) =>
      !ev.verified &&
      Number(ev.confidenceScore) > 0 &&
      Number(ev.confidenceScore) < 0.7,
  )
  const approvedEvents = events.filter((ev) => ev.verified)

  const filtered =
    tab === 'pending'
      ? pendingEvents
      : tab === 'low_conf'
        ? lowConfEvents
        : tab === 'duplicates'
          ? []
          : tab === 'approved'
            ? approvedEvents
            : tab === 'rejected'
              ? []
              : events

  const selectedIdx = filtered.findIndex((ev) => ev.id === selectedId)
  const selected = filtered.find((ev) => ev.id === selectedId)

  const approve = useCallback(
    async (id: string) => {
      setProcessing(id)
      setActionError(null)
      try {
        await approveMutation.mutateAsync(id)
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
    [approveMutation, selectedIdx, filtered],
  )

  const reject = useCallback(
    async (id: string) => {
      if (!confirm('Delete this event? Cannot be undone.')) return
      setProcessing(id)
      setActionError(null)
      try {
        await rejectMutation.mutateAsync(id)
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
    [rejectMutation, selectedIdx, filtered],
  )

  function handleEditStart() {
    if (!selected) return
    setEditDraft({
      title: selected.title,
      artist: selected.artist,
      date: selected.date,
      doorsTime: selected.doorsTime ?? '',
      showTime: selected.showTime ?? '',
      ticketPriceMin: selected.ticketPriceMin ?? '',
      ticketPriceMax: selected.ticketPriceMax ?? '',
    })
    setIsEditing(true)
  }

  async function handleEditSave() {
    if (!selected) return
    try {
      const payload = {
        ...(editDraft.title ? { title: editDraft.title } : {}),
        ...(editDraft.artist ? { artist: editDraft.artist } : {}),
        ...(editDraft.date ? { date: editDraft.date } : {}),
        doorsTime: editDraft.doorsTime || null,
        showTime: editDraft.showTime || null,
        ticketPriceMin: editDraft.ticketPriceMin || null,
        ticketPriceMax: editDraft.ticketPriceMax || null,
      }
      await updateEvent.mutateAsync({ id: selected.id, payload })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save event edits', err)
    }
  }

  function handleEditCancel() {
    setIsEditing(false)
  }

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
    { key: 'duplicates', label: 'Duplicates', count: 0 },
    { key: 'approved', label: 'Approved', count: approvedEvents.length },
    { key: 'rejected', label: 'Rejected', count: 0 },
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
      {/* Filter rail — card with tabs left + dropdowns right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 14px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}
      >
        {/* Tab pill group */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 2,
            background: 'var(--surface-1)',
            borderRadius: 6,
            border: '1px solid var(--border)',
          }}
        >
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key
            const kind = TAB_KINDS[tabItem.key]
            return (
              <button
                key={tabItem.key}
                onClick={() => {
                  setTab(tabItem.key)
                  const newFiltered =
                    tabItem.key === 'pending'
                      ? pendingEvents
                      : tabItem.key === 'low_conf'
                        ? lowConfEvents
                        : tabItem.key === 'approved'
                          ? approvedEvents
                          : []
                  if (!newFiltered.find((ev) => ev.id === selectedId)) {
                    setSelectedId(newFiltered[0]?.id ?? null)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: active
                    ? `color-mix(in oklab, var(--${kind}) 18%, transparent)`
                    : 'transparent',
                  color: active ? `var(--${kind})` : 'var(--fg-muted)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tabItem.label}
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    background: active ? `var(--${kind})` : 'var(--surface-2)',
                    color: active ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {tabItem.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter dropdowns */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <AdminButton
            variant="outline"
            size="sm"
            icon={Filter}
            iconRight={ChevronRight}
          >
            All venues
          </AdminButton>
          <AdminButton
            variant="outline"
            size="sm"
            icon={Filter}
            iconRight={ChevronRight}
          >
            Date · next 30d
          </AdminButton>
          <AdminButton
            variant="outline"
            size="sm"
            icon={Filter}
            iconRight={ChevronRight}
          >
            Source · any
          </AdminButton>
        </div>
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
          {/* List header */}
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
            <MonoLabel>
              {filtered.length} {tab === 'approved' ? 'approved' : 'pending'} ·
              sort: discovered ↓
            </MonoLabel>
          </div>

          {/* Event rows */}
          {filtered.map((ev) => {
            const conf = Number(ev.confidenceScore ?? 0)
            const isLowConf = conf > 0 && conf < 0.7
            const missingPrice = !ev.ticketPriceMin && !ev.ticketPriceMax
            const active = ev.id === selectedId
            const showTime = formatTime(ev.showTime)

            return (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(ev.id)}
                onKeyDown={(ke) => {
                  if (ke.key === 'Enter' || ke.key === ' ') setSelectedId(ev.id)
                }}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '16px 1fr',
                  gap: 12,
                  padding: '12px 14px',
                  borderTop: 'none',
                  borderRight: 'none',
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
                    <div style={{ minWidth: 96, flexShrink: 0 }}>
                      <ConfidenceBar score={conf} />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      fontFamily: "'JetBrains Mono', monospace",
                      marginBottom: isLowConf || missingPrice ? 8 : 0,
                    }}
                  >
                    {ev.venueName ?? '—'} · {formatDate(ev.date)}
                    {showTime ? ` · ${showTime}` : ''}
                  </div>
                  {(isLowConf || missingPrice) && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {isLowConf && (
                        <FlagBadge kind="warning">low conf.</FlagBadge>
                      )}
                      {missingPrice && (
                        <FlagBadge kind="danger">no price</FlagBadge>
                      )}
                      <SourceBadge strategy={ev.extractionStrategy} />
                    </div>
                  )}
                </div>
              </div>
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
                padding: '16px 22px',
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
                  marginBottom: 6,
                }}
              >
                <MonoLabel>{selected.id.slice(0, 8).toUpperCase()}</MonoLabel>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  ·
                </span>
                {!selected.verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
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
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--warning)',
                        flexShrink: 0,
                        boxShadow:
                          '0 0 0 3px color-mix(in oklab, var(--warning) 22%, transparent)',
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
                      fontFamily: "'Inter', sans-serif",
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
                      marginTop: 6,
                      fontFamily: "'Inter', sans-serif",
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
                  {!selected.verified && (
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      icon={X}
                      disabled={processing === selected.id}
                      onClick={() => void reject(selected.id)}
                    >
                      Reject
                    </AdminButton>
                  )}
                  {isEditing ? (
                    <>
                      <AdminButton
                        variant="primary"
                        size="sm"
                        onClick={() => void handleEditSave()}
                        disabled={updateEvent.isPending}
                      >
                        {updateEvent.isPending ? 'Saving…' : 'Save'}
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={handleEditCancel}
                      >
                        Cancel
                      </AdminButton>
                    </>
                  ) : (
                    <AdminButton
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                      onClick={handleEditStart}
                    >
                      Edit
                    </AdminButton>
                  )}
                  {!selected.verified && (
                    <AdminButton
                      variant="success"
                      size="sm"
                      icon={Check}
                      disabled={processing === selected.id}
                      onClick={() => void approve(selected.id)}
                    >
                      Approve
                    </AdminButton>
                  )}
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

            {/* Body: 2-col extracted vs. raw */}
            <div
              style={{
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                {/* Left: extracted (editable) */}
                <div>
                  <MonoLabel>
                    extracted {isEditing ? '· editing' : '(editable)'}
                  </MonoLabel>
                  <div
                    style={{
                      marginTop: 10,
                      padding: 16,
                      border: `1px solid ${isEditing ? 'var(--signal)' : 'var(--border)'}`,
                      borderRadius: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      background: 'var(--surface-1)',
                    }}
                  >
                    {isEditing ? (
                      <>
                        <EditFieldRow
                          label="Title"
                          value={editDraft.title}
                          onChange={(val) =>
                            setEditDraft((prev) => ({ ...prev, title: val }))
                          }
                        />
                        <EditFieldRow
                          label="Artist"
                          value={editDraft.artist}
                          onChange={(val) =>
                            setEditDraft((prev) => ({ ...prev, artist: val }))
                          }
                        />
                        <EditFieldRow
                          label="Date"
                          value={editDraft.date}
                          type="date"
                          mono
                          onChange={(val) =>
                            setEditDraft((prev) => ({ ...prev, date: val }))
                          }
                        />
                        <EditFieldRow
                          label="Doors"
                          value={editDraft.doorsTime}
                          type="time"
                          mono
                          onChange={(val) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              doorsTime: val,
                            }))
                          }
                        />
                        <EditFieldRow
                          label="Show"
                          value={editDraft.showTime}
                          type="time"
                          mono
                          onChange={(val) =>
                            setEditDraft((prev) => ({ ...prev, showTime: val }))
                          }
                        />
                        <EditFieldRow
                          label="Price low"
                          value={editDraft.ticketPriceMin}
                          type="number"
                          mono
                          onChange={(val) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              ticketPriceMin: val,
                            }))
                          }
                        />
                        <EditFieldRow
                          label="Price high"
                          value={editDraft.ticketPriceMax}
                          type="number"
                          mono
                          onChange={(val) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              ticketPriceMax: val,
                            }))
                          }
                        />
                        {selected.genre && selected.genre.length > 0 && (
                          <FieldRow label="Tags" tags={selected.genre} />
                        )}
                      </>
                    ) : (
                      <>
                        <FieldRow label="Title" value={selected.title} />
                        <FieldRow label="Artist" value={selected.artist} />
                        <FieldRow label="Venue" value={selected.venueName} />
                        <FieldRow
                          label="Date"
                          value={formatDate(selected.date)}
                          mono
                        />
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
                          warn={!selected.ticketPriceMin}
                        />
                        <FieldRow
                          label="Price high"
                          value={
                            selected.ticketPriceMax
                              ? `$${Math.round(parseFloat(selected.ticketPriceMax))}`
                              : null
                          }
                          mono
                          warn={!selected.ticketPriceMax}
                        />
                        {selected.genre && selected.genre.length > 0 && (
                          <FieldRow label="Tags" tags={selected.genre} />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right: raw source */}
                <div>
                  <MonoLabel>raw source · llm input</MonoLabel>
                  <div
                    style={{
                      marginTop: 10,
                      padding: 14,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11.5,
                      lineHeight: 1.65,
                      color: 'var(--fg-muted)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 360,
                      overflow: 'auto',
                    }}
                  >
                    {selected.sourceUrl ? (
                      <>
                        <span style={{ color: 'var(--fg-subtle)' }}>
                          {'// source url\n'}
                        </span>
                        <a
                          href={selected.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--signal)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {selected.sourceUrl}
                        </a>
                        {'\n\n'}
                        <span style={{ color: 'var(--fg-subtle)' }}>
                          {'// raw html capture not stored in this build\n'}
                          {'// see issue #259'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>
                        {'// no source url recorded\n'}
                        {'// raw html capture not stored in this build\n'}
                        {'// see issue #259'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: keyboard shortcuts */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 14,
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
                <Kbd>K</Kbd>
                <span>navigate</span>
                <span style={{ width: 8, display: 'inline-block' }} />
                <Kbd>A</Kbd>
                <span>approve</span>
                <span style={{ width: 8, display: 'inline-block' }} />
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
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--signal)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {selectedIds.size}
          </div>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--paper)',
            }}
          >
            events selected
          </span>
          <span
            style={{
              width: 1,
              height: 18,
              background: 'rgba(255,255,255,0.18)',
              display: 'inline-block',
            }}
          />
          <button
            disabled={processing !== null}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--paper)',
              background: 'transparent',
              border: 'none',
              cursor: processing !== null ? 'not-allowed' : 'pointer',
              opacity: processing !== null ? 0.5 : 1,
            }}
          >
            <Check size={13} />
            Approve all
          </button>
          <button
            disabled={processing !== null}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--paper)',
              opacity: processing !== null ? 0.5 : 0.85,
              background: 'transparent',
              border: 'none',
              cursor: processing !== null ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={13} />
            Reject
          </button>
          <button
            disabled={processing !== null}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--paper)',
              opacity: processing !== null ? 0.5 : 0.85,
              background: 'transparent',
              border: 'none',
              cursor: processing !== null ? 'not-allowed' : 'pointer',
            }}
          >
            <Tag size={13} />
            Re-tag
          </button>
          <span style={{ flex: 1 }} />
          <button
            style={{
              padding: 6,
              borderRadius: 6,
              opacity: 0.7,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--paper)',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => setSelectedIds(new Set())}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
