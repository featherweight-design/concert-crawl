import { EVENT_ROW_COPY as copy } from './definitions/copy'
import { formatDollars } from '@/components/consumer/definitions/lib'
import { SURFACES, type RowSurface } from './definitions/surfaces'
import type { EventRowShow } from './lib/row-model'

interface PriceStackProps {
  show: EventRowShow
  surface: RowSurface
  narrow: boolean
}

/**
 * The price reads the same on every surface. Only the delta is surface-gated,
 * and deliberately so: Browse fixtures do carry a `saved` price, so gating on
 * the data instead would put a green "down $12" on a row where the user never
 * saved anything.
 */
export const PriceStack = ({ show, surface, narrow }: PriceStackProps) => {
  const minWidth = narrow ? 56 : 78
  const isSuppressed =
    show.lifecycle === 'cancelled' || show.lifecycle === 'postponed'

  // Rule 2's one exemption: sold out takes the price slot outright rather than
  // winning a chip, so it spends no chip budget. The artwork dims, not the row
  // — a row-level opacity drags --fg-muted toward the AA floor.
  if (show.status === 'soldout') {
    return (
      <div style={{ minWidth }} className="shrink-0 text-right">
        <span
          data-testid="row-sold-out"
          className="inline-flex items-center whitespace-nowrap rounded-[5px] border border-border bg-surface-2 text-fg-muted"
          style={{
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {copy.price.soldOut}
        </span>
      </div>
    )
  }

  if (isSuppressed) return <div style={{ minWidth }} className="shrink-0" />

  if (show.price === null) {
    return (
      <div style={{ minWidth }} className="shrink-0 text-right">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          {copy.price.tba}
        </span>
      </div>
    )
  }

  const delta =
    SURFACES[surface].showsDelta && show.saved !== null
      ? show.price.amount - show.saved.price
      : null

  return (
    <div style={{ minWidth }} className="shrink-0 text-right">
      <div
        className="whitespace-nowrap text-fg"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {/* formatDollars turns 0 into the Free label, and "from Free" is not a
            price. A free floor just reads as Free. */}
        {show.price.isFloor && show.price.amount > 0 && (
          <span
            className="text-fg-muted"
            style={{ fontSize: 9.5, fontWeight: 500, marginRight: 3 }}
          >
            {copy.price.fromPrefix}
          </span>
        )}
        {formatDollars(show.price.amount)}
      </div>
      {delta !== null && delta !== 0 && (
        <div
          data-testid="row-price-delta"
          className="whitespace-nowrap"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: delta < 0 ? 'var(--success)' : 'var(--warning)',
          }}
        >
          <span className="sr-only">
            {delta < 0
              ? copy.a11y.savedDelta(formatDollars(Math.abs(delta)))
              : copy.a11y.savedDeltaUp(formatDollars(Math.abs(delta)))}
          </span>
          <span aria-hidden>
            {delta < 0 ? copy.glyphs.deltaDown : copy.glyphs.deltaUp}{' '}
            {formatDollars(Math.abs(delta))}
          </span>
        </div>
      )}
    </div>
  )
}
