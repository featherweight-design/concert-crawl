'use client'

import { useState, useEffect, useRef } from 'react'
import { ExternalLink, RefreshCw, Filter } from 'lucide-react'
import { useAdminVenueRuns } from '@/lib/queries/use-admin-venue-runs'
import { useTriggerVenueCrawl } from '@/lib/queries/use-admin-crawl-trigger'
import {
  StatusBadge,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  CostText,
} from '@/components/admin/primitives'
import type { CrawlRun } from '@concert-crawl/types'
import { formatCostValue } from '@/app/(protected)/admin/crawl/crawl-stats'

const MT_TIMEZONE = 'America/Denver'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string
  lastRunStatus: string
  lastRunAt: string | null
  eventsFound: number
  eventsInserted: number
  eventsUpdated: number
  llmCostUsd: number | null
  durationMs: number | null
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
  strategy: string
  error: string | null
}

interface Props {
  initialStatus: CrawlStatusRow[]
  initialRuns: CrawlRun[]
  initialSelectedId?: string
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

function fmtDateTimeMT(iso: string): string {
  const date = new Date(iso)
  const nowDateMT = new Date().toLocaleDateString('en-US', {
    timeZone: MT_TIMEZONE,
  })
  const thisDateMT = date.toLocaleDateString('en-US', {
    timeZone: MT_TIMEZONE,
  })
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: MT_TIMEZONE,
  })
  if (thisDateMT === nowDateMT) {
    return `Today, ${timePart}`
  }
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: MT_TIMEZONE,
  })
  return `${datePart}, ${timePart}`
}

function shortRunId(id: string): string {
  return `R-${id.replace(/-/g, '').slice(0, 8)}`
}

interface ErrorBlockProps {
  errorMessage: string
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
}

function ErrorBlock({
  errorMessage,
  httpStatusCode,
  consecutiveFailures,
  blockedAt,
}: ErrorBlockProps) {
  const isHttpBlock =
    httpStatusCode !== null &&
    (httpStatusCode === 403 || httpStatusCode === 429)

  const title = isHttpBlock
    ? `HTTP ${httpStatusCode} · venue blocked`
    : 'Crawl failed'

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--fg-subtle)',
          marginBottom: 6,
        }}
      >
        Error
      </div>
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(184,56,26,0.08)',
          border: '1px solid rgba(184,56,26,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ color: 'var(--danger)', fontSize: 14, flexShrink: 0 }}>
            ⊘
          </span>
          <span
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}
          >
            {title}
          </span>
        </div>
        {isHttpBlock && (
          <div style={{ paddingLeft: 22 }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--fg-muted)',
                margin: '2px 0',
              }}
            >
              Consecutive failures: {consecutiveFailures}
              {consecutiveFailures >= 2
                ? ' · Will pause venue on next failure.'
                : '.'}
            </p>
            {blockedAt && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  margin: '2px 0',
                }}
              >
                HTTP {httpStatusCode} first observed:{' '}
                {new Date(blockedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: MT_TIMEZONE,
                })}{' '}
                · Try requesting a new IP allowlist.
              </p>
            )}
          </div>
        )}
        {!isHttpBlock && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              wordBreak: 'break-all' as const,
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
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

  function selectVenue(venueId: string | null) {
    setSelectedId(venueId)
  }
  const [statusFilter, setStatusFilter] = useState('')
  const [venueNameFilter, setVenueNameFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [recrawlState, setRecrawlState] = useState<
    Record<string, 'triggering' | 'queued' | 'error'>
  >({})
  const [recrawlError, setRecrawlError] = useState<Record<string, string>>({})
  const triggerCrawl = useTriggerVenueCrawl()
  const { data: venueRuns = [], isLoading: venueRunsLoading } =
    useAdminVenueRuns(selectedId)

  // Sync selectedId when IssuesBanner navigates to a new venueId via router.push
  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setSelectedId(initialSelectedId)
    }
  }, [initialSelectedId])

  // Close filter panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

  const filteredStatus = initialStatus.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false
    if (
      venueNameFilter &&
      !row.venueName.toLowerCase().includes(venueNameFilter.toLowerCase())
    )
      return false
    return true
  })

  const filtersActive = statusFilter !== '' || venueNameFilter !== ''

  // Clear selection when the active filter hides the currently selected venue
  useEffect(() => {
    if (
      selectedId &&
      !filteredStatus.some((row) => row.venueId === selectedId)
    ) {
      selectVenue(null)
    }
  }, [statusFilter, venueNameFilter, filteredStatus, selectedId, setSelectedId])

  async function handleTrigger(venueId: string) {
    setRecrawlState((prev) => ({ ...prev, [venueId]: 'triggering' }))
    setRecrawlError((prev) => {
      const next = { ...prev }
      delete next[venueId]
      return next
    })
    try {
      await triggerCrawl.mutateAsync(venueId)
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

  const selected = initialStatus.find((row) => row.venueId === selectedId)
  const activeRun =
    (selectedId ? venueRuns[0] : null) ??
    initialRuns.find((run) => run.venueId === selectedId) ??
    null

  const venueRecrawlState = selectedId ? recrawlState[selectedId] : undefined
  const venueRecrawlError = selectedId ? recrawlError[selectedId] : undefined

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        overflow: 'hidden',
      }}
    >
      {/* Split view — left rail + right inspector share one unified outer border */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 460px) minmax(0, 1fr)',
          height: 560,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Left rail */}
        <div
          style={{
            borderRight: '1px solid var(--border)',
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
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--bg-elevated)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--fg-muted)',
              }}
            >
              Latest run · per venue{' '}
              <span style={{ fontWeight: 700, color: 'var(--fg)' }}>
                {filteredStatus.length}
              </span>
            </span>
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
                Filter
              </button>
              {filterOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 10,
                    width: 220,
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
                        textTransform: 'uppercase',
                        color: 'var(--fg-subtle)',
                        marginBottom: 4,
                      }}
                    >
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(ev) => setStatusFilter(ev.target.value)}
                      style={{
                        width: '100%',
                        fontSize: 12,
                        color: 'var(--fg)',
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 8px',
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
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--fg-subtle)',
                        marginBottom: 4,
                      }}
                    >
                      Venue
                    </label>
                    <input
                      type="text"
                      placeholder="Search venues…"
                      value={venueNameFilter}
                      onChange={(ev) => setVenueNameFilter(ev.target.value)}
                      style={{
                        width: '100%',
                        fontSize: 12,
                        color: 'var(--fg)',
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {filtersActive && (
                    <button
                      onClick={() => {
                        setStatusFilter('')
                        setVenueNameFilter('')
                      }}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--fg-muted)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {filteredStatus.map((row) => (
            <button
              key={row.venueId}
              id={`venue-row-${row.venueId}`}
              onClick={() => selectVenue(row.venueId)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
                background:
                  row.venueId === selectedId
                    ? 'var(--surface-2)'
                    : 'transparent',
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
                  {' · '}
                  <span
                    style={{
                      color:
                        row.eventsFound > 0
                          ? 'var(--fg-muted)'
                          : 'var(--fg-subtle)',
                    }}
                  >
                    {row.eventsFound} ev
                  </span>
                </div>
              </div>
              <StatusBadge
                kind={STATUS_KIND[row.lastRunStatus] ?? 'neutral'}
                dot={row.lastRunStatus !== 'never'}
              >
                {row.lastRunStatus.charAt(0).toUpperCase() +
                  row.lastRunStatus.slice(1)}
              </StatusBadge>
            </button>
          ))}
        </div>

        {/* Right inspector */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {selected ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: '16px 22px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                  flexShrink: 0,
                }}
              >
                {activeRun && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
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
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>
                      ·
                    </span>
                    <StatusBadge
                      kind={STATUS_KIND[activeRun.status] ?? 'neutral'}
                      dot
                    >
                      {activeRun.status.charAt(0).toUpperCase() +
                        activeRun.status.slice(1)}
                    </StatusBadge>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap' as const,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: 'var(--fg)',
                      lineHeight: 1.2,
                    }}
                  >
                    {selected.venueName}
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selected.websiteUrl && (
                      <a
                        href={selected.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 32,
                          padding: '0 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          border: '1px solid var(--border)',
                          color: 'var(--fg-muted)',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={15} />
                        Source URL
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
                        height: 32,
                        padding: '0 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        background:
                          venueRecrawlState === 'triggering' ||
                          venueRecrawlState === 'queued'
                            ? 'var(--fg-subtle)'
                            : 'var(--signal)',
                        color: 'var(--signal-fg, #0f172a)',
                        cursor:
                          venueRecrawlState === 'triggering' ||
                          venueRecrawlState === 'queued'
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      <RefreshCw size={15} />
                      {venueRecrawlState === 'triggering'
                        ? 'Triggering…'
                        : venueRecrawlState === 'queued'
                          ? 'Queued'
                          : 'Re-crawl'}
                    </button>
                  </div>
                </div>
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
              </div>

              {/* Vitals */}
              {activeRun && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 0,
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                >
                  {[
                    {
                      label: 'Started',
                      value: fmtDateTimeMT(
                        activeRun.startedAt ?? activeRun.createdAt,
                      ),
                      danger: false,
                    },
                    {
                      label: 'Duration',
                      value: activeRun.durationMs
                        ? `${(activeRun.durationMs / 1000).toFixed(1)}s`
                        : '—',
                      danger: false,
                    },
                    {
                      label: 'HTTP',
                      value: activeRun.httpStatusCode
                        ? String(activeRun.httpStatusCode)
                        : '—',
                      danger:
                        activeRun.httpStatusCode !== null &&
                        activeRun.httpStatusCode >= 400,
                    },
                    {
                      label: 'LLM Cost',
                      value: formatCostValue(activeRun.llmCostUsd),
                      danger: false,
                    },
                  ].map((stat, idx) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: '14px 18px',
                        borderRight:
                          idx < 3 ? '1px solid var(--border)' : 'none',
                      }}
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
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: stat.danger ? 'var(--danger)' : 'var(--fg)',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              <div
                style={{
                  padding: activeRun ? '20px 22px' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {activeRun ? (
                  <>
                    {/* Events mini cards */}
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase' as const,
                          color: 'var(--fg-subtle)',
                          marginBottom: 10,
                        }}
                      >
                        Events
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 12,
                        }}
                      >
                        {[
                          {
                            label: 'Found',
                            value: activeRun.eventsFound as string | number,
                            color:
                              activeRun.eventsFound > 0
                                ? 'var(--fg)'
                                : 'var(--fg-subtle)',
                          },
                          {
                            label: 'Created',
                            value: activeRun.eventsInserted as string | number,
                            color:
                              activeRun.eventsInserted > 0
                                ? 'var(--success)'
                                : 'var(--fg-subtle)',
                          },
                          {
                            label: 'Updated',
                            value: activeRun.eventsUpdated as string | number,
                            color:
                              activeRun.eventsUpdated > 0
                                ? 'var(--fg)'
                                : 'var(--fg-subtle)',
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 8,
                              background: 'var(--surface-1)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 22,
                                fontWeight: 700,
                                color: stat.color,
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {stat.value}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase' as const,
                                color: 'var(--fg-subtle)',
                                marginTop: 4,
                              }}
                            >
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Error block */}
                    {activeRun.errorMessage && (
                      <ErrorBlock
                        errorMessage={activeRun.errorMessage}
                        httpStatusCode={activeRun.httpStatusCode}
                        consecutiveFailures={selected.consecutiveFailures}
                        blockedAt={selected.blockedAt}
                      />
                    )}

                    {/* Source preview */}
                    {selected.websiteUrl && (
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                            color: 'var(--fg-subtle)',
                            marginBottom: 8,
                          }}
                        >
                          Source
                        </div>
                        <div
                          style={{
                            padding: '12px 14px',
                            background: 'var(--surface-1)',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              color: 'var(--fg-subtle)',
                              flexShrink: 0,
                            }}
                          >
                            ↗
                          </span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              color: 'var(--fg-muted)',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' as const,
                            }}
                          >
                            {selected.websiteUrl}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Strategy */}
                    {selected.strategy && selected.strategy !== '—' && (
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                            color: 'var(--fg-subtle)',
                            marginBottom: 8,
                          }}
                        >
                          Strategy
                        </div>
                        <StatusBadge
                          kind={
                            selected.strategy === 'structured'
                              ? 'signal'
                              : selected.strategy === 'llm'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {selected.strategy}
                        </StatusBadge>
                      </div>
                    )}
                  </>
                ) : !venueRunsLoading ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: '40px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <RefreshCw size={22} style={{ opacity: 0.35 }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--fg-muted)',
                          marginBottom: 4,
                        }}
                      >
                        No runs yet
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                        Hit Re-crawl to trigger the first run for this venue.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
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

      {/* Run history — seamlessly joined inside the same outer container */}
      <CrawlRunHistoryTable
        runs={selectedId ? venueRuns : initialRuns}
        loading={venueRunsLoading}
        selectedVenueName={selected?.venueName ?? null}
      />
    </div>
  )
}

export const CrawlRunHistoryTable = ({
  runs: displayRuns,
  loading = false,
  selectedVenueName,
}: {
  runs: CrawlRun[]
  loading?: boolean
  selectedVenueName?: string | null
}) => {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
          Run history
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--fg-subtle)',
            fontWeight: 400,
          }}
        >
          {selectedVenueName ? (
            <>
              <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>
                {selectedVenueName}
              </span>
              {' · '}
            </>
          ) : null}
          {loading ? 'loading…' : `showing ${displayRuns.length}`}
        </span>
      </div>

      {displayRuns.length === 0 && !loading ? (
        <div
          style={{
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--fg-subtle)',
            fontSize: 13,
          }}
        >
          <RefreshCw size={28} style={{ opacity: 0.4 }} />
          No runs yet — trigger a crawl to see history here
        </div>
      ) : (
        <div style={{ minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
          <AdminTable>
            <THead sticky>
              <tr>
                <TH width={92}>Run</TH>
                <TH>Venue</TH>
                <TH>Started</TH>
                <TH>Duration</TH>
                <TH>Status</TH>
                <TH>Strategy</TH>
                <TH align="right">Events</TH>
                <TH align="right">LLM cost</TH>
                <TH>Error</TH>
              </tr>
            </THead>
            <tbody>
              {displayRuns.map((run) => (
                <TR key={run.id}>
                  <TD mono color="var(--fg-muted)">
                    {shortRunId(run.id)}
                  </TD>
                  <TD>
                    <span style={{ fontWeight: 600 }}>
                      {run.venueName ?? '—'}
                    </span>
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {fmtDateTimeMT(run.startedAt ?? run.createdAt)}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {run.durationMs
                      ? `${(run.durationMs / 1000).toFixed(1)}s`
                      : '—'}
                  </TD>
                  <TD>
                    <StatusBadge
                      kind={STATUS_KIND[run.status] ?? 'neutral'}
                      dot
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <StatusBadge
                      kind={
                        run.extractionStrategyUsed === 'structured'
                          ? 'signal'
                          : run.extractionStrategyUsed === 'llm'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {run.extractionStrategyUsed ?? '—'}
                    </StatusBadge>
                  </TD>
                  <TD
                    align="right"
                    mono
                    color={run.eventsFound ? 'var(--fg)' : 'var(--fg-subtle)'}
                  >
                    {run.eventsFound ?? '—'}
                  </TD>
                  <TD align="right">
                    <CostText value={run.llmCostUsd ?? 0} />
                  </TD>
                  <TD
                    color={
                      run.errorMessage ? 'var(--danger)' : 'var(--fg-subtle)'
                    }
                  >
                    {run.errorMessage ? (
                      <span style={{ fontSize: 12 }}>{run.errorMessage}</span>
                    ) : (
                      '—'
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        </div>
      )}
    </div>
  )
}

export const CrawlRunAllButton = () => {
  const [state, setState] = useState<
    'idle' | 'triggering' | 'queued' | 'error'
  >('idle')

  async function handleRunAll() {
    setState('triggering')
    try {
      const res = await fetch('/api/admin/crawl/run-all', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('queued')
      setTimeout(() => setState('idle'), 5000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const label =
    state === 'triggering'
      ? 'Queuing…'
      : state === 'queued'
        ? 'Queued ✓'
        : state === 'error'
          ? 'Error — retry?'
          : 'Run all'

  return (
    <button
      onClick={handleRunAll}
      disabled={state === 'triggering' || state === 'queued'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        border: '1px solid var(--border-strong)',
        background: state === 'queued' ? 'rgba(47,122,77,0.1)' : 'transparent',
        color:
          state === 'queued'
            ? 'var(--success)'
            : state === 'error'
              ? 'var(--danger)'
              : 'var(--fg)',
        cursor:
          state === 'triggering' || state === 'queued'
            ? 'not-allowed'
            : 'pointer',
      }}
    >
      <RefreshCw size={15} />
      {label}
    </button>
  )
}
