'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CounterSubmitSheet } from './CounterSubmitSheet';
import {
  ArrowGlyph,
  Eyebrow,
  PendingTrustPill,
} from '@/components/consumer/glyphs';
import { RowMetaChip } from '@/components/consumer/event-row/RowMetaChip';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { PriceCheckViewerAction, Tier } from '@concert-crawl/types';

const copy = CONSUMER_COPY.disputedPriceCard;

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

// ── Helpers ───────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const formatAmount = (floor: number, ceiling?: number): string =>
  ceiling != null
    ? `$${Math.round(floor)}–$${Math.round(ceiling)}`
    : `$${Math.round(floor)}`;

// ── Props ─────────────────────────────────────────────────────────

export interface DisputedPriceCardProps {
  // The current price: it stays the price while the check is open.
  floor: number;
  ceiling?: number;
  /** The checked price's tier; its label is left out when unknown. */
  tier: Tier | null;
  vendor: string;
  kind: 'community' | 'boxoffice';
  submitter: { handle: string } | null;
  confirmsCount: number;

  // The LEADING pending update (B9a): the amount drawn after the arrow.
  disputer: { handle: string } | null;
  disputeFloor: number;
  disputeCeiling?: number;
  disputedAt: string; // ISO date

  // The leading counter's ID: the deep-link anchor the CounterPointerLink in
  // PendingCardB points at.
  counterSubmissionId?: string | null;

  /**
   * What this viewer can do, decided by the server so the card never guesses:
   * 'submit_update' draws "Submit an update", 'none' (the checked price's
   * submitter) draws no button, 'withdraw' draws "Withdraw" for
   * `viewerCounterId`.
   */
  viewerAction: PriceCheckViewerAction;
  viewerCounterId: string | null;

  // Engagement-signal pill. When 'defer', a chip under the meta line surfaces
  // CONSUMER_COPY.priceRegion.adminDeferPillLabel ("Admin requested more
  // info"). Sourced from counterSubmission.lastAdminActionKind.
  lastAdminActionKind?: 'defer' | null;

  // For CounterSubmitSheet
  eventId: string;
  disputedSubmissionId: string;

  /**
   * Announces the sign-up gate to assistive tech without drawing it (#1247).
   * The button is unchanged visually and still opens CounterSubmitSheet, which
   * swaps itself for the tier picker when there is no session.
   */
  signedOut?: boolean;

  onUpdateSuccess?: () => void;
}

// ── Footer pieces ─────────────────────────────────────────────────

const footerRowStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
};

const footerBodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  color: 'var(--fg-muted)',
  lineHeight: 1.4,
  flex: 1,
  minWidth: 0,
};

const textButtonStyle = (color: string): React.CSSProperties => ({
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

const FooterLabel = ({ children }: { children: React.ReactNode }) => (
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

// ── Component ─────────────────────────────────────────────────────

export const DisputedPriceCard = ({
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
  counterSubmissionId = null,
  viewerAction,
  viewerCounterId,
  lastAdminActionKind = null,
  eventId,
  disputedSubmissionId,
  signedOut = false,
  onUpdateSuccess,
}: DisputedPriceCardProps) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [withdrawState, setWithdrawState] = useState<
    'idle' | 'withdrawing' | 'error'
  >('idle');

  const handleOpenSheet = useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleSuccess = useCallback(() => {
    setIsSheetOpen(false);
    onUpdateSuccess?.();
  }, [onUpdateSuccess]);

  const handleWithdraw = useCallback(async () => {
    if (viewerCounterId === null) return;
    setWithdrawState('withdrawing');
    try {
      const token = await getToken();
      if (!token) {
        setWithdrawState('error');
        return;
      }
      const res = await fetch(`${API_URL}/v1/submissions/${viewerCounterId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('DisputedPriceCard: withdraw failed', res.status);
        setWithdrawState('error');
        return;
      }
      setWithdrawState('idle');
      router.refresh();
    } catch (err) {
      console.error('DisputedPriceCard: withdraw failed', err);
      setWithdrawState('error');
    }
  }, [viewerCounterId, getToken, router]);

  const pendingAmount = formatAmount(disputeFloor, disputeCeiling);
  const attributionWho = disputer
    ? `@${disputer.handle}`
    : copy.strip.anonymousLabel;

  // Anchor target for the CounterPointerLink rendered inside PendingCardB.
  // Falls back to the checked price's ID if the counter ID wasn't passed.
  const anchorId = `counter-${counterSubmissionId ?? disputedSubmissionId}`;

  return (
    <>
      <div
        id={anchorId}
        data-testid="price-check-card"
        style={{
          borderRadius: 14,
          // A live price keeps the blue-to-pink edge while it is checked.
          border: '1px solid transparent',
          background:
            'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, color-mix(in oklab, var(--signal) 70%, transparent), color-mix(in oklab, var(--accent) 70%, transparent)) border-box',
          overflow: 'hidden',
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

        {/* Footer: driven purely by the server's viewerAction */}
        {viewerAction === 'submit_update' && (
          <div style={{ ...footerRowStyle, justifyContent: 'space-between' }}>
            <span style={footerBodyStyle}>{copy.footer.preButtonCopy}</span>
            <button
              type="button"
              onClick={handleOpenSheet}
              {...(signedOut
                ? { 'aria-label': copy.footer.ariaButtonLabelSignedOut }
                : {})}
              style={textButtonStyle('var(--signal)')}
            >
              {copy.footer.buttonLabel}
            </button>
          </div>
        )}

        {viewerAction === 'none' && (
          <div data-testid="price-check-your-price" style={footerRowStyle}>
            <FooterLabel>{copy.footer.yourPriceLabel}</FooterLabel>
            <span style={footerBodyStyle}>{copy.footer.yourPriceBody}</span>
          </div>
        )}

        {viewerAction === 'withdraw' && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <div style={{ ...footerRowStyle, borderTop: 'none' }}>
              <FooterLabel>{copy.footer.yourUpdateLabel}</FooterLabel>
              <span style={footerBodyStyle}>{copy.footer.yourUpdateBody}</span>
              {viewerCounterId !== null && (
                <button
                  type="button"
                  onClick={() => void handleWithdraw()}
                  disabled={withdrawState === 'withdrawing'}
                  style={{
                    ...textButtonStyle('var(--warning)'),
                    cursor:
                      withdrawState === 'withdrawing'
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: withdrawState === 'withdrawing' ? 0.6 : 1,
                  }}
                >
                  {withdrawState === 'withdrawing'
                    ? copy.footer.withdrawingButton
                    : copy.footer.withdrawButton}
                </button>
              )}
            </div>
            {withdrawState === 'error' && (
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
        )}
      </div>

      {viewerAction === 'submit_update' && (
        <CounterSubmitSheet
          open={isSheetOpen}
          onClose={handleCloseSheet}
          eventId={eventId}
          disputedSubmissionId={disputedSubmissionId}
          currentFloor={floor}
          {...(ceiling != null ? { currentCeiling: ceiling } : {})}
          currentVendor={vendor}
          currentTier={tier}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};
