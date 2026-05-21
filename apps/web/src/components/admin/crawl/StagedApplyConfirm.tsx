'use client'

import { AdminButton } from '@/components/admin/primitives'
import { StatusBadge } from '@/components/admin/primitives'

interface ConfigDiffEntry {
  path: string
  before: string
  after: string
}

export interface StagedDiff {
  title: string
  intent: string
  diff: ConfigDiffEntry[]
  risks: string[]
  rollback: string
  nextRunIn: string
}

const STAGED_DIFFS: Record<string, StagedDiff> = {
  'opt-headers': {
    title: 'Add custom request headers',
    intent:
      "Try to look more like a real browser so the venue's edge layer stops blocking us.",
    diff: [
      {
        path: 'headers.User-Agent',
        before: 'ConcertCrawl/1.0',
        after:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko)',
      },
      {
        path: 'headers.Accept-Language',
        before: '(unset)',
        after: 'en-US,en;q=0.9',
      },
    ],
    risks: [
      "If the venue rolls out a tighter bot policy, this stops working on its own — won't break the consumer app.",
    ],
    rollback: 'One click to revert from the strategy history log.',
    nextRunIn: 'next scheduled sweep · ~2h',
  },
  'opt-delay': {
    title: 'Increase request delay to 8s',
    intent: 'Slow the sweep to stay under typical 10 req/min rate limits.',
    diff: [{ path: 'request.delay_ms', before: '1500', after: '8000' }],
    risks: ['Sweep takes ~5× longer; LLM cost per sweep is unchanged.'],
    rollback: 'Revert from the strategy history log.',
    nextRunIn: 'next scheduled sweep · ~2h',
  },
  'opt-llm': {
    title: 'Switch to LLM extraction',
    intent:
      'Use the LLM to parse the page while the structured-data template stabilizes.',
    diff: [
      {
        path: 'extraction.strategy',
        before: 'structured_data',
        after: 'llm',
      },
      {
        path: 'extraction.model',
        before: '(n/a)',
        after: 'claude-haiku-4-5',
      },
      { path: 'budget.per_run_max_usd', before: '$0.00', after: '$0.60' },
    ],
    risks: [
      'LLM cost jumps from $0 to ~$0.40/run for this venue.',
      'Confidence scores drop; expect a flag spike in Review.',
    ],
    rollback: 'Revert from the strategy history log.',
    nextRunIn: 'manual re-crawl now, or next scheduled sweep',
  },
  'opt-playwright': {
    title: 'Switch to Playwright with a real session',
    intent:
      'Solve a JS challenge once, persist cookies, then re-use the session.',
    diff: [
      { path: 'extraction.mode', before: 'fetch', after: 'playwright' },
      { path: 'session.persist_cookies', before: 'false', after: 'true' },
    ],
    risks: [
      'Higher LLM cost per run.',
      'Session may expire and require re-solving.',
    ],
    rollback: 'Revert from the strategy history log.',
    nextRunIn: 'trigger manual re-crawl now',
  },
  'opt-manual': {
    title: 'Mark venue as manual entry',
    intent: 'Stop crawling and rely on admin entry for this venue.',
    diff: [{ path: 'venue.crawl_mode', before: 'auto', after: 'manual' }],
    risks: [
      'Events will stop being automatically discovered.',
      'Requires manual admin updates to keep event listings current.',
    ],
    rollback: 'Change crawl_mode back to auto from the venue settings.',
    nextRunIn: 'no further crawls scheduled',
  },
}

interface StagedApplyConfirmProps {
  stagedId: string
  venueName: string
  onCancel: () => void
  onApply: () => void
}

export const StagedApplyConfirm = ({
  stagedId,
  venueName,
  onCancel,
  onApply,
}: StagedApplyConfirmProps) => {
  const diff = STAGED_DIFFS[stagedId] ?? STAGED_DIFFS['opt-headers']
  if (!diff) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 640,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--signal)',
              }}
            >
              Applying staged change
            </span>
            <StatusBadge kind="signal" variant="mono">
              {stagedId}
            </StatusBadge>
          </div>
          <h3
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {diff.title}
          </h3>
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 12,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            on <strong style={{ color: 'var(--fg)' }}>{venueName}</strong>. The
            change writes to the worker config and is picked up on the next
            crawl.
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Intent */}
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
              Why this change
            </div>
            <div
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 13,
                color: 'var(--fg)',
                lineHeight: 1.55,
              }}
            >
              {diff.intent}
            </div>
          </div>

          {/* Config diff */}
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
              Config diff
            </div>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--surface-1)',
              }}
            >
              {diff.diff.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr',
                    gap: 12,
                    padding: '10px 14px',
                    borderBottom:
                      idx < diff.diff.length - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--fg-muted)',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.path}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        color: 'var(--danger)',
                        background:
                          'color-mix(in oklab, var(--danger) 6%, transparent)',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>−</span>
                      <span style={{ wordBreak: 'break-all' as const }}>
                        {entry.before}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        color: 'var(--success)',
                        background:
                          'color-mix(in oklab, var(--success) 6%, transparent)',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>+</span>
                      <span style={{ wordBreak: 'break-all' as const }}>
                        {entry.after}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risks + rollback */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--warning)',
                  marginBottom: 6,
                }}
              >
                Risks
              </div>
              <ul
                style={{
                  margin: '0',
                  paddingLeft: 18,
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.55,
                }}
              >
                {diff.risks.map((risk, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
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
                Rollback
              </div>
              <div
                style={{
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.55,
                }}
              >
                {diff.rollback}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--fg-subtle)',
                  marginBottom: 6,
                }}
              >
                Next run
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--fg)',
                  fontWeight: 600,
                }}
              >
                {diff.nextRunIn}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--surface-1)',
          }}
        >
          <div style={{ marginRight: 'auto' }} />
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={onApply}>
            Apply change
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
