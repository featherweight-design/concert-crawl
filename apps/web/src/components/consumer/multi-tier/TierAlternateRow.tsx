'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { displayVendor } from '@/components/consumer/vendor-display';
import { TRUST_TOKENS, type TrustKind } from '@/components/consumer/glyphs';

const copy = CONSUMER_COPY.multiTier;

// ── Helpers ──────────────────────────────────────────────────────
// The kind dot reads the B+ trust tone (TRUST_TOKENS).
const dotColor = (kind: TrustKind | null): string =>
  kind ? TRUST_TOKENS[kind].tone : 'var(--fg-muted)';

const formatPrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–$${ceiling}`;
  return `$${floor}`;
};

// ── Props ────────────────────────────────────────────────────────
// `confirms` and `needed` are required only when `pending` is true so the
// pending strip never renders as `pending · X/0`.
interface TierAlternateRowBase {
  tier: string;
  vendor: string;
  floor: number;
  ceiling?: number;
  kind: 'community' | 'boxoffice' | 'resale' | null;
}

export type TierAlternateRowProps = TierAlternateRowBase &
  (
    | { pending: true; confirms: number; needed: number }
    | { pending?: false; confirms?: never; needed?: never }
  );

// ── Component ────────────────────────────────────────────────────
export const TierAlternateRow = (props: TierAlternateRowProps) => {
  const { tier, vendor, floor, ceiling, kind } = props;
  const pending = props.pending === true;
  const confirms = pending ? props.confirms : 0;
  const needed = pending ? props.needed : 0;
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 0',
        borderTop: '1px dashed var(--border)',
        alignItems: 'center',
      }}
    >
      {/* Left column — tier label + dot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: '56px',
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '10.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--fg)',
          }}
        >
          {tier}
        </span>
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '2.5px',
            flexShrink: 0,
            opacity: 0.85,
            background: dotColor(kind),
          }}
        />
      </div>

      {/* Middle column — vendor or pending text */}
      <div style={{ flex: 1 }}>
        {pending ? (
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9.5px',
              color: TRUST_TOKENS.community.text,
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {copy.pendingTemplate(confirms, needed)}
          </span>
        ) : (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {displayVendor(vendor)}
          </span>
        )}
      </div>

      {/* Right column — price */}
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          color: pending ? 'var(--fg-muted)' : 'var(--fg)',
        }}
      >
        {formatPrice(floor, ceiling)}
      </span>
    </div>
  );
};
