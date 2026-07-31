'use client'

// The admin dashboard's "Needs attention" panel (#1215).
//
// Replaces a hand-rolled feed that capped itself at three failing venues. It
// does not cap: every fault the API reports is rendered, and past `denseAt`
// the presentation switches to severity bands so a long list stays readable
// rather than being truncated into a lie.
//
// Ordering is the server's — band, then persistence. There is no client-side
// sort. Re-sorting here would let the panel and the API disagree about which
// fault is worst, and the API is the one with the data to decide.

import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { ADMIN_COPY } from '../definitions/copy'
import { AdminButton, MonoLabel, Panel, StatusBadge } from '../primitives'
import { FaultRow, QueueRow, TierStrip } from './TriageRows'
import { BAND_KEYS, DENSE_AT, GLYPH_ICONS, SEVERITY } from './definitions/meta'
import { ADMIN_FONT, ADMIN_MONO, SR_ONLY } from './definitions/styles'
import type { TriageBand, TriageData, TriageFault } from './definitions/types'
import { useIsCompact } from './lib/use-is-compact'

const TRIAGE = ADMIN_COPY.triage

interface TriagePanelProps {
  /**
   * `null` means the triage fetch failed or returned something unparseable.
   * The panel degrades to a short explanation instead of throwing, because
   * the dashboard's other fetches re-throw and one bad health check should
   * not take the whole admin page to `error.tsx`.
   */
  data: TriageData | null
  /** Fault count at which the panel switches to banded presentation. */
  denseAt?: number
}

// -------------------------------------------------------------- sub-pieces

const CheckTile = ({
  size,
  iconSize,
  bordered,
}: {
  size: number
  iconSize: number
  bordered: boolean
}) => {
  const Check = GLYPH_ICONS.check
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: bordered ? 10 : size / 2,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--success)',
        background: `color-mix(in oklab, var(--success) ${bordered ? 14 : 16}%, transparent)`,
        ...(bordered && {
          border:
            '1px solid color-mix(in oklab, var(--success) 32%, transparent)',
        }),
      }}
    >
      <Check size={iconSize} strokeWidth={2.2} />
    </span>
  )
}

const ModelNote = () => (
  <p
    style={{
      margin: 0,
      padding: '9px 18px',
      borderBottom: '1px solid var(--border)',
      fontFamily: ADMIN_FONT,
      fontSize: 11,
      color: 'var(--fg-subtle)',
      lineHeight: 1.4,
    }}
  >
    {TRIAGE.model}
  </p>
)

const FaultsClearStrip = ({ venues, at }: { venues: number; at: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 18px',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <CheckTile size={22} iconSize={12} bordered={false} />
    <span
      style={{
        fontFamily: ADMIN_FONT,
        fontSize: 12.5,
        color: 'var(--fg)',
        textWrap: 'pretty',
      }}
    >
      {TRIAGE.empty.faultsClearStrip(venues, at)}
    </span>
  </div>
)

const TriageEmpty = ({
  venues,
  at,
  events,
  next,
  compact,
}: {
  venues: number
  at: string
  events: number
  next: string
  compact: boolean
}) => (
  <div
    style={{
      display: 'flex',
      gap: compact ? 12 : 16,
      alignItems: 'flex-start',
      padding: compact ? '20px 16px' : '26px 22px',
    }}
  >
    <CheckTile size={34} iconSize={19} bordered />
    <div style={{ minWidth: 0 }}>
      <MonoLabel color="var(--success)">{TRIAGE.empty.eyebrow}</MonoLabel>
      <p
        style={{
          margin: 0,
          marginTop: 6,
          fontFamily: ADMIN_FONT,
          fontSize: compact ? 16 : 18,
          fontWeight: 700,
          color: 'var(--fg)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}
      >
        {TRIAGE.empty.title}
      </p>
      <p
        style={{
          margin: 0,
          marginTop: 6,
          fontFamily: ADMIN_FONT,
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          maxWidth: 420,
          textWrap: 'pretty',
        }}
      >
        {TRIAGE.empty.body(venues, at, events)}
      </p>
      <div style={{ marginTop: 10 }}>
        <MonoLabel color="var(--fg-subtle)">
          {TRIAGE.empty.aside(next)}
        </MonoLabel>
      </div>
    </div>
  </div>
)

const Degraded = () => (
  <div style={{ padding: '20px 18px' }}>
    <p
      style={{
        margin: 0,
        fontFamily: ADMIN_FONT,
        fontSize: 13.5,
        fontWeight: 700,
        color: 'var(--fg)',
        letterSpacing: '-0.01em',
      }}
    >
      {TRIAGE.degraded.title}
    </p>
    <p
      style={{
        margin: 0,
        marginTop: 6,
        fontFamily: ADMIN_FONT,
        fontSize: 12.5,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        maxWidth: 420,
        textWrap: 'pretty',
      }}
    >
      {TRIAGE.degraded.body}
    </p>
  </div>
)

const SummaryBadge = ({
  faultCount,
  queueTotal,
  topBand,
}: {
  faultCount: number
  queueTotal: number
  topBand: TriageBand | null
}) => {
  // Branch on the fault count alone. Keying this on `topBand` too would let a
  // bandless fault fall through to the queue or all-clear badge, captioning a
  // visible list of faults as "all clear" — the exact reassuring-but-wrong
  // summary this panel replaced.
  if (faultCount > 0) {
    const kind =
      topBand === 'loss'
        ? 'warning'
        : topBand === 'suspect'
          ? 'accent'
          : 'danger'
    return (
      <StatusBadge kind={kind} mono>
        {TRIAGE.panel.faultCount(faultCount)}
      </StatusBadge>
    )
  }
  if (queueTotal > 0) {
    return (
      <StatusBadge kind="neutral" mono>
        {TRIAGE.panel.queueCount(queueTotal)}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge kind="success" mono dot>
      {TRIAGE.panel.allClear}
    </StatusBadge>
  )
}

// ------------------------------------------------------------------- panel

export const TriagePanel = ({ data, denseAt = DENSE_AT }: TriagePanelProps) => {
  const compact = useIsCompact()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const refresh = () => {
    // `router.refresh()` re-runs the dashboard server component, which
    // re-fetches triage on the server. Wrapping it in a transition is what
    // makes `isPending` a real "checking…" signal rather than a fake timer.
    startTransition(() => router.refresh())
  }

  const faults: TriageFault[] = data?.faults ?? []
  const queues = data?.queues ?? []
  const queueTotal = queues.reduce((sum, queue) => sum + queue.count, 0)
  // Read off the wire, not re-derived from the condition — the API decides
  // which band a condition lands in and may move one without a UI deploy.
  const topBand: TriageBand | null = faults[0]?.band ?? null
  const dense = faults.length >= denseAt
  const nothing = faults.length === 0 && queues.length === 0

  const announcement =
    data === null
      ? TRIAGE.a11y.degraded
      : isPending
        ? TRIAGE.a11y.checking
        : TRIAGE.a11y.announce(faults.length, queueTotal)

  const header = (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: ADMIN_FONT,
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        {TRIAGE.panel.title}
      </h2>
      {data !== null && (
        <SummaryBadge
          faultCount={faults.length}
          queueTotal={queueTotal}
          topBand={topBand}
        />
      )}
    </div>
  )

  const refreshLabel = isPending
    ? TRIAGE.panel.refreshing
    : TRIAGE.panel.refresh

  const action = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 10,
      }}
    >
      {!compact && data !== null && (
        <span style={{ fontFamily: ADMIN_MONO }}>
          <MonoLabel color="var(--fg-subtle)">
            {TRIAGE.panel.syncedAt(data.sweep.at)}
          </MonoLabel>
        </span>
      )}
      <AdminButton
        variant="ghost"
        size="sm"
        icon={RefreshCw}
        onClick={refresh}
        disabled={isPending}
        style={{
          minHeight: 44,
          minWidth: 44,
          padding: compact ? 0 : '0 10px',
          borderRadius: 8,
          color: 'var(--fg)',
          opacity: isPending ? 0.45 : 1,
        }}
      >
        {compact ? <span style={SR_ONLY}>{refreshLabel}</span> : refreshLabel}
      </AdminButton>
    </div>
  )

  const rows = (fault: TriageFault) => (
    <FaultRow key={fault.id} fault={fault} compact={compact} dense={dense} />
  )

  return (
    <Panel title={header} action={action} padding={0}>
      <div aria-live="polite" aria-atomic="true" style={SR_ONLY}>
        {announcement}
      </div>

      {data === null && <Degraded />}

      {data !== null && nothing && (
        <TriageEmpty
          venues={data.sweep.venues}
          at={data.sweep.at}
          events={data.sweep.events}
          next={data.sweep.next}
          compact={compact}
        />
      )}

      {faults.length > 0 && !dense && (
        <>
          <TierStrip
            first
            label={TRIAGE.tiers.faults}
            count={faults.length}
            {...(topBand !== null && { ink: SEVERITY[topBand].ink })}
          />
          {faults.map(rows)}
          <ModelNote />
        </>
      )}

      {faults.length > 0 && dense && (
        <>
          {BAND_KEYS.filter((band) =>
            faults.some((fault) => fault.band === band),
          ).map((band, index) => {
            const inBand = faults.filter((fault) => fault.band === band)
            return (
              <div key={band}>
                <TierStrip
                  {...(index === 0 && { first: true })}
                  label={TRIAGE.bands[band]}
                  count={inBand.length}
                  ink={SEVERITY[band].ink}
                />
                {inBand.map(rows)}
              </div>
            )
          })}
          <ModelNote />
        </>
      )}

      {data !== null && faults.length === 0 && queues.length > 0 && (
        <FaultsClearStrip venues={data.sweep.venues} at={data.sweep.at} />
      )}

      {queues.length > 0 && (
        <>
          <TierStrip label={TRIAGE.tiers.queues} count={queueTotal} />
          {queues.map((queue) => (
            <QueueRow key={queue.id} queue={queue} compact={compact} />
          ))}
        </>
      )}
    </Panel>
  )
}
