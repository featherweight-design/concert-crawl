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
  RelTime,
  CostText,
} from '@/components/admin/primitives'
import type { CrawlRun } from '@concert-crawl/types'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
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
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  async function handleTrigger(venueId: string) {
    setTriggering(venueId)
    setTriggerError(null)
    try {
      const res = await fetch(`/api/admin/crawl/${venueId}`, { method: 'POST' })
      if (!res.ok) {
        const rawBody: unknown = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(rawBody, `HTTP ${res.status}`))
      }
    } catch (err) {
      setTriggerError(
        err instanceof Error ? err.message : 'Crawl trigger failed',
      )
    } finally {
      setTriggering(null)
    }
  }

  const selected = initialStatus.find((row) => row.venueId === selectedId)
  const selectedRuns = initialRuns.filter((run) => run.venueId === selectedId)

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
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fg-muted)',
          }}
        >
          {initialStatus.length} venues
        </div>
        {initialStatus.map((row) => (
          <button
            key={row.venueId}
            onClick={() => setSelectedId(row.venueId)}
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
                {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : 'never'} ·{' '}
                {row.eventsFound} ev
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
                <button
                  onClick={() => handleTrigger(selected.venueId)}
                  disabled={triggering === selected.venueId}
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
                    background: 'transparent',
                    color:
                      triggering === selected.venueId
                        ? 'var(--fg-subtle)'
                        : 'var(--fg)',
                    cursor:
                      triggering === selected.venueId
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {triggering === selected.venueId ? 'Triggering…' : 'Re-crawl'}
                </button>
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16,
                }}
              >
                {[
                  {
                    label: 'Status',
                    value: (
                      <StatusBadge
                        kind={STATUS_KIND[selected.status] ?? 'neutral'}
                        dot
                      >
                        {selected.status}
                      </StatusBadge>
                    ),
                  },
                  { label: 'Events found', value: selected.eventsFound },
                  { label: 'Strategy', value: selected.strategy },
                  {
                    label: 'LLM cost',
                    value: <CostText value={selected.cost} />,
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div
                      style={{
                        fontSize: 11,
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
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
              {selected.error && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(184,56,26,0.08)',
                    color: 'var(--danger)',
                    fontSize: 12,
                  }}
                >
                  {selected.error}
                </div>
              )}
              {triggerError && (
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
                  {triggerError}
                </div>
              )}
            </Panel>

            <Panel title="Run history" padding={0}>
              <AdminTable>
                <THead>
                  <tr>
                    <TH>Started</TH>
                    <TH>Status</TH>
                    <TH>Strategy</TH>
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
                    <TR key={run.id}>
                      <TD color="var(--fg-muted)">
                        {run.startedAt ? (
                          <RelTime iso={run.startedAt} />
                        ) : (
                          <RelTime iso={run.createdAt} />
                        )}
                      </TD>
                      <TD>
                        <StatusBadge
                          kind={STATUS_KIND[run.status] ?? 'neutral'}
                        >
                          {run.status}
                        </StatusBadge>
                      </TD>
                      <TD color="var(--fg-muted)">
                        {run.extractionStrategyUsed ?? '—'}
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
