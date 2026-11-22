'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Eyebrow, PendingTrustPill } from '@/components/consumer/glyphs';
import type { PriceCheckOutcome } from '@concert-crawl/types';
import { PriceCheckOutcomeLine } from '@/components/consumer/multi-tier/PriceCheckOutcomeLine';
import { OtherTiers } from '@/components/consumer/multi-tier/OtherTiers';
import type { TierAlternateRowProps } from '@/components/consumer/multi-tier/TierAlternateRow';
import { StaleStamp } from '@/components/consumer/StaleStamp';
import { StillAccurateAction } from '@/components/consumer/StillAccurateAction';
import { displayVendor } from '@/components/consumer/vendor-display';

const copy = CONSUMER_COPY.multiTier;

// ── Props ────────────────────────────────────────────────────────
export interface MultiTierLiveCardProps {
  headline: {
    floor: number;
    ceiling?: number;
    tier: string;
    vendor: string;
    kind: 'community' | 'boxoffice' | 'resale';
  };
  alternates: TierAlternateRowProps[];
  // §8 state #19 — within-tier consensus tell. When > 1, the meta line
  // appends `· N reports` after the "seen on <vendor>" caption. Sourced
  // from TierPriceBlock.reports on the corresponding priceByTier block.
  // Anything ≤ 1 hides the caption — a single report isn't a corroboration
  // signal, just the source row itself.
  reports?: number;
  // ISO when the headline tier's price was observed. Without it this card was
  // the one price surface with no staleness tell, so an 8-day-old price read as
  // current on the event page while Watching flagged it (#1366).
  observedAt?: string | null;
  // Both ids are needed to POST a sighting, and this card carried neither: the
  // headline objects built by EventDetailClient dropped TierHeadline's
  // submissionId, and the card had no notion of which event it sat on.
  eventId?: string;
  submissionId?: string | null;
  // How the last price check on the headline price ended, while it is recent.
  // Drawn under the big price (08-tier-check-outcome). The caller passes the
  // outcome that names this headline's submission; each other tier's row
  // carries its own (TierAlternateRowProps.outcome).
  checkOutcome?: PriceCheckOutcome | null;
}

// ── Helpers ──────────────────────────────────────────────────────

const formatHeadlinePrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–${ceiling}`;
  return `$${floor}`;
};

// ── Component ────────────────────────────────────────────────────
export const MultiTierLiveCard = ({
  headline,
  alternates,
  reports,
  observedAt,
  eventId,
  submissionId,
  checkOutcome = null,
}: MultiTierLiveCardProps) => {
  const hasAlternates = alternates.length > 0;

  return (
    <div
      data-price-tier={headline.tier}
      className="scroll-mt-24"
      style={{
        borderRadius: '12px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: '14px 14px 12px',
      }}
    >
      {/* Eyebrow */}
      <Eyebrow>{CONSUMER_COPY.ticketsEyebrow}</Eyebrow>

      {/* Headline flex row */}
      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.fromLabel}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          {formatHeadlinePrice(headline.floor, headline.ceiling)}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '11px',
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {headline.tier}
        </span>
        <PendingTrustPill kind={headline.kind} />
      </div>

      {/* Vendor/observation line — appends `· N reports` when reports > 1
          per §8 state #19 (consensus tell). reports === 1 is suppressed
          because the source row itself is one observation; the caption only
          earns its space when others have corroborated. */}
      <div
        style={{
          marginTop: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: 'var(--fg-muted)',
          letterSpacing: '0.04em',
        }}
      >
        {'seen on ' + displayVendor(headline.vendor)}
        {reports !== undefined && reports > 1 && ` · ${reports} reports`}
        {observedAt && (
          <>
            {' · '}
            <StaleStamp observedAt={observedAt} />
            {eventId !== undefined && (
              <>
                {' '}
                <StillAccurateAction
                  eventId={eventId}
                  submissionId={submissionId}
                  observedAt={observedAt}
                />
              </>
            )}
          </>
        )}
      </div>

      <PriceCheckOutcomeLine outcome={checkOutcome} />

      {/* Other tiers section */}
      {hasAlternates && <OtherTiers alternates={alternates} />}
    </div>
  );
};
