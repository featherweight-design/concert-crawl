'use client'

import { useState, useRef, useEffect } from 'react'
import { Filter } from 'lucide-react'
import {
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export interface ActivityRow {
  eventId: string
  eventTitle: string | null
  venueName: string | null
  date: string
  source: string
  outcome: string
  latencyMs: number
  attemptedAt: string
}

interface ActivityFeedPanelProps {
  activity: ActivityRow[]
}

export const ActivityFeedPanel = ({ activity }: ActivityFeedPanelProps) => {
  const sources = Array.from(new Set(activity.map((row) => row.source))).sort()
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const filtered =
    selectedSource === ''
      ? activity
      : activity.filter((row) => row.source === selectedSource)

  const filtersActive = selectedSource !== ''

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        filterOpen &&
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  return (
    <Panel
      title="Recent pipeline activity"
      padding={0}
      action={
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${filtersActive ? 'var(--signal)' : 'var(--border)'}`,
              background: filtersActive
                ? 'rgba(var(--signal-rgb, 99,102,241),0.08)'
                : 'transparent',
              color: filtersActive ? 'var(--signal)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            <Filter size={13} />
            {filtersActive ? selectedSource : 'Filter'}
          </button>
          {filterOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 10,
                width: 200,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--fg-subtle)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  Source
                </label>
                <select
                  value={selectedSource}
                  onChange={(ev) => {
                    setSelectedSource(ev.target.value)
                    setFilterOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All sources</option>
                  {sources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
              {filtersActive && (
                <button
                  onClick={() => {
                    setSelectedSource('')
                    setFilterOpen(false)
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--fg-muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      }
    >
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        <AdminTable>
          <THead sticky>
            <tr>
              <TH>Event</TH>
              <TH>Source</TH>
              <TH>Outcome</TH>
              <TH>Latency</TH>
            </tr>
          </THead>
          <tbody>
            {filtered.map((row, idx) => (
              <TR key={`${row.eventId}-${row.source}-${idx}`}>
                <TD>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {row.eventTitle ?? row.eventId}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-subtle)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {row.venueName ?? '—'} · {row.date}
                  </div>
                </TD>
                <TD>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 2,
                    }}
                  >
                    <StatusBadge kind="signal" variant="outline">
                      {row.source}
                    </StatusBadge>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--fg-subtle)',
                        fontFamily: "'JetBrains Mono', monospace",
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTimestamp(row.attemptedAt)}
                    </div>
                  </div>
                </TD>
                <TD>
                  <StatusBadge
                    kind={OUTCOME_KIND[row.outcome] ?? 'neutral'}
                    dot
                  >
                    {row.outcome}
                  </StatusBadge>
                </TD>
                <TD mono color="var(--fg-muted)">
                  {row.latencyMs}ms
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD colSpan={4} color="var(--fg-subtle)">
                  {activity.length === 0
                    ? 'No pipeline activity yet.'
                    : `No activity for source "${selectedSource}".`}
                </TD>
              </TR>
            )}
          </tbody>
        </AdminTable>
      </div>
    </Panel>
  )
}
