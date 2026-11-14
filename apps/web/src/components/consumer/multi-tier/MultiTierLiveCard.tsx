'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  CheckGlyph,
  Eyebrow,
  PendingTrustPill,
} from '@/components/consumer/glyphs';
import type { PriceCheckOutcome } from '@concert-crawl/types';
import {
  TierAlternateRow,
  type TierAlternateRowProps,
} from '@/components/consumer/multi-tier/TierAlternateRow';
import { StaleStamp } from '@/components/consumer/StaleStamp';
import { StillAccurateAction } from '@/components/consumer/StillAccurateAction';
import { displayVendor } from '@/components/consumer/vendor-display';

const copy = CONSUMER_COPY.multiTier;

// ── Types ────────────────────────────────────────────────────────
interface AlternateTierBase {
  tier: string;
  vendor: string;
  floor: number;
  ceiling?: number;
  kind: 'community' | 'boxoffice' | 'resale' | null;
}

type AlternateTier = AlternateTierBase &
  (
    | { pending: true; confirms: number; needed: number }
    | { pending?: false; confirms?: never; needed?: never }
  );

// ── Props ────────────────────────────────────────────────────────
export interface MultiTierLiveCardProps {
  headline: {
    floor: number;
    ceiling?: number;
    tier: string;
    vendor: string;
    kind: 'community' | 'boxoffice' | 'resale';
  };
  alternates: Array<AlternateTier>;
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
  // How the last price check on this price ended (more-st-disputes_board,
  // "After review"), while it is recent. Drawn as a notice row at the foot of
  // the card. The API only sends one for the price it names, so the caller
  // passes it for a single-tier event.
  checkOutcome?: PriceCheckOutcome | null;
}

// ── Helpers ──────────────────────────────────────────────────────

// "$44" or "$44–$60": the price an update replaced.
const formatWas = (previous: { floor: number; ceiling: number | null }) =>
  previous.ceiling !== null
    ? `$${previous.floor}–$${previous.ceiling}`
    : `$${previous.floor}`;

const checkOutcomeText = (outcome: PriceCheckOutcome): string =>
  outcome.outcome === 'updated' && outcome.previous !== null
    ? copy.checkUpdated(formatWas(outcome.previous))
    : copy.checkHeld;
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

      {/* Other tiers section */}
      {hasAlternates && (
        <div style={{ marginTop: '12px' }}>
          <Eyebrow>{copy.otherTiersEyebrow}</Eyebrow>
          {alternates.map((alt, idx) => {
            const base = {
              tier: alt.tier,
              vendor: alt.vendor,
              floor: alt.floor,
              kind: alt.kind,
              ...(alt.ceiling !== undefined ? { ceiling: alt.ceiling } : {}),
            };
            const rowProps: TierAlternateRowProps = alt.pending
              ? {
                  ...base,
                  pending: true,
                  confirms: alt.confirms,
                  needed: alt.needed,
                }
              : base;
            return (
              <TierAlternateRow key={`${alt.tier}-${idx}`} {...rowProps} />
            );
          })}
        </div>
      )}

      {/* How the last price check ended: a success-tinted notice row */}
      {checkOutcome !== null && (
        <div
          data-testid="price-check-outcome"
          data-outcome={checkOutcome.outcome}
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            border:
              '1px solid color-mix(in oklab, var(--success) 45%, transparent)',
            background: 'color-mix(in oklab, var(--success) 8%, transparent)',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          <span
            aria-hidden="true"
            style={{ color: 'var(--success)', flexShrink: 0 }}
          >
            <CheckGlyph size={12} />
          </span>
          <span>{checkOutcomeText(checkOutcome)}</span>
        </div>
      )}
    </div>
  );
};
