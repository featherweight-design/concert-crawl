'use client'

import Link from 'next/link'
import { type FC } from 'react'
import type { SourceCategory, Tier, Vendor } from '@concert-crawl/types'
import { REVIEW_CONTEST_COPY } from './definitions/copy'
import { formatPriceRange } from './lib/format-price-range'

// Mirrors the per-row payload returned by GET /v1/admin/contests/prices
// (apps/api/src/routes/admin/contests.ts line ~133). Price-min/max stay as
// strings because they're Postgres `decimal` columns — parsing happens at
// the display layer so cents survive the round trip.
export interface PriceContestRow {
  contestId: string
  eventId: string
  eventTitle: string
  venueName: string
  eventDate: string
  tier: Tier
  sourceCategory: SourceCategory | null
  parent: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    lastUpdatedAt: string
    note: string | null
  }
  counter: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    note: string | null
  }
  filedAt: string
}

interface PriceDisputesQueueProps {
  items: ReadonlyArray<PriceContestRow>
  // Total open-contest count from the paginated API envelope
  // (`{ items, total, limit, offset }`). Required — `items.length` is
  // capped by `limit` (default 20) so using it for the header badge
  // under-reports once contests exceed one page. The Contests tab pill
  // pulls from `counts.priceContests` (the same true total), so reading
  // `total` here keeps the two surfaces in agreement.
  total: number
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
} as const

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

export const PriceDisputesQueue: FC<PriceDisputesQueueProps> = ({
  items,
  total,
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
        {/*
          Sort + All-disputes ghost buttons are LOCKED to deferred per spec
          §7.8 (sort = filed-at asc, no UI affordance for v1). When the
          follow-up PR adds them, slot the buttons in here on the right
          side of the header (flex space-between leaves room).
        */}
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
            <PriceDisputesQueueRow key={row.contestId} row={row} />
          ))}
        </tbody>
      </table>
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
  children: React.ReactNode
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

      {/* Counter cell — design property table §2 lines 75–80. Price + azure
          pending badge + attribution line. The counter is by definition
          status='pending' (queue query filters on that), so the badge
          renders unconditionally. */}
      <DataCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriceRangeText
            floor={row.counter.priceMin}
            ceiling={row.counter.priceMax}
          />
          <StatusBadge kind="azure">
            {REVIEW_CONTEST_COPY.queue.badges.pending}
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

      {/* Filed cell — design property table §2 lines 81–83. Renders the
          raw ISO string for now; v1 spec is "ISO timestamp; relative
          time polish is follow-up". The mono/letterSpacing font keeps
          the typography pinned for when RelTime swaps in. */}
      <DataCell>
        <time
          dateTime={row.filedAt}
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {row.filedAt}
        </time>
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
