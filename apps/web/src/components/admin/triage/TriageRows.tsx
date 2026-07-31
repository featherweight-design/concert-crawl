'use client'

// The two row types and the strip that heads them.
//
// Both rows are a single Next.js `<Link>` with a composed `aria-label`. The
// chevron "Open run" affordance inside is NOT separately focusable — one tab
// stop per row, on mobile and desktop alike, which is what keeps the focus
// order (Refresh → faults in order → queues in order) short enough to be
// usable with a keyboard.

import Link from 'next/link'

import { ADMIN_COPY } from '../definitions/copy'
import { MonoLabel } from '../primitives'
import { EvidenceBars } from './EvidenceBars'
import {
  CONDITION_META,
  GLYPH_ICONS,
  QUEUE_GLYPH,
  sevTint,
  type TriageGlyph,
} from './definitions/meta'
import { ADMIN_FONT, ADMIN_MONO, SR_ONLY } from './definitions/styles'
import type { TriageFault, TriageQueue } from './definitions/types'
import { faultHref, queueHref } from './lib/deep-links'
import { evidenceLines } from './lib/evidence-lines'

const TRIAGE = ADMIN_COPY.triage

const SR = ({ children }: { children: React.ReactNode }) => (
  <span style={SR_ONLY}>{children}</span>
)

// ---------------------------------------------------------------- TierStrip

interface TierStripProps {
  label: string
  count: number
  /** Severity ink. Omitted on the queues strip, which is not a severity. */
  ink?: string
  /** Suppresses the top border on the first strip in the panel body. */
  first?: boolean
}

export const TierStrip = ({ label, count, ink, first }: TierStripProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 18px',
      background: 'var(--surface-1)',
      borderTop: first ? 'none' : '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
    }}
  >
    {ink !== undefined && (
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 3, background: ink }}
      />
    )}
    <h3 style={{ margin: 0 }}>
      <MonoLabel color="var(--fg-muted)">{label}</MonoLabel>
    </h3>
    <span style={{ marginLeft: 'auto' }}>
      <MonoLabel color="var(--fg-subtle)">{count}</MonoLabel>
    </span>
  </div>
)

// --------------------------------------------------------------- ActionLink

// Presentational only — the whole row is the link, so this is aria-hidden and
// its label is folded into the row's accessible name instead.
const ActionLink = ({
  label,
  compact,
}: {
  label: string
  compact: boolean
}) => {
  const Chevron = GLYPH_ICONS.chevR
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minHeight: 44,
        minWidth: compact ? 44 : 0,
        padding: '0 2px',
        fontFamily: ADMIN_FONT,
        fontSize: 11.5,
        fontWeight: 700,
        color: 'var(--signal)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <Chevron size={12} strokeWidth={2.1} />
    </span>
  )
}

// ------------------------------------------------------------- GlyphTile

const GlyphTile = ({
  glyph,
  ink,
}: {
  glyph: TriageGlyph
  ink: { ink: string; fill: string; edge: string }
}) => {
  const Icon = GLYPH_ICONS[glyph]
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ink.ink,
        background: ink.fill,
        border: `1px solid ${ink.edge}`,
      }}
    >
      <Icon size={15} strokeWidth={1.7} />
    </span>
  )
}

// ------------------------------------------------------------ Persistence

const persistenceValueStyle = {
  fontFamily: ADMIN_MONO,
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.01em',
} as const

// ---------------------------------------------------------------- FaultRow

interface FaultRowProps {
  fault: TriageFault
  compact: boolean
  /** True in the banded presentation, where line 3 is dropped on mobile. */
  dense: boolean
}

export const FaultRow = ({ fault, compact, dense }: FaultRowProps) => {
  const { band, venue, dur } = fault
  const tint = sevTint(band)
  const meta = CONDITION_META[fault.condition]
  const condition = TRIAGE.conditions[fault.condition]
  const lines = evidenceLines(fault)

  const label = TRIAGE.a11y.rowLabel(
    venue,
    condition.verb,
    lines.stat,
    dur,
    band,
  )

  return (
    <Link
      href={faultHref(fault)}
      aria-label={label}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: compact ? '28px 1fr auto' : '28px 1fr auto 96px',
        columnGap: 12,
        rowGap: 0,
        alignItems: 'start',
        padding: compact ? '13px 14px 13px 15px' : '13px 18px 13px 15px',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${tint.ink}`,
        background: 'transparent',
        cursor: 'pointer',
        minHeight: 44,
        outlineOffset: -2,
        textDecoration: 'none',
      }}
    >
      <GlyphTile glyph={meta.glyph} ink={tint} />

      <span style={{ minWidth: 0 }}>
        {/* Line 1 — who, and what kind of wrong */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: ADMIN_FONT,
              fontSize: 13.5,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {venue}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 7px',
              borderRadius: 4,
              fontFamily: ADMIN_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              lineHeight: '15px',
              whiteSpace: 'nowrap',
              color: tint.ink,
              background: tint.fill,
              border: `1px solid ${tint.edge}`,
            }}
          >
            {condition.label}
          </span>
          <SR>{`${TRIAGE.a11y.severity[band]}.`}</SR>
          {compact && (
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 4,
                justifyContent: 'flex-end',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={persistenceValueStyle}>{dur}</span>
            </span>
          )}
        </span>

        {/* Line 2 — the figure that earns the row */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: ADMIN_MONO,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--fg)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.01em',
            }}
          >
            {lines.stat}
          </span>
          {lines.series !== undefined && lines.series.length > 0 && (
            <EvidenceBars
              series={lines.series}
              tone={tint.ink}
              width={compact ? 62 : 74}
              label={TRIAGE.a11y.evidenceChart(
                lines.series.length,
                lines.series,
                lines.series[lines.series.length - 1] ?? 0,
              )}
            />
          )}
        </span>

        {/* Line 3 — the context that makes the figure mean something. Dropped
            only when the panel is both banded and on a phone, where sixteen
            three-line rows would bury the bands that order them. */}
        {!(compact && dense) && (
          <span
            style={{
              display: 'block',
              fontFamily: ADMIN_FONT,
              fontSize: 11.5,
              color: 'var(--fg-muted)',
              marginTop: 3,
              lineHeight: 1.45,
              textWrap: 'pretty',
            }}
          >
            {lines.detail}
          </span>
        )}
      </span>

      <span style={{ alignSelf: 'center' }}>
        <ActionLink label={TRIAGE.actions[meta.action]} compact={compact} />
      </span>

      {!compact && (
        <span
          style={{ alignSelf: 'center', textAlign: 'right', display: 'block' }}
        >
          <span style={{ display: 'block' }}>
            <MonoLabel color="var(--fg-subtle)" size={9}>
              {TRIAGE.persistence.label}
            </MonoLabel>
          </span>
          <span style={{ ...persistenceValueStyle, display: 'block' }}>
            {dur}
          </span>
        </span>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------- QueueRow

export const QueueRow = ({
  queue,
  compact,
}: {
  queue: TriageQueue
  compact: boolean
}) => {
  const copy = TRIAGE.queues[queue.kind]
  const title = copy.title(queue.count)
  const Icon = GLYPH_ICONS[QUEUE_GLYPH[queue.kind]]

  return (
    <Link
      href={queueHref(queue)}
      aria-label={TRIAGE.a11y.queueRowLabel(title)}
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        columnGap: 12,
        alignItems: 'center',
        padding: compact ? '11px 14px' : '11px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
        cursor: 'pointer',
        minHeight: 44,
        outlineOffset: -2,
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <Icon size={13} strokeWidth={1.7} />
      </span>

      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: ADMIN_FONT,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--fg)',
            lineHeight: 1.35,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: ADMIN_FONT,
            fontSize: 11,
            color: 'var(--fg-subtle)',
            marginTop: 2,
            lineHeight: 1.4,
            textWrap: 'pretty',
          }}
        >
          {copy.detail(queue.breakdown)}
        </span>
      </span>

      <ActionLink label={TRIAGE.actions[queue.action]} compact={compact} />
    </Link>
  )
}
