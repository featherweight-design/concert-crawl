'use client';

import { useState, useCallback } from 'react';
import { CounterSubmitSheet } from './CounterSubmitSheet';
import {
  ArrowGlyph,
  Eyebrow,
  PendingTrustPill,
} from '@/components/consumer/glyphs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { PriceCheckViewerAction, Tier } from '@concert-crawl/types';

const copy = CONSUMER_COPY.disputedPriceCard;

// ── Helper ────────────────────────────────────────────────────────

// The strip draws the age bare ("3h", more-st-disputes_board); the line under
// the headline keeps "ago".
const formatAge = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

const formatTimeAgo = (isoDate: string): string => `${formatAge(isoDate)} ago`;

const priceText = (floor: number, ceiling?: number | null): string =>
  ceiling != null
    ? `$${Math.round(floor)}–$${Math.round(ceiling)}`
    : `$${Math.round(floor)}`;

// A signal-to-accent hairline: the card's own ground sits on the padding box
// and the gradient shows through the transparent 1px border (the same trick
// the sheet edges use).
const GRADIENT_STROKE = {
  border: '1px solid transparent',
  background:
    'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, ' +
    'linear-gradient(135deg, var(--signal), var(--accent)) border-box',
} as const;

// Keyboard focus for the footer's text-link buttons.
const FOOTER_LINK_FOCUS =
  'rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]';

// A muted mono label on the footer's left, as the board draws "YOUR PRICE".
// The Light-safe subtle text token: --fg-subtle misses AA at 9px on Light.
const FOOTER_LABEL = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--price-text-subtle)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  flexShrink: 0,
} as const;

const FOOTER_TEXT = {
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.4,
  minWidth: 0,
} as const;

// ── Props ─────────────────────────────────────────────────────────

export interface DisputedPriceCardProps {
  // Live price (current corroborated price)
  floor: number;
  ceiling?: number;
  /** The checked price's tier; its label is left out when unknown. */
  tier: Tier | null;
  vendor: string;
  kind: 'community' | 'boxoffice';
  submitter: { handle: string } | null;
  liveSubmittedAt: string;
  confirmsCount: number;

  // The pending counter-submission
  disputer: { handle: string } | null;
  disputeFloor: number;
  disputeCeiling?: number;
  disputedAt: string; // ISO date

  // The counter-submission ID — used as the deep-link anchor target for the
  // coral CounterPointerLink rendered inside PendingCardB.
  counterSubmissionId?: string | null;

  // Engagement-signal pill. When 'defer', an accent-outlined chip under the
  // meta line surfaces CONSUMER_COPY.priceRegion.adminDeferPillLabel
  // ("Admin requested more info"). Sourced from
  // EventDetailResponse.counterSubmission.lastAdminActionKind.
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

  /**
   * What the viewer can do on this price (B+ B9), decided by the server:
   * 'submit_update' (anyone else, signed-out included) shows the "Submit an
   * update" link; 'none' (the viewer submitted the price) shows the note that
   * an admin will pick one; 'withdraw' (the viewer has an update pending) shows
   * "Waiting on review" and a Withdraw link.
   */
  viewerAction?: PriceCheckViewerAction;
  /** Called by the Withdraw link; the parent owns the DELETE and the refresh. */
  onWithdraw?: () => void;

  onUpdateSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export const DisputedPriceCard = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  liveSubmittedAt,
  confirmsCount,
  disputer,
  disputeFloor,
  disputeCeiling,
  disputedAt,
  counterSubmissionId = null,
  lastAdminActionKind = null,
  eventId,
  disputedSubmissionId,
  signedOut = false,
  viewerAction = 'submit_update',
  onWithdraw,
  onUpdateSuccess,
}: DisputedPriceCardProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const disputerLabel = disputer
    ? `@${disputer.handle}`
    : copy.strip.anonymousLabel;

  // Anchor target for the coral CounterPointerLink rendered inside
  // PendingCardB. Falls back to the disputed parent ID if the counter ID
  // wasn't passed — keeps the anchor non-broken for legacy callers.
  const anchorId = `counter-${counterSubmissionId ?? disputedSubmissionId}`;

  // A text link that is a button. Not `all: unset`: that would also strip the
  // focus ring; the class below restores it for keyboard users.
  const footerLink = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: 1.2,
  } as const;

  return (
    <>
      {/* Card */}
      <div
        id={anchorId}
        data-testid="disputed-price-card"
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          ...GRADIENT_STROKE,
        }}
      >
        {/* Dashed update strip */}
        <div
          style={{
            padding: '9px 14px',
            background:
              'color-mix(in oklab, var(--warning) 6%, var(--surface-1))',
            borderBottom:
              '1px dashed color-mix(in oklab, var(--warning) 45%, transparent)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* "update pending": an amber outline pill, no fill */}
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
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {copy.strip.badgeLabel}
          </span>

          {/* "@rae saw $52 · 3h": names the reader, so analytics skips it */}
          <span
            className="ph-no-capture"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--fg-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {disputerLabel} {copy.strip.sawVerb}{' '}
            <strong style={{ color: 'var(--fg)', fontWeight: 800 }}>
              {priceText(disputeFloor, disputeCeiling)}
            </strong>{' '}
            · {formatAge(disputedAt)}
          </span>
        </div>

        {/* Main price area */}
        <div style={{ padding: '14px 14px 12px', position: 'relative' }}>
          {/* Eyebrow */}
          <Eyebrow>{copy.body.ticketsLabel}</Eyebrow>

          {/* Headline row: "$44 → $52?" with the trust pill pinned right */}
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 10,
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 32,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
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
                <ArrowGlyph size={16} />
              </span>
              <span
                data-testid="proposed-price"
                style={{ color: 'var(--price-text-warning)' }}
              >
                {priceText(disputeFloor, disputeCeiling)}?
              </span>
            </span>
            <span style={{ marginLeft: 'auto', alignSelf: 'center' }}>
              <PendingTrustPill kind={kind} />
            </span>
          </div>

          {/* Meta line: tier · seen on vendor · Submitted by @x · N fans */}
          <div
            style={{
              marginTop: 6,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.4,
            }}
          >
            {tier !== null && <span>{tier} · </span>}
            <span>
              {copy.body.seenOnPrefix} {vendor}
            </span>
            <span> · {copy.body.submittedByPrefix} </span>
            {submitter !== null ? (
              <span className="ph-no-capture" style={{ fontWeight: 700 }}>
                @{submitter.handle}
              </span>
            ) : (
              <span style={{ fontStyle: 'italic', opacity: 0.85 }}>
                {copy.strip.anonymousLabel}
              </span>
            )}
            <span>
              {' '}
              · {formatTimeAgo(liveSubmittedAt)} ·{' '}
              {copy.body.fansConfirmed(confirmsCount)}
            </span>
          </div>

          {/* Admin-defer pill (LOCKED §9, engagement signal): an
              accent-outlined chip under the meta line */}
          {lastAdminActionKind === 'defer' && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 10,
                padding: '4px 8px',
                borderRadius: 6,
                border:
                  '1px solid color-mix(in oklab, var(--accent) 70%, transparent)',
                color: 'var(--accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {CONSUMER_COPY.priceRegion.adminDeferPillLabel}
            </span>
          )}
        </div>

        {/* Footer: three views, decided by the server (viewerAction) */}
        <div
          data-testid="disputed-footer"
          data-viewer-action={viewerAction}
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {viewerAction === 'none' && (
            <>
              <span style={FOOTER_LABEL}>{copy.footer.yourPriceLabel}</span>
              <span style={{ ...FOOTER_TEXT, flex: 1 }}>
                {copy.footer.submitterNote}
              </span>
            </>
          )}

          {viewerAction === 'withdraw' && (
            <>
              <span style={FOOTER_LABEL}>{copy.footer.yourUpdateLabel}</span>
              <span style={{ ...FOOTER_TEXT, flex: 1 }}>
                {copy.footer.waitingNote}
              </span>
              <button
                type="button"
                onClick={onWithdraw}
                className={FOOTER_LINK_FOCUS}
                style={{ ...footerLink, color: 'var(--price-text-warning)' }}
              >
                {copy.footer.withdrawButton}
              </button>
            </>
          )}

          {viewerAction === 'submit_update' && (
            <>
              <span style={FOOTER_TEXT}>{copy.footer.preButtonCopy}</span>
              <button
                type="button"
                onClick={handleOpenSheet}
                {...(signedOut
                  ? { 'aria-label': copy.footer.ariaButtonLabelSignedOut }
                  : {})}
                className={FOOTER_LINK_FOCUS}
                style={{ ...footerLink, color: 'var(--price-text-signal)' }}
              >
                {copy.footer.buttonLabel}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CounterSubmitSheet */}
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
    </>
  );
};
