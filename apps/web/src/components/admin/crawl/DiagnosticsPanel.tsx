'use client'

import {
  AlertCircle,
  AlertTriangle,
  User,
  Play,
  RefreshCw,
  FileEdit,
} from 'lucide-react'
import { StatusBadge, AdminButton } from '@/components/admin/primitives'

export interface CrawlRunForDiagnostics {
  id: string
  status: string
  httpStatusCode: number | null
  errorMessage: string | null
  consecutiveFailures: number
  strategy: string
  venueName: string
  websiteUrl: string
}

export interface StrategyHistoryEntry {
  at: string
  strategy: string
  outcome: 'success' | 'failed' | 'partial'
  events: number
  note?: string
}

type ErrorClass =
  | 'bot_detection'
  | 'rate_limit'
  | 'parse_failure'
  | 'timeout'
  | 'unknown'

const ERROR_REASONS: Record<ErrorClass, { label: string; body: string }> = {
  bot_detection: {
    label: 'Bot detection or IP blocking',
    body: '403 from this venue usually means their edge layer (Cloudflare or similar) is denying the request. Could be IP-rate-based, user-agent fingerprinting, or a JS challenge.',
  },
  rate_limit: {
    label: 'Rate limiting',
    body: '429 means the venue is rate-limiting requests. Backing off the schedule or staggering with a delay is usually enough.',
  },
  parse_failure: {
    label: 'Parse failure',
    body: "The page returned 200 but the parser couldn't find the expected structure. Likely a layout change, schema.org markup removed, or a new template.",
  },
  timeout: {
    label: 'Timeout',
    body: 'Request did not complete in time. Often a JavaScript-heavy page that Playwright is struggling to render fully.',
  },
  unknown: {
    label: 'Unclassified failure',
    body: "The error doesn't match a known pattern. Open the raw response and inspect manually.",
  },
}

interface DiagOption {
  id: string
  iconName: string
  recommended: boolean
  title: string
  body: string
  cta: string
}

const DIAG_OPTIONS: Record<ErrorClass, DiagOption[]> = {
  bot_detection: [
    {
      id: 'opt-headers',
      iconName: 'FileEdit',
      recommended: true,
      title: 'Add custom request headers',
      body: 'Send a browser-like User-Agent + Accept-Language. Lowest-impact change.',
      cta: 'Stage header swap',
    },
    {
      id: 'opt-playwright',
      iconName: 'Play',
      recommended: false,
      title: 'Switch to Playwright with a real session',
      body: 'Solve a JS challenge once, persist cookies, then re-use the session. Higher LLM cost.',
      cta: 'Stage Playwright run',
    },
    {
      id: 'opt-manual',
      iconName: 'User',
      recommended: false,
      title: 'Mark venue as manual entry',
      body: 'Stop crawling. Events for this venue will be added by the admin only.',
      cta: 'Stage manual mode',
    },
  ],
  rate_limit: [
    {
      id: 'opt-delay',
      iconName: 'RefreshCw',
      recommended: true,
      title: 'Increase request delay to 8s',
      body: 'Slows the sweep but stays under typical 10 req/min limits.',
      cta: 'Stage delay 8s',
    },
    {
      id: 'opt-sched',
      iconName: 'RefreshCw',
      recommended: false,
      title: 'Reduce schedule to every 12h',
      body: 'Half as many requests per day.',
      cta: 'Stage schedule',
    },
  ],
  parse_failure: [
    {
      id: 'opt-llm',
      iconName: 'FileEdit',
      recommended: true,
      title: 'Switch to LLM extraction',
      body: 'Fallback while the page template stabilizes. Cost goes up.',
      cta: 'Stage LLM strategy',
    },
    {
      id: 'opt-struct',
      iconName: 'FileEdit',
      recommended: false,
      title: 'Refresh selector hints',
      body: 'Re-train the structured extractor against the current DOM.',
      cta: 'Stage retrain',
    },
  ],
  timeout: [
    {
      id: 'opt-pw',
      iconName: 'Play',
      recommended: true,
      title: 'Increase render timeout to 30s',
      body: 'Gives heavy pages more room to settle.',
      cta: 'Stage timeout 30s',
    },
    {
      id: 'opt-wait',
      iconName: 'RefreshCw',
      recommended: false,
      title: 'Wait for selector instead of load',
      body: 'Stop waiting on the full load event; key off `.event-card`.',
      cta: 'Stage selector wait',
    },
  ],
  unknown: [
    {
      id: 'opt-manual',
      iconName: 'User',
      recommended: true,
      title: 'Mark venue as manual entry',
      body: 'Stop crawling and rely on admin entry.',
      cta: 'Stage manual mode',
    },
  ],
}

function classifyError(run: CrawlRunForDiagnostics): ErrorClass {
  if (run.httpStatusCode === 403 || run.httpStatusCode === 429) {
    return run.httpStatusCode === 429 ? 'rate_limit' : 'bot_detection'
  }
  if (run.errorMessage?.toLowerCase().includes('timeout')) return 'timeout'
  if (run.errorMessage?.toLowerCase().includes('parse')) return 'parse_failure'
  return 'unknown'
}

const ICON_MAP: Record<string, React.ComponentType<{ size: number }>> = {
  FileEdit,
  Play,
  RefreshCw,
  User,
}

const DiagIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = ICON_MAP[name]
  return Icon ? <Icon size={size} /> : null
}

interface OptionCardProps {
  opt: DiagOption
  staged: boolean
  onStage: (id: string) => void
  onApply: (id: string) => void
  onDiscard: () => void
}

const OptionCard = ({
  opt,
  staged,
  onStage,
  onApply,
  onDiscard,
}: OptionCardProps) => {
  return (
    <div
      style={{
        padding: '14px 14px 12px',
        background: staged
          ? 'color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))'
          : 'var(--bg-elevated)',
        border: `1px solid ${staged ? 'color-mix(in oklab, var(--signal) 40%, transparent)' : 'var(--border)'}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: opt.recommended
              ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
              : 'var(--surface-1)',
            color: opt.recommended ? 'var(--signal)' : 'var(--fg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DiagIcon name={opt.iconName} size={13} />
        </div>
        <span
          style={{
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--fg)',
            flex: 1,
          }}
        >
          {opt.title}
        </span>
        {opt.recommended && (
          <StatusBadge kind="signal" variant="mono">
            rec.
          </StatusBadge>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--admin-font, Inter, sans-serif)',
          fontSize: 11,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          paddingLeft: 32,
        }}
      >
        {opt.body}
      </div>
      <div style={{ paddingLeft: 32, marginTop: 10 }}>
        {staged ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge kind="signal" dot>
              Staged
            </StatusBadge>
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => onApply(opt.id)}
            >
              Apply
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={onDiscard}>
              Discard
            </AdminButton>
          </div>
        ) : (
          <AdminButton
            variant={opt.recommended ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStage(opt.id)}
          >
            {opt.cta}
          </AdminButton>
        )}
      </div>
    </div>
  )
}

interface DiagnosticsPanelProps {
  run: CrawlRunForDiagnostics
  stagedId: string | null
  onStage: (id: string) => void
  onApply: (id: string) => void
  onDiscard: () => void
  historyEntries?: StrategyHistoryEntry[]
}

export const DiagnosticsPanel = ({
  run,
  stagedId,
  onStage,
  onApply,
  onDiscard,
  historyEntries = [],
}: DiagnosticsPanelProps) => {
  const errClass = classifyError(run)
  const reason = ERROR_REASONS[errClass]
  const opts = DIAG_OPTIONS[errClass]

  return (
    <div
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      {/* What happened */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--danger)',
            marginBottom: 8,
          }}
        >
          What happened
        </div>
        <div
          style={{
            padding: '14px 16px',
            background:
              'color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))',
            border:
              '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <AlertCircle size={16} color="var(--danger)" />
            <span
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--danger)',
              }}
            >
              {run.errorMessage ?? `HTTP ${run.httpStatusCode ?? '—'}`}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, auto)',
              gap: 14,
              paddingLeft: 26,
            }}
          >
            {[
              { label: 'HTTP status', value: run.httpStatusCode ?? '—' },
              { label: 'Error class', value: errClass.replace(/_/g, ' ') },
              { label: 'Strategy', value: run.strategy },
              {
                label: 'Consecutive',
                value: `${run.consecutiveFailures} of 4`,
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
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--fg)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why it happened */}
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
          Why it probably happened
        </div>
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
            }}
          >
            <AlertTriangle size={14} color="var(--warning)" />
            <span
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg)',
              }}
            >
              {reason.label}
            </span>
            <StatusBadge kind="neutral" variant="mono">
              rule-based
            </StatusBadge>
          </div>
          <div
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 12,
              color: 'var(--fg-muted)',
              lineHeight: 1.55,
              paddingLeft: 24,
            }}
          >
            {reason.body}
          </div>
        </div>
      </div>

      {/* Options */}
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
          Options · next steps
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {opts.map((opt) => (
            <OptionCard
              key={opt.id}
              opt={opt}
              staged={stagedId === opt.id}
              onStage={onStage}
              onApply={onApply}
              onDiscard={onDiscard}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            background: 'var(--surface-1)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 8,
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 11,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          Staged options are{' '}
          <strong style={{ color: 'var(--fg)' }}>not auto-applied</strong>.
          You&apos;ll review the diff and confirm before any change touches the
          worker config.
        </div>
      </div>

      {/* Strategy history */}
      {historyEntries.length > 0 && (
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
            Strategy history
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--bg-elevated)',
            }}
          >
            {[...historyEntries].reverse().map((entry, idx) => {
              const outcomeKind: 'success' | 'danger' | 'warning' | 'neutral' =
                entry.outcome === 'success'
                  ? 'success'
                  : entry.outcome === 'failed'
                    ? 'danger'
                    : 'warning'
              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto auto',
                    gap: 14,
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom:
                      idx < historyEntries.length - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    background:
                      idx === 0
                        ? 'color-mix(in oklab, var(--danger) 5%, transparent)'
                        : 'transparent',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: 'var(--fg-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.at}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--admin-font, Inter, sans-serif)',
                      fontSize: 12,
                      color: 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {entry.note ?? '—'}
                  </span>
                  <StatusBadge kind="signal" variant="outline">
                    {entry.strategy === 'structured_data'
                      ? 'structured'
                      : entry.strategy}
                  </StatusBadge>
                  <StatusBadge kind={outcomeKind} dot>
                    {entry.outcome}
                  </StatusBadge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
