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
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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
  'bot_detection' | 'rate_limit' | 'parse_failure' | 'timeout' | 'unknown'

const ERROR_REASONS = ADMIN_COPY.crawl.diagnostics.errorReasons

interface DiagOption {
  id: string
  iconName: string
  recommended: boolean
  title: string
  body: string
  cta: string
}

const DIAG_OPTIONS: Record<ErrorClass, readonly DiagOption[]> =
  ADMIN_COPY.crawl.diagnostics.diagOptions

function getErrLabel(run: CrawlRunForDiagnostics): string {
  if (run.httpStatusCode === 403)
    return ADMIN_COPY.crawl.diagnostics.errLabels.http403
  if (run.httpStatusCode === 429)
    return ADMIN_COPY.crawl.diagnostics.errLabels.http429
  if (run.errorMessage?.toLowerCase().includes('timeout'))
    return ADMIN_COPY.crawl.diagnostics.errLabels.timeout
  if (run.errorMessage)
    return run.errorMessage.split('\n')[0] ?? run.errorMessage
  return `HTTP ${run.httpStatusCode ?? '—'}`
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
            {ADMIN_COPY.crawl.diagnostics.badgeRec}
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
              {ADMIN_COPY.crawl.diagnostics.badgeStaged}
            </StatusBadge>
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => onApply(opt.id)}
            >
              {ADMIN_COPY.crawl.diagnostics.buttonApply}
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={onDiscard}>
              {ADMIN_COPY.crawl.diagnostics.buttonDiscard}
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
          {ADMIN_COPY.crawl.diagnostics.whatHappenedLabel}
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
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--danger)',
              }}
            >
              {getErrLabel(run)}
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
              {
                label: ADMIN_COPY.crawl.diagnostics.statHttpStatus,
                value: run.httpStatusCode ?? '—',
              },
              {
                label: ADMIN_COPY.crawl.diagnostics.statErrorClass,
                value: errClass.replace(/_/g, ' '),
              },
              {
                label: ADMIN_COPY.crawl.diagnostics.statStrategy,
                value: run.strategy,
              },
              {
                label: ADMIN_COPY.crawl.diagnostics.statConsecutive,
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
          {ADMIN_COPY.crawl.diagnostics.whyHappenedLabel}
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
              {ADMIN_COPY.crawl.diagnostics.badgeRuleBased}
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
          {ADMIN_COPY.crawl.diagnostics.optionsLabel}
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
            {ADMIN_COPY.crawl.diagnostics.strategyHistoryLabel}
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
