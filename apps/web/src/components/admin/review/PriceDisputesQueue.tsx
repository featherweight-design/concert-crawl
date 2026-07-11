'use client'

import Link from 'next/link'
import { type FC, type ReactNode, useState } from 'react'
import { RelTime } from '@/components/admin/primitives'
import { REVIEW_CONTEST_COPY } from './definitions/copy'
import { formatPriceRange } from './lib/format-price-range'
// Type lives in the query module — hooks own the API contract, components
// import the type (see admin-contests.ts header comment). Keeping the
// direction one-way prevents circular imports if this component ever needs
// to reach back into the query layer.
import type { PriceContestRow } from '@/lib/queries/admin-contests'

interface PriceDisputesQueueProps {
  items: ReadonlyArray<PriceContestRow>
  // Total open-contest count from the paginated API envelope
  // (`{ items, total, limit, offset }`). Required — `items.length` is
  // capped by `limit` (default 20) so using it for the header badge
  // under-reports once contests exceed one page. The Contests tab pill
  // pulls from `counts.priceContests` (the same true total), so reading
  // `total` here keeps the two surfaces in agreement.
  total: number
  // Header ghost buttons (#758). Optional so the queue can render without
  // the affordances (e.g. embedded previews / existing tests); the
  // Contests tab always wires them. Each button renders only when its
  // handler is provided.
  sortDirection?: 'asc' | 'desc'
  onSortToggle?: () => void
  showAllDisputes?: boolean
  onShowAllToggle?: () => void
  // Pagination footer slot (#759) — rendered inside the panel below the
  // table so the footer inherits the panel's border radius / overflow.
  footer?: ReactNode
}

// Inter font stack repeated across the panel + cells. Pulled out so the
// design tokens stay legible inline.
const INTER = 'Inter, system-ui'
const MONO = "'JetBrains Mono', monospace"

// Status badge — mirrors `AdminStatusBadge` from the design source
// (admin-queues.jsx:32). Kind values used here: `warning` (open-count
// pill), `gold` (box-office), `azure` (pending counter). Inlined rather
// than imported because the design source explicitly notes the canvas
// version conflicts with consumer theme tokens — we render against the
// admin theme's CSS variables (`--warning`, `--fg-on-accent`, etc.).
const PALETTES = {
  warning: {
    fg: 'var(--warning)',
    bg: 'color-mix(in oklab, var(--warning) 16%, transparent)',
    bd: 'color-mix(in oklab, var(--warning) 35%, transparent)',
  },
  // GOLD_Q from admin-queues.jsx:29 — used directly here (literal, not a
  // CSS var) so the badge matches the design source pixel-for-pixel. The
  // alpha-mix syntax keeps the token rule consistent with the warning
  // palette above.
  gold: {
    fg: 'oklch(0.66 0.14 78)',
    bg: 'color-mix(in oklab, oklch(0.66 0.14 78) 18%, transparent)',
    bd: 'color-mix(in oklab, oklch(0.66 0.14 78) 50%, transparent)',
  },
  // AZ_Q from admin-queues.jsx:28 — same pattern as `gold`.
  azure: {
    fg: 'oklch(0.62 0.12 240)',
    bg: 'color-mix(in oklab, oklch(0.62 0.12 240) 16%, transparent)',
    bd: 'color-mix(in oklab, oklch(0.62 0.12 240) 40%, transparent)',
  },
  // Muted pill for non-pending counter statuses (archived / stale /
  // corroborated / disputed) surfaced by the "All disputes" scope (#758).
  // Not in the design source — the queue design only shows open contests —
  // so it reuses the token mix pattern with the muted foreground.
  neutral: {
    fg: 'var(--fg-muted)',
    bg: 'color-mix(in oklab, var(--fg-muted) 12%, transparent)',
    bd: 'color-mix(in oklab, var(--fg-muted) 30%, transparent)',
  },
} as const

// Counter-status → badge palette. Pending keeps the design's azure pill;
// everything else (only reachable via the all-history scope) goes neutral.
const counterBadgeKind = (
  status: PriceContestRow['counter']['status'],
): BadgeKind => (status === 'pending' ? 'azure' : 'neutral')

type BadgeKind = keyof typeof PALETTES

const StatusBadge: FC<{ kind: BadgeKind; children: string }> = ({
  kind,
  children,
}) => {
  const palette = PALETTES[kind]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 4,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: '0.06em',
        fontWeight: 700,
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// Ghost button — mirrors `AdminBtn` variant="ghost" from the design source
// (admin-queues.jsx ~line 90): transparent background + border, fg-muted
// text, size sm (h 28 / px 10 / fs 12). The pressed state (All disputes
// active, or hover) lifts the text to full foreground so the toggle state
// is visible without inventing a filled variant the design doesn't have.
const GhostButton: FC<{
  children: string
  onClick: () => void
  ariaLabel: string
  pressed?: boolean
}> = ({ children, onClick, ariaLabel, pressed }) => {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset',
        // `all: unset` also wipes the UA focus ring; revert restores the
        // browser's native :focus-visible outline so keyboard users get a
        // visible affordance (PR #889 R1).
        outline: 'revert',
        cursor: 'pointer',
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 7,
        background: 'transparent',
        color: pressed || hover ? 'var(--fg)' : 'var(--fg-muted)',
        border: `1px solid ${pressed ? 'var(--border-strong)' : 'transparent'}`,
        fontFamily: INTER,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
        transition: 'color .12s, border-color .12s',
      }}
    >
      {children}
    </button>
  )
}

export const PriceDisputesQueue: FC<PriceDisputesQueueProps> = ({
  items,
  total,
  sortDirection = 'asc',
  onSortToggle,
  showAllDisputes = false,
  onShowAllToggle,
  footer,
}) => {
  // Auto-hide on empty — design property table §1 line 15. The tab pill
  // (separate ReviewTabs surface) still shows (0); this panel renders
  // nothing rather than an "empty" message.
  if (items.length === 0) return null

  return (
    <section
      // Outer panel chrome — design property table §1 lines 34–37
      // (panel.background / border / borderRadius / overflow).
      style={{
        background: 'var(--bg-elevated, var(--bg))',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: INTER,
      }}
    >
      <header
        // Panel header — design property table §1 lines 30–33
        // (header.padding / layout / borderBottom / background).
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3
            // Title font — design property table §1 lines 16–19.
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              margin: 0,
            }}
          >
            {REVIEW_CONTEST_COPY.queue.heading}
          </h3>
          <StatusBadge kind="warning">
            {REVIEW_CONTEST_COPY.queue.countBadge(total)}
          </StatusBadge>
        </div>
        {/* Sort + All-disputes ghost buttons (#758) — design source
            admin-queues.jsx `action` slot. Each renders only when its
            handler is wired (the Contests tab always wires both). */}
        {(onSortToggle || onShowAllToggle) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onSortToggle && (
              <GhostButton
                onClick={onSortToggle}
                ariaLabel={REVIEW_CONTEST_COPY.queue.sortButtonAriaLabel(
                  sortDirection,
                )}
              >
                {REVIEW_CONTEST_COPY.queue.sortButton(sortDirection)}
              </GhostButton>
            )}
            {onShowAllToggle && (
              <GhostButton
                onClick={onShowAllToggle}
                pressed={showAllDisputes}
                ariaLabel={REVIEW_CONTEST_COPY.queue.allDisputesAriaLabel}
              >
                {REVIEW_CONTEST_COPY.queue.allDisputesButton}
              </GhostButton>
            )}
          </div>
        )}
      </header>
      <table
        // Table chrome — design property table §1 line 38, design
        // admin-queues.jsx:112–118.
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: INTER,
        }}
      >
        <thead>
          <tr>
            <ColumnHeader>
              {REVIEW_CONTEST_COPY.queue.columnHeaders.event}
            </ColumnHeader>
            <ColumnHeader>
              {REVIEW_CONTEST_COPY.queue.columnHeaders.original}
            </ColumnHeader>
            <ColumnHeader>
              {REVIEW_CONTEST_COPY.queue.columnHeaders.counter}
            </ColumnHeader>
            <ColumnHeader>
              {REVIEW_CONTEST_COPY.queue.columnHeaders.filed}
            </ColumnHeader>
            {/* Actions column — design property table §1 line 38,
                admin-queues.jsx:250 — empty header, width 120, right
                aligned. */}
            <ColumnHeader align="right" width={120}>
              {REVIEW_CONTEST_COPY.queue.columnHeaders.actions}
            </ColumnHeader>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            // Keyed on the COUNTER id, not contestId (= parent id): the
            // all-history scope can surface multiple resolved counters
            // against the same parent, and contestId would collide.
            <PriceDisputesQueueRow key={row.counter.id} row={row} />
          ))}
        </tbody>
      </table>
      {footer}
    </section>
  )
}

const ColumnHeader: FC<{
  children: string
  align?: 'left' | 'right'
  width?: number
}> = ({ children, align = 'left', width }) => (
  <th
    scope="col"
    style={{
      // Cell padding + font — design property table §1 lines 39–43.
      padding: '10px 14px',
      textAlign: align,
      width,
      fontFamily: MONO,
      fontSize: 9.5,
      color: 'var(--fg-subtle)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 700,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)',
    }}
  >
    {children}
  </th>
)

// Reusable td chrome — pinned to design property table §1 lines 44–47
// (td.padding / td.font / td.color.default / td.borderBottom).
const DataCell: FC<{
  children: ReactNode
  align?: 'left' | 'right'
}> = ({ children, align = 'left' }) => (
  <td
    style={{
      padding: '12px 14px',
      textAlign: align,
      verticalAlign: 'middle',
      color: 'var(--fg)',
      fontSize: 13,
      fontFamily: INTER,
      borderBottom: '1px solid var(--border)',
    }}
  >
    {children}
  </td>
)

const PriceRangeText: FC<{ floor: string; ceiling: string | null }> = ({
  floor,
  ceiling,
}) => (
  // Design property table §2 lines 65–66 — price font is Inter 14/700
  // tabular-nums letterSpacing -0.01em.
  <span
    style={{
      fontFamily: INTER,
      fontWeight: 700,
      fontSize: 14,
      color: 'var(--fg)',
      letterSpacing: '-0.01em',
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {formatPriceRange(floor, ceiling)}
  </span>
)

const handleOrAnon = (handle: string | null): string =>
  handle ?? REVIEW_CONTEST_COPY.queue.anonymousHandle

const PriceDisputesQueueRow: FC<{ row: PriceContestRow }> = ({ row }) => {
  const isBoxOffice = row.sourceCategory === 'boxoffice'
  return (
    <tr>
      {/* Event cell — design property table §2 lines 56–63. Title (Inter
          13.5/700) + venue·date subtitle (mono 10, fg-subtle). */}
      <DataCell>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13.5,
            color: 'var(--fg)',
          }}
        >
          {row.eventTitle}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
            marginTop: 2,
          }}
        >
          {row.venueName} · {row.eventDate}
        </div>
      </DataCell>

      {/* Original cell — design property table §2 lines 64–74. Price +
          conditional gold box-office badge + attribution line. */}
      <DataCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriceRangeText
            floor={row.parent.priceMin}
            ceiling={row.parent.priceMax}
          />
          {isBoxOffice && (
            <StatusBadge kind="gold">
              {REVIEW_CONTEST_COPY.queue.badges.boxOffice}
            </StatusBadge>
          )}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: MONO,
            fontSize: 9.5,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {REVIEW_CONTEST_COPY.queue.attribution(
            handleOrAnon(row.parent.submitter.handle),
            row.parent.confirms.fans,
          )}
        </div>
      </DataCell>

      {/* Counter cell — design property table §2 lines 75–80. Price +
          status badge + attribution line. On the default scope the badge
          is always the azure "pending" pill (the list query filters on
          it); the all-history scope (#758) surfaces resolved counters,
          whose statuses render as neutral pills. */}
      <DataCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriceRangeText
            floor={row.counter.priceMin}
            ceiling={row.counter.priceMax}
          />
          <StatusBadge kind={counterBadgeKind(row.counter.status)}>
            {REVIEW_CONTEST_COPY.queue.badges[row.counter.status]}
          </StatusBadge>
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: MONO,
            fontSize: 9.5,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {REVIEW_CONTEST_COPY.queue.attribution(
            handleOrAnon(row.counter.submitter.handle),
            row.counter.confirms.fans,
          )}
        </div>
      </DataCell>

      {/* Filed cell — design property table §2 lines 81–83, relative time
          per the design source's example values ("1h ago", "2d ago") —
          #757. RelTime (shared admin primitive) renders the <time> element
          and owns the fg-muted color + tabular-nums; the wrapping span
          pins the rest of the typography (mono 10 / 0.04em) so the cell
          matches the pre-swap design table values. */}
      <DataCell>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.04em',
          }}
        >
          <RelTime iso={row.filedAt} />
        </span>
      </DataCell>

      {/* Action cell — design property table §2 lines 84–93. Outline-style
          button; render as a Next.js <Link> (not an onClick handler) so
          right-click/cmd-click/keyboard navigation all work without
          extra wiring. Per memory:feedback_shadcn_button_asChild, the
          base-ui Button has no `asChild` prop, so we style the anchor
          directly with the outline tokens from admin-queues.jsx:91. */}
      <DataCell align="right">
        <Link
          href={`/admin/review/contests/${row.contestId}`}
          aria-label={REVIEW_CONTEST_COPY.row.resolveAriaLabel(row.eventTitle)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 28,
            padding: '0 10px',
            borderRadius: 7,
            background: 'transparent',
            color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
            fontFamily: INTER,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          {REVIEW_CONTEST_COPY.row.resolveLabel}
        </Link>
      </DataCell>
    </tr>
  )
}
