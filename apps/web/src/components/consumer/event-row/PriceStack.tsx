import type React from 'react'
import { EVENT_ROW_COPY as copy } from './definitions/copy'
import { formatDollars } from '@/components/consumer/definitions/lib'
import { RowMetaChip } from './RowMetaChip'
import { SURFACES, type RowSurface } from './definitions/surfaces'
import { deltaClass } from './lib/price-delta'
import { resolveRowStatus } from './lib/row-status'
import type { EventRowShow } from './lib/row-model'

interface PriceStackProps {
  show: EventRowShow
  surface: RowSurface
  narrow: boolean
}

const DeltaArrow = ({ up }: { up: boolean }) => (
  <svg
    width={9}
    height={9}
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden
    focusable="false"
    style={{ transform: up ? 'rotate(180deg)' : undefined }}
  >
    <path
      d="M5 1v8M5 9L1.8 5.8M5 9l3.2-3.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * The price reads the same on every surface. Only the delta is surface-gated,
 * and deliberately so: Browse fixtures do carry a `saved` price, so gating on
 * the data instead would put a green "down $12" on a row where the user never
 * saved anything.
 */
export const PriceStack = ({ show, surface, narrow }: PriceStackProps) => {
  const minWidth = narrow ? 56 : 78
  const amountSize = narrow ? 15 : 16.5
  const status = resolveRowStatus(show.lifecycle, show.status)

  const slot = (children: React.ReactNode) => (
    <div
      className="flex shrink-0 items-center justify-end"
      style={{ minWidth }}
    >
      {children}
    </div>
  )

  // Cancelled and postponed take the price slot rather than a meta chip, and
  // that is why they can never be dropped: the slot sits outside the chip
  // budget and outside MetaRow's fit pass. They are the one thing that names
  // which problem the dim and the strike are gesturing at.
  if (status === 'cancelled') {
    return slot(
      <span data-testid="row-cancelled">
        <RowMetaChip
          label={copy.status.cancelled}
          srLabel={copy.a11y.cancelled}
          tone="warn"
        />
      </span>,
    )
  }

  if (status === 'postponed') {
    return slot(
      <span data-testid="row-postponed">
        <RowMetaChip
          label={copy.status.postponed}
          srLabel={copy.a11y.postponed}
          tone="strong"
        />
      </span>,
    )
  }

  // Rule 2's one exemption: sold out takes the price slot outright rather than
  // winning a chip, so it spends no chip budget. The artwork dims, not the row
  // — a row-level opacity drags --fg-muted toward the AA floor.
  if (status === 'soldout') {
    return slot(
      <span data-testid="row-sold-out">
        <RowMetaChip label={copy.price.soldOut} tone="warn" />
      </span>,
    )
  }

  if (show.price === null) {
    return slot(
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.04em',
        }}
      >
        {copy.price.tba}
      </span>,
    )
  }

  const delta =
    SURFACES[surface].showsDelta && show.saved !== null
      ? show.price.amount - show.saved.price
      : null
  const cls = delta === null ? null : deltaClass(delta)

  return slot(
    <div className="flex flex-col items-end" style={{ gap: 2 }}>
      <span
        className="flex items-baseline whitespace-nowrap"
        style={{ gap: 3 }}
      >
        {/* formatDollars turns 0 into the Free label, and "from Free" is not a
            price. A free floor just reads as Free. */}
        {show.price.isFloor && show.price.amount > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {copy.price.fromPrefix}
          </span>
        )}
        <span
          style={{
            fontSize: amountSize,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            // Digits are the one thing on the row that gets compared down a
            // column, so they hold a fixed advance width.
            fontVariantNumeric: 'tabular-nums',
            color: cls === 'drop' ? 'var(--success)' : 'var(--fg)',
          }}
        >
          {formatDollars(show.price.amount)}
        </span>
      </span>
      {cls !== null && cls !== 'flat' && (
        <span
          data-testid="row-price-delta"
          className="inline-flex items-center whitespace-nowrap"
          style={{
            gap: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            // A drop is the good news the delta exists to deliver; a spike is
            // reported without alarm, because we did not raise the price.
            color: cls === 'drop' ? 'var(--success)' : 'var(--fg-muted)',
          }}
        >
          <span className="sr-only">
            {cls === 'drop'
              ? copy.a11y.savedDelta(formatDollars(Math.abs(delta ?? 0)))
              : copy.a11y.savedDeltaUp(formatDollars(Math.abs(delta ?? 0)))}
          </span>
          <DeltaArrow up={cls === 'spike'} />
          <span aria-hidden>{formatDollars(Math.abs(delta ?? 0))}</span>
        </span>
      )}
      {cls === 'flat' && (
        <span
          data-testid="row-price-flat"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--fg-subtle)',
          }}
        >
          <span className="sr-only">{copy.a11y.savedDeltaFlat}</span>
          <span aria-hidden>{copy.price.flat}</span>
        </span>
      )}
    </div>,
  )
}
