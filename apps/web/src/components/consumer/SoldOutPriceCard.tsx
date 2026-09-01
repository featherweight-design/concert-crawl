'use client'

// SoldOutPriceCard — extracted from the inline JSX in EventDetailPriceBlock
// (formerly lines 372–498). Renders the "Tickets" eyebrow + strikethrough
// price + Sold-out pill + "as of …" stale caption that ships in the promoted
// sold-out state.
//
// Variants (Appendix A.2 — Q1 lock):
//   - 'has-listing' (default) → strikethrough price + reporter caption.
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

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const AMBER = 'oklch(0.73 0.13 78)'

const formatTimeAgo = (reportedAtIso: string): string => {
  const reportedAtMs = new Date(reportedAtIso).getTime()
  if (Number.isNaN(reportedAtMs)) return 'recently'
  // Clamp at 0 so future timestamps (e.g. server-client clock skew) don't
  // render as "-5m ago".
  const diffMs = Math.max(0, Date.now() - reportedAtMs)
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export type SoldOutPriceCardVariant = 'has-listing' | 'no-listing'

interface SoldOutPriceCardSharedProps {
  variant?: SoldOutPriceCardVariant
}

interface SoldOutPriceCardHasListingProps extends SoldOutPriceCardSharedProps {
  variant?: 'has-listing'
  priceMin: number | null
  priceMax: number | null
  reporterHandle: string | null
  confirmsCount: number
  reportedAt: string
}

interface SoldOutPriceCardNoListingProps extends SoldOutPriceCardSharedProps {
  variant: 'no-listing'
}

export type SoldOutPriceCardProps =
  SoldOutPriceCardHasListingProps | SoldOutPriceCardNoListingProps

export function SoldOutPriceCard(props: SoldOutPriceCardProps) {
  const variant: SoldOutPriceCardVariant = props.variant ?? 'has-listing'

  // Has-listing variant — uses the shipped strikethrough + reporter caption.
  if (variant === 'has-listing') {
    const hasListing = props as SoldOutPriceCardHasListingProps
    const { priceMin, priceMax, reporterHandle, confirmsCount, reportedAt } =
      hasListing
    const timeAgo = formatTimeAgo(reportedAt)

    return (
      <div
        style={{
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 14px 0' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {CONSUMER_COPY.ticketsEyebrow}
          </span>
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
                fontSize: 28,
                color: 'var(--fg-subtle)',
                textDecoration: 'line-through',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
              }}
            >
              {priceMin != null && priceMax != null
                ? `$${priceMin}–$${priceMax}`
                : priceMin != null
                  ? `$${priceMin}`
                  : priceMax != null
                    ? `$${priceMax}`
                    : '—'}
            </span>
            <span
              style={{
                background: AMBER,
                borderRadius: 6,
                padding: '3px 9px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--fg-on-accent)',
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
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {reporterHandle
              ? `Reported sold out by @${reporterHandle} · ${confirmsCount} fan${confirmsCount !== 1 ? 's' : ''} confirmed`
              : `Reported sold out · ${confirmsCount} fan${confirmsCount !== 1 ? 's' : ''} confirmed`}
          </div>
        </div>
        <div
          style={{
            margin: '12px 14px 0',
            borderTop: '1px solid var(--border)',
            padding: '10px 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: AMBER,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: `color-mix(in oklab, ${AMBER} 80%, var(--fg-subtle))`,
              letterSpacing: '0.04em',
            }}
          >
            {CONSUMER_COPY.priceStaleness.asOfStale(timeAgo)}
            {reporterHandle && ` · @${reporterHandle}`}
          </span>
        </div>
      </div>
    )
  }

  // No-listing variant — Appendix A.2.
  // Em-dash price (no strikethrough), no reporter caption, single
  // "No tickets listed…" caption underneath.
  return (
    <div
      style={{
        borderRadius: 12,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: '14px 14px 13px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {CONSUMER_COPY.ticketsEyebrow}
      </span>
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
            background: 'var(--warning)',
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
  )
}
