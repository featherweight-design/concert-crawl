'use client'

import { useState } from 'react'
import {
  StatusBadge,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  CostText,
} from '@/components/admin/primitives'
import type { CrawlRun } from '@concert-crawl/types'

const MT_TIMEZONE = 'America/Denver'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  durationMs: number | null
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
  strategy: string
  cost: number
  error: string | null
}

interface Props {
  initialStatus: CrawlStatusRow[]
  initialRuns: CrawlRun[]
  initialSelectedId?: string
}

function extractErrorMessage(rawBody: unknown, fallback: string): string {
  if (
    rawBody !== null &&
    typeof rawBody === 'object' &&
    'error' in rawBody &&
    typeof (rawBody as { error?: unknown })['error'] === 'string'
  ) {
    return (rawBody as { error: string })['error']
  }
  return fallback
}

const STATUS_KIND: Record<
  string,
  'success' | 'danger' | 'warning' | 'neutral'
> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Success', value: 'success' },
  { label: 'Partial', value: 'partial' },
  { label: 'Failed', value: 'failed' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Paused', value: 'paused' },
  { label: 'Never', value: 'never' },
]

function fmtTimeMT(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: MT_TIMEZONE,
  })
}

function shortRunId(id: string): string {
  return `R-${id.replace(/-/g, '').slice(0, 8)}`
}

export const CrawlSplitView = ({
  initialStatus,
  initialRuns,
  initialSelectedId,
}: Props) => {
  const resolvedInitialId =
    initialSelectedId &&
    initialStatus.some((row) => row.venueId === initialSelectedId)
      ? initialSelectedId
      : (initialStatus[0]?.venueId ?? null)

  const [selectedId, setSelectedId] = useState<string | null>(resolvedInitialId)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [recrawlState, setRecrawlState] = useState<
    Record<string, 'triggering' | 'queued' | 'error'>
  >({})
  const [recrawlError, setRecrawlError] = useState<Record<string, string>>({})

  async function handleTrigger(venueId: string) {
    setRecrawlState((prev) => ({ ...prev, [venueId]: 'triggering' }))
    setRecrawlError((prev) => {
      const next = { ...prev }
      delete next[venueId]
      return next
    })
    try {
      const res = await fetch(`/api/admin/crawl/${venueId}`, { method: 'POST' })
      if (!res.ok) {
        const rawBody: unknown = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(rawBody, `HTTP ${res.status}`))
      }
      setRecrawlState((prev) => ({ ...prev, [venueId]: 'queued' }))
    } catch (err) {
      setRecrawlState((prev) => {
        const next = { ...prev }
        delete next[venueId]
        return next
      })
      setRecrawlError((prev) => ({
        ...prev,
        [venueId]: err instanceof Error ? err.message : 'Crawl trigger failed',
      }))
    }
  }

  const filteredStatus = statusFilter
    ? initialStatus.filter((row) => row.status === statusFilter)
    : initialStatus

  const selected = initialStatus.find((row) => row.venueId === selectedId)
  const selectedRuns = initialRuns.filter((run) => run.venueId === selectedId)
  const activeRunId = selectedRunId ?? selectedRuns[0]?.id ?? null
  const activeRun = selectedRuns.find((run) => run.id === activeRunId) ?? null

  const venueRecrawlState = selectedId ? recrawlState[selectedId] : undefined
  const venueRecrawlError = selectedId ? recrawlError[selectedId] : undefined

  return (
    <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
      {/* Left rail */}
      <div
        style={{
          width: 460,
          flexShrink: 0,
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg-muted)',
            }}
          >
            {filteredStatus.length} venues
          </span>
          <select
            value={statusFilter}
            onChange={(ev) => setStatusFilter(ev.target.value)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '2px 6px',
              cursor: 'pointer',
            }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {filteredStatus.map((row) => (
          <button
            key={row.venueId}
            id={`venue-row-${row.venueId}`}
            onClick={() => {
              setSelectedId(row.venueId)
              setSelectedRunId(null)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              background:
                row.venueId === selectedId ? 'var(--surface-2)' : 'transparent',
              borderLeft:
                row.venueId === selectedId
                  ? '2px solid var(--signal)'
                  : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: `var(--${STATUS_KIND[row.status] ?? 'neutral'})`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.venueName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {row.lastRunAt ? `${fmtTimeMT(row.lastRunAt)} MT` : 'never'}
                {row.durationMs != null
                  ? ` · ${(row.durationMs / 1000).toFixed(1)}s`
                  : ''}
              </div>
            </div>
            <StatusBadge
              kind={STATUS_KIND[row.status] ?? 'neutral'}
              variant="soft"
            >
              {row.status}
            </StatusBadge>
          </button>
        ))}
      </div>

      {/* Right inspector */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
        }}
      >
        {selected ? (
          <>
            <Panel
              title={selected.venueName}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selected.websiteUrl && (
                    <a
                      href={selected.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        border: '1px solid var(--border)',
                        color: 'var(--fg-muted)',
                        textDecoration: 'none',
                      }}
                    >
                      Source ↗
                    </a>
                  )}
                  <button
                    onClick={() => handleTrigger(selected.venueId)}
                    disabled={
                      venueRecrawlState === 'triggering' ||
                      venueRecrawlState === 'queued'
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 28,
                      padding: '0 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      border: '1px solid var(--border-strong)',
                      background:
                        venueRecrawlState === 'queued'
                          ? 'rgba(255,170,0,0.1)'
                          : 'transparent',
                      color:
                        venueRecrawlState === 'triggering' ||
                        venueRecrawlState === 'queued'
                          ? 'var(--fg-subtle)'
                          : 'var(--fg)',
                      cursor:
                        venueRecrawlState === 'triggering' ||
                        venueRecrawlState === 'queued'
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {venueRecrawlState === 'triggering'
                      ? 'Triggering…'
                      : venueRecrawlState === 'queued'
                        ? 'Queued'
                        : 'Re-crawl'}
                  </button>
                </div>
              }
            >
              {activeRun ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <code
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {shortRunId(activeRun.id)}
                    </code>
                    <StatusBadge
                      kind={STATUS_KIND[activeRun.status] ?? 'neutral'}
                      dot
                    >
                      {activeRun.status}
                    </StatusBadge>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 16,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      {
                        label: 'Started',
                        value: `${fmtTimeMT(activeRun.createdAt)} MT`,
                      },
                      {
                        label: 'Duration',
                        value: activeRun.durationMs
                          ? `${(activeRun.durationMs / 1000).toFixed(1)}s`
                          : '—',
                      },
                      {
                        label: 'HTTP',
                        value: activeRun.httpStatusCode
                          ? String(activeRun.httpStatusCode)
                          : '—',
                      },
                      {
                        label: 'LLM Cost',
                        value:
                          activeRun.llmCostUsd != null
                            ? `$${activeRun.llmCostUsd.toFixed(2)}`
                            : '$0.00',
                      },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                            color: 'var(--fg-subtle)',
                            marginBottom: 4,
                          }}
                        >
                          {stat.label}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--fg)',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{ marginBottom: activeRun.errorMessage ? 14 : 0 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        color: 'var(--fg-subtle)',
                        marginBottom: 4,
                      }}
                    >
                      Events
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--fg)' }}>
                      <span style={{ fontWeight: 600 }}>
                        {activeRun.eventsFound}
                      </span>
                      <span style={{ color: 'var(--fg-muted)' }}>
                        {' '}
                        found ·{' '}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {activeRun.eventsInserted}
                      </span>
                      <span style={{ color: 'var(--fg-muted)' }}>
                        {' '}
                        inserted
                      </span>
                    </div>
                  </div>
                  {activeRun.errorMessage && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(184,56,26,0.08)',
                        border: '1px solid rgba(184,56,26,0.2)',
                        color: 'var(--danger)',
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                        wordBreak: 'break-all' as const,
                      }}
                    >
                      {activeRun.errorMessage}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                  No runs yet
                </div>
              )}
              {venueRecrawlError && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(184,56,26,0.08)',
                    color: 'var(--danger)',
                    fontSize: 12,
                  }}
                >
                  {venueRecrawlError}
                </div>
              )}
            </Panel>

            <Panel title="Run history" padding={0}>
              <AdminTable>
                <THead>
                  <tr>
                    <TH>Run</TH>
                    <TH>Started</TH>
                    <TH>Status</TH>
                    <TH align="right" mono>
                      Events
                    </TH>
                    <TH align="right" mono>
                      Duration
                    </TH>
                    <TH align="right" mono>
                      LLM cost
                    </TH>
                  </tr>
                </THead>
                <tbody>
                  {selectedRuns.map((run) => (
                    <TR
                      key={run.id}
                      active={run.id === activeRunId}
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <TD color="var(--fg-muted)">
                        <code
                          style={{
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {shortRunId(run.id)}
                        </code>
                      </TD>
                      <TD color="var(--fg-muted)">
                        {fmtTimeMT(run.createdAt)} MT
                      </TD>
                      <TD>
                        <StatusBadge
                          kind={STATUS_KIND[run.status] ?? 'neutral'}
                        >
                          {run.status}
                        </StatusBadge>
                      </TD>
                      <TD align="right" mono>
                        {run.eventsFound}
                      </TD>
                      <TD align="right" mono color="var(--fg-muted)">
                        {run.durationMs
                          ? `${(run.durationMs / 1000).toFixed(1)}s`
                          : '—'}
                      </TD>
                      <TD align="right">
                        <CostText value={run.llmCostUsd ?? 0} />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </AdminTable>
            </Panel>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--fg-muted)',
              fontSize: 14,
            }}
          >
            Select a venue to inspect
          </div>
        )}
      </div>
    </div>
  )
}
