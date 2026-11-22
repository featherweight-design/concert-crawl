'use client';

import { useCallback, useState } from 'react';
import type {
  PriceCheckOutcome,
  PriceCheckViewerAction,
  Tier,
} from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PriceCheckOutcomeLine } from '@/components/consumer/multi-tier/PriceCheckOutcomeLine';
import { CounterSubmitSheet } from '@/components/consumer/CounterSubmitSheet';
import { formatAge, priceText } from '@/components/consumer/price-check-format';
import { displayVendor } from '@/components/consumer/vendor-display';
import {
  ArrowGlyph,
  TRUST_TOKENS,
  type TrustKind,
} from '@/components/consumer/glyphs';

const copy = CONSUMER_COPY.multiTier;
// An open check on a row speaks the single-price card's words: update pending,
// "@rae saw $135", Submit an update (`20/tier-price-check`).
const checkCopy = CONSUMER_COPY.disputedPriceCard;

// ── Helpers ──────────────────────────────────────────────────────
// The kind dot reads the B+ trust tone (TRUST_TOKENS).
const dotColor = (kind: TrustKind | null): string =>
  kind ? TRUST_TOKENS[kind].tone : 'var(--fg-muted)';

const formatPrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–$${ceiling}`;
  return `$${floor}`;
};

// Keyboard focus for the row's text-link buttons.
const LINK_FOCUS =
  'rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]';

// ── Props ────────────────────────────────────────────────────────
/**
 * The open price check on this tier, for the row to draw (`20/tier-price-check`).
 * The tier's live price stays in the row until an admin picks one.
 */
export interface TierRowCheck {
  counterId: string;
  /** The live price the check is about: the sheet's disputed submission. */
  parentSubmissionId: string;
  disputer: { handle: string } | null;
  floor: number;
  ceiling?: number;
  submittedAt: string;
  viewerAction: PriceCheckViewerAction;
  eventId: string;
  tierValue: Tier | null;
  signedOut?: boolean;
  onWithdraw?: () => void;
  onUpdateSuccess?: () => void;
}

// `confirms` and `needed` are required only when `pending` is true so the
// pending strip never renders as `pending · X/0`.
interface TierAlternateRowBase {
  tier: string;
  vendor: string;
  floor: number;
  ceiling?: number;
  kind: 'community' | 'boxoffice' | 'resale' | null;
  check?: TierRowCheck;
  // How the last check on this tier ended: the row stays plain and the line
  // sits under it (08-tier-check-outcome). Never set with `check`.
  outcome?: PriceCheckOutcome | null;
}

export type TierAlternateRowProps = TierAlternateRowBase &
  (
    | { pending: true; confirms: number; needed: number }
    | { pending?: false; confirms?: never; needed?: never }
  );

// ── Component ────────────────────────────────────────────────────
export const TierAlternateRow = (props: TierAlternateRowProps) => {
  const { tier, vendor, floor, ceiling, kind, check, outcome } = props;
  const pending = props.pending === true;
  const confirms = pending ? props.confirms : 0;
  const needed = pending ? props.needed : 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const onSheetSuccess = useCallback(() => {
    setSheetOpen(false);
    check?.onUpdateSuccess?.();
  }, [check]);

  const tierLabel = (
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
  );

  const livePrice = (
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
  );

  if (check !== undefined) {
    const who =
      check.disputer !== null
        ? `@${check.disputer.handle}`
        : checkCopy.strip.anonymousLabel;
    const linkStyle = {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      fontWeight: 800,
      fontSize: 13,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    } as const;
    return (
      <>
        <div
          id={`counter-${check.counterId}`}
          data-testid="tier-check-row"
          data-price-tier={tier}
          className="scroll-mt-24"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 10px 10px 12px',
            borderTop: '1px dashed var(--border)',
            // The single-price card's open-check look: a warning left edge
            // and a faint warning tint.
            borderLeft: '3px solid var(--warning)',
            background:
              'color-mix(in oklab, var(--warning) 6%, var(--surface-1))',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {tierLabel}
            <span
              style={{
                border:
                  '1px solid color-mix(in oklab, var(--warning) 70%, transparent)',
                borderRadius: 5,
                padding: '3px 7px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--price-text-warning)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {checkCopy.strip.badgeLabel}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ color: 'var(--fg)' }}>
                {priceText(floor, ceiling)}
              </span>
              <span
                aria-hidden="true"
                style={{
                  color: 'var(--fg-subtle)',
                  display: 'inline-flex',
                  alignSelf: 'center',
                }}
              >
                <ArrowGlyph size={12} />
              </span>
              <span
                data-testid="tier-proposed-price"
                style={{ color: 'var(--price-text-warning)' }}
              >
                {priceText(check.floor, check.ceiling)}?
              </span>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              className="ph-no-capture"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {check.viewerAction === 'withdraw'
                ? checkCopy.footer.waitingNote
                : check.viewerAction === 'none'
                  ? checkCopy.footer.submitterNote
                  : `${who} ${checkCopy.strip.sawVerb} ${priceText(
                      check.floor,
                      check.ceiling,
                    )} · ${formatAge(check.submittedAt)}`}
            </span>
            {check.viewerAction === 'submit_update' && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                {...(check.signedOut
                  ? { 'aria-label': checkCopy.footer.ariaButtonLabelSignedOut }
                  : {})}
                className={LINK_FOCUS}
                style={{ ...linkStyle, color: 'var(--price-text-signal)' }}
              >
                {checkCopy.footer.buttonLabel}
              </button>
            )}
            {check.viewerAction === 'withdraw' && (
              <button
                type="button"
                onClick={check.onWithdraw}
                className={LINK_FOCUS}
                style={{ ...linkStyle, color: 'var(--price-text-warning)' }}
              >
                {checkCopy.footer.withdrawButton}
              </button>
            )}
          </div>
        </div>
        <CounterSubmitSheet
          open={sheetOpen}
          onClose={closeSheet}
          eventId={check.eventId}
          disputedSubmissionId={check.parentSubmissionId}
          currentFloor={floor}
          {...(ceiling !== undefined ? { currentCeiling: ceiling } : {})}
          currentVendor={vendor}
          currentTier={check.tierValue}
          onSuccess={onSheetSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div
        data-price-tier={tier}
        className="scroll-mt-24"
        style={{
          display: 'flex',
          gap: '10px',
          padding: '10px 0',
          borderTop: '1px dashed var(--border)',
          alignItems: 'center',
        }}
      >
        {/* Left column — tier label + dot */}
        {tierLabel}

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
        {livePrice}
      </div>
      <PriceCheckOutcomeLine outcome={outcome} />
    </>
  );
};
