import type React from 'react';
import { EVENT_ROW_COPY as copy } from './definitions/copy';
import { formatDollars } from '@/components/consumer/definitions/lib';
import { StatusChip } from '@/components/consumer/StatusChip';
import { SURFACES, type RowSurface } from './definitions/surfaces';
import { deltaClass } from './lib/price-delta';
import { resolveRowStatus } from './lib/row-status';
import type { EventRowShow } from './lib/row-model';

interface PriceStackProps {
  show: EventRowShow;
  surface: RowSurface;
  narrow: boolean;
  /** The row draws the status chip beside the name; the slot keeps the price or a dash. */
  statusInTitle?: boolean;
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
);

/**
 * The price reads the same on every surface. Only the delta is surface-gated,
 * and deliberately so: Browse fixtures do carry a `saved` price, so gating on
 * the data instead would put a green "down $12" on a row where the user never
 * saved anything.
 */
export const PriceStack = ({
  show,
  surface,
  narrow,
  statusInTitle = false,
}: PriceStackProps) => {
  const minWidth = narrow ? 56 : 78;
  const amountSize = narrow ? 15 : 16.5;
  const status = resolveRowStatus(show.lifecycle, show.status, show.delistedAt);

  const slot = (children: React.ReactNode) => (
    <div
      className="flex shrink-0 items-center justify-end"
      style={{ minWidth }}
    >
      {children}
    </div>
  );

  // `statusInTitle`: the row sets the status chip beside the name
  // (`more-st-rows_board`), so the slot keeps what a price slot says: a dash
  // where there is nothing to buy (cancelled, sold out, no longer listed), and
  // the price itself for a postponed show, whose tickets still stand. A caller
  // without a title line of its own leaves it off and the chip takes the slot.
  // The one exception is a narrow No longer listed row: its wide chip would
  // crush the title beside it, so the row puts it under the title and asks the
  // slot to draw it (`chipUnderTitle` in EventRow).
  if (status === 'removed' && (narrow || !statusInTitle)) {
    return slot(
      <span data-testid="row-removed">
        <StatusChip
          status="removed"
          label={copy.status.removed}
          srLabel={copy.a11y.removed}
        />
      </span>,
    );
  }

  if (status === 'cancelled' && !statusInTitle) {
    return slot(
      <span data-testid="row-cancelled">
        <StatusChip
          status="cancelled"
          label={copy.status.cancelled}
          srLabel={copy.a11y.cancelled}
        />
      </span>,
    );
  }

  if (status === 'postponed' && !statusInTitle) {
    return slot(
      <span data-testid="row-postponed">
        <StatusChip
          status="postponed"
          label={copy.status.postponed}
          srLabel={copy.a11y.postponed}
        />
      </span>,
    );
  }

  if (status === 'removed' || status === 'cancelled' || status === 'soldout') {
    return slot(
      <span
        data-testid={
          status === 'soldout' ? 'row-sold-out-price' : 'row-no-price'
        }
        style={{
          fontSize: amountSize,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        <span className="sr-only">
          {status === 'soldout'
            ? copy.a11y.soldOutPrice
            : status === 'cancelled'
              ? copy.a11y.cancelledPrice
              : copy.a11y.removedPrice}
        </span>
        <span aria-hidden>{copy.price.soldOutPlaceholder}</span>
      </span>,
    );
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
    );
  }

  const delta =
    SURFACES[surface].showsDelta && show.saved !== null
      ? show.price.amount - show.saved.price
      : null;
  const cls = delta === null ? null : deltaClass(delta);

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
      {/* Muted rather than warn-coloured: an unconfirmed price is incomplete
          information, not a problem with the show. It sits under the amount so
          the number stays the thing the eye lands on. */}
      {show.price.isPending && (
        <span
          data-testid="row-price-pending"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--fg-muted)',
          }}
        >
          <span className="sr-only">{copy.a11y.pendingPrice}</span>
          <span aria-hidden>{copy.price.pending}</span>
        </span>
      )}
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
  );
};
