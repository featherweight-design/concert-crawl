'use client';

// SoldOutPriceCard — the "Tickets" card on a show reported sold out.
//
// Drawn as more-st-ev_sold_m: an accent-stroked card holding the "Tickets"
// eyebrow, "Sold out" set large in the accent (README rule 3: Sold out uses
// --accent, never amber), and the reporter caption. There is no struck price:
// a sold-out show has no price to read.
//
// Variants (Appendix A.2 — Q1 lock):
//   - 'has-listing' (default) → "Sold out" + reporter caption.
//   - 'no-listing'            → em-dash price, no strikethrough, and a
//     subline "No tickets listed anywhere we can see. Not even resale."
//     replaces the reporter caption. Used when the event is sold-out AND
//     there is no resale ticketLink (the Q1 `sold-out-contribute` path —
//     see decision-tree.ts). Other ticketLink kinds (primary, boxoffice)
//     may still exist; we trigger the contribution-only state because
//     resale is the anchor for the face-value pedagogy, so absent a resale
//     row there's nothing to contrast face value against.
//
// Property table reference: §8 state #10 + #11, Appendix A.2.

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const ACCENT_STROKE = 'color-mix(in oklab, var(--accent) 55%, transparent)';

export type SoldOutPriceCardVariant = 'has-listing' | 'no-listing';

interface SoldOutPriceCardSharedProps {
  variant?: SoldOutPriceCardVariant;
}

interface SoldOutPriceCardHasListingProps extends SoldOutPriceCardSharedProps {
  variant?: 'has-listing';
  reporterHandle: string | null;
  confirmsCount: number;
}

interface SoldOutPriceCardNoListingProps extends SoldOutPriceCardSharedProps {
  variant: 'no-listing';
}

export type SoldOutPriceCardProps =
  SoldOutPriceCardHasListingProps | SoldOutPriceCardNoListingProps;

const EYEBROW = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--fg-subtle)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} as const;

export function SoldOutPriceCard(props: SoldOutPriceCardProps) {
  const variant: SoldOutPriceCardVariant = props.variant ?? 'has-listing';

  if (variant === 'has-listing') {
    const { reporterHandle, confirmsCount } =
      props as SoldOutPriceCardHasListingProps;
    const fans = `${confirmsCount} fan${confirmsCount !== 1 ? 's' : ''} confirmed`;

    return (
      <div
        style={{
          borderRadius: 16,
          background: 'var(--surface-1)',
          border: `1px solid ${ACCENT_STROKE}`,
          padding: '14px 16px 16px',
        }}
      >
        <span style={EYEBROW}>{CONSUMER_COPY.ticketsEyebrow}</span>
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 28,
            color: 'var(--accent)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          {CONSUMER_COPY.priceRegion.soldOutBadge}
        </div>
        <div
          className={reporterHandle ? 'ph-no-capture' : undefined}
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
          }}
        >
          {reporterHandle
            ? `Reported sold out by @${reporterHandle} · ${fans}`
            : `Reported sold out · ${fans}`}
        </div>
      </div>
    );
  }

  // No-listing variant — Appendix A.2.
  // Em-dash price (no strikethrough), no reporter caption, single
  // "No tickets listed…" caption underneath.
  return (
    <div
      style={{
        borderRadius: 16,
        background: 'var(--surface-1)',
        border: `1px solid ${ACCENT_STROKE}`,
        padding: '14px 16px 13px',
      }}
    >
      <span style={EYEBROW}>{CONSUMER_COPY.ticketsEyebrow}</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 26,
            color: 'var(--fg-subtle)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          —
        </span>
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--accent)',
            color: 'var(--fg-on-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            alignSelf: 'flex-end',
          }}
        >
          {CONSUMER_COPY.priceRegion.soldOutBadge}
        </span>
      </div>
      <div
        style={{
          marginTop: 9,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--fg-muted)',
          letterSpacing: '-0.005em',
        }}
      >
        {CONSUMER_COPY.priceRegion.soldOutNoListingCaption}
      </div>
    </div>
  );
}
