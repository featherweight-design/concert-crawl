'use client'

import { useState } from 'react'
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
  const sources = [
    'all',
    ...Array.from(new Set(activity.map((row) => row.source))).sort(),
  ]
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const filtered =
    selectedSource === 'all'
      ? activity
      : activity.filter((row) => row.source === selectedSource)

  return (
    <Panel
      title="Recent pipeline activity"
      padding={0}
      action={
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                border:
                  selectedSource === src
                    ? '1px solid var(--signal)'
                    : '1px solid var(--border-strong)',
                background:
                  selectedSource === src ? 'var(--signal)' : 'transparent',
                color:
                  selectedSource === src
                    ? 'var(--fg-on-accent)'
                    : 'var(--fg-muted)',
                transition: 'background 0.1s, color 0.1s, border-color 0.1s',
              }}
            >
              {src}
            </button>
          ))}
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
              <TH>Timestamp</TH>
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
                  <StatusBadge kind="signal" variant="outline">
                    {row.source}
                  </StatusBadge>
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
                <TD>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg)',
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTimestamp(row.attemptedAt)}
                  </div>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR>
                <TD colSpan={5} color="var(--fg-subtle)">
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
