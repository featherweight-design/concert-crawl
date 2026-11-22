'use client';

import type { PriceCheckOutcome } from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CheckGlyph } from '@/components/consumer/glyphs';

const copy = CONSUMER_COPY.multiTier;

// "$44" or "$44–$60": the price an update replaced.
const formatWas = (previous: { floor: number; ceiling: number | null }) =>
  previous.ceiling !== null
    ? `$${previous.floor}–$${previous.ceiling}`
    : `$${previous.floor}`;

// Null when the outcome cannot be put into words: an update with no price it
// replaced says nothing true, and it must not fall through to the "held" line.
const outcomeText = (outcome: PriceCheckOutcome): string | null => {
  if (outcome.outcome === 'held') return copy.checkHeld;
  return outcome.previous !== null
    ? copy.checkUpdated(formatWas(outcome.previous))
    : null;
};

/**
 * How the last price check ended (more-st-disputes_board "After review",
 * 08-tier-check-outcome): a success-tinted notice row. One line for the card's
 * headline price and for each tier row, so the copy and the look never differ.
 */
export const PriceCheckOutcomeLine = ({
  outcome,
}: {
  outcome: PriceCheckOutcome | null | undefined;
}) => {
  const text = outcome != null ? outcomeText(outcome) : null;
  if (outcome == null || text === null) return null;
  return (
    <div
      data-testid="price-check-outcome"
      data-outcome={outcome.outcome}
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
      <span>{text}</span>
    </div>
  );
};
