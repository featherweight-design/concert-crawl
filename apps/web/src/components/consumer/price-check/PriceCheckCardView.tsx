import type { ReactNode, Ref } from 'react';
import {
  ArrowGlyph,
  Eyebrow,
  PendingTrustPill,
} from '@/components/consumer/glyphs';
import { RowMetaChip } from '@/components/consumer/event-row/RowMetaChip';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { Tier } from '@concert-crawl/types';
import type { WithdrawState } from './use-withdraw-update';

const copy = CONSUMER_COPY.disputedPriceCard;

// ── Helpers ───────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const formatAmount = (floor: number, ceiling?: number): string =>
  ceiling != null
    ? `$${Math.round(floor)}–$${Math.round(ceiling)}`
    : `$${Math.round(floor)}`;

// ── Card ──────────────────────────────────────────────────────────

export interface PriceCheckCardViewProps {
  // The current price: it stays the price while the check is open.
  floor: number;
  ceiling?: number | undefined;
  tier: Tier | null;
  vendor: string;
  kind: 'community' | 'boxoffice';
  submitter: { handle: string } | null;
  confirmsCount: number;
  // The pending update drawn after the arrow.
  disputer: { handle: string } | null;
  disputeFloor: number;
  disputeCeiling?: number | undefined;
  disputedAt: string;
  lastAdminActionKind?: 'defer' | null;
  id?: string | undefined;
  cardRef?: Ref<HTMLDivElement> | undefined;
  testId?: string;
  footer: ReactNode;
}

/**
 * The price check card's visuals (`more-st-disputes_board`): the event page
 * draws it through DisputedPriceCard, and the update sheet's success state
 * draws the same card as its preview (`more-st-counter_done_m`).
 */
export const PriceCheckCardView = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  confirmsCount,
  disputer,
  disputeFloor,
  disputeCeiling,
  disputedAt,
  lastAdminActionKind = null,
  id,
  cardRef,
  testId = 'price-check-card',
  footer,
}: PriceCheckCardViewProps) => {
  const pendingAmount = formatAmount(disputeFloor, disputeCeiling);
  const attributionWho = disputer
    ? `@${disputer.handle}`
    : copy.strip.anonymousLabel;

  return (
    <div
      id={id}
      ref={cardRef}
      tabIndex={-1}
      data-testid={testId}
      style={{
        borderRadius: 14,
        // A live price keeps the blue-to-pink edge while it is checked.
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, color-mix(in oklab, var(--signal) 70%, transparent), color-mix(in oklab, var(--accent) 70%, transparent)) border-box',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      {/* Update strip: pending, so its edge is dashed (rule 3) */}
      <div
        style={{
          padding: '9px 14px',
          background: 'var(--surface-2)',
          borderBottom:
            '1px dashed color-mix(in oklab, var(--warning) 55%, transparent)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
        }}
      >
        <RowMetaChip label={copy.strip.badgeLabel} tone="warn" />
        {/* Names the reader, so analytics skips it */}
        <span
          className="ph-no-capture"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {attributionWho} {copy.strip.sawVerb}{' '}
          <strong style={{ color: 'var(--fg)', fontWeight: 700 }}>
            {pendingAmount}
          </strong>{' '}
          · {formatTimeAgo(disputedAt)}
        </span>
      </div>

      {/* Price area */}
      <div style={{ padding: '14px 14px 12px' }}>
        <Eyebrow>{copy.body.ticketsLabel}</Eyebrow>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            data-testid="price-check-current"
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 30,
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            {formatAmount(floor, ceiling)}
          </span>
          <span
            aria-hidden
            style={{ color: 'var(--fg-subtle)', display: 'inline-flex' }}
          >
            <ArrowGlyph size={16} />
          </span>
          <span
            data-testid="price-check-pending"
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 22,
              color: 'var(--warning)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            <span className="sr-only">{copy.body.pendingPriceSr} </span>
            {pendingAmount}?
          </span>
          <span style={{ marginLeft: 'auto' }}>
            <PendingTrustPill kind={kind} />
          </span>
        </div>

        {/* Meta line: tier · vendor · submitter · confirms */}
        <p
          style={{
            margin: '8px 0 0',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            lineHeight: 1.45,
          }}
        >
          {tier !== null && (
            <>
              <span>{tier}</span> ·{' '}
            </>
          )}
          {copy.body.seenOnPrefix} {vendor} · {copy.body.submittedByPrefix}{' '}
          {submitter !== null ? (
            <span className="ph-no-capture">@{submitter.handle}</span>
          ) : (
            <span style={{ fontStyle: 'italic' }}>
              {copy.strip.anonymousLabel}
            </span>
          )}{' '}
          · {copy.body.fansConfirmed(confirmsCount)}
        </p>

        {lastAdminActionKind === 'defer' && (
          <div style={{ marginTop: 10 }}>
            <RowMetaChip
              label={CONSUMER_COPY.priceRegion.adminDeferPillLabel}
              tone="accent"
            />
          </div>
        )}
      </div>

      {footer}
    </div>
  );
};

// ── Footer pieces ─────────────────────────────────────────────────

export const footerRowStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
};

export const footerBodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  color: 'var(--fg-muted)',
  lineHeight: 1.4,
  flex: 1,
  minWidth: 0,
};

export const textButtonStyle = (color: string): React.CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontWeight: 800,
  fontSize: 13,
  color,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  lineHeight: 1,
  padding: '6px 0',
});

export const FooterLabel = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--fg-subtle)',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      flexShrink: 0,
      maxWidth: 64,
      lineHeight: 1.4,
    }}
  >
    {children}
  </span>
);

/** "Your update · Waiting on review. · Withdraw", plus its error line. */
export const WithdrawFooter = ({
  state,
  canWithdraw,
  onWithdraw,
}: {
  state: WithdrawState;
  canWithdraw: boolean;
  onWithdraw: () => void;
}) => (
  <div style={{ borderTop: '1px solid var(--border)' }}>
    <div style={{ ...footerRowStyle, borderTop: 'none' }}>
      <FooterLabel>{copy.footer.yourUpdateLabel}</FooterLabel>
      <span style={footerBodyStyle}>{copy.footer.yourUpdateBody}</span>
      {canWithdraw && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={state === 'withdrawing'}
          style={{
            ...textButtonStyle('var(--warning)'),
            cursor: state === 'withdrawing' ? 'not-allowed' : 'pointer',
            opacity: state === 'withdrawing' ? 0.6 : 1,
          }}
        >
          {state === 'withdrawing'
            ? copy.footer.withdrawingButton
            : copy.footer.withdrawButton}
        </button>
      )}
    </div>
    {state === 'error' && (
      <p
        role="alert"
        style={{
          margin: 0,
          padding: '0 14px 11px',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--warning)',
          lineHeight: 1.4,
        }}
      >
        {copy.footer.withdrawError}
      </p>
    )}
  </div>
);
