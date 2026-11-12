'use client';

import { useState, useCallback, useRef } from 'react';
import { CounterSubmitSheet } from './CounterSubmitSheet';
import {
  PriceCheckCardView,
  FooterLabel,
  WithdrawFooter,
  footerBodyStyle,
  footerRowStyle,
  textButtonStyle,
} from '@/components/consumer/price-check/PriceCheckCardView';
import { useWithdrawUpdate } from '@/components/consumer/price-check/use-withdraw-update';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { PriceCheckViewerAction, Tier } from '@concert-crawl/types';

const copy = CONSUMER_COPY.disputedPriceCard;

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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const withdraw = useWithdrawUpdate({
    counterId: viewerCounterId,
    focusRef: cardRef,
  });

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

  // Anchor target for the CounterPointerLink rendered inside PendingCardB.
  // Falls back to the checked price's ID if the counter ID wasn't passed.
  const anchorId = `counter-${counterSubmissionId ?? disputedSubmissionId}`;

  // Footer: driven purely by the server's viewerAction.
  const footer =
    viewerAction === 'submit_update' ? (
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
    ) : viewerAction === 'none' ? (
      <div data-testid="price-check-your-price" style={footerRowStyle}>
        <FooterLabel>{copy.footer.yourPriceLabel}</FooterLabel>
        <span style={footerBodyStyle}>{copy.footer.yourPriceBody}</span>
      </div>
    ) : (
      <WithdrawFooter
        state={withdraw.state}
        canWithdraw={viewerCounterId !== null}
        onWithdraw={withdraw.withdraw}
      />
    );

  return (
    <>
      <PriceCheckCardView
        id={anchorId}
        cardRef={cardRef}
        floor={floor}
        ceiling={ceiling}
        tier={tier}
        vendor={vendor}
        kind={kind}
        submitter={submitter}
        confirmsCount={confirmsCount}
        disputer={disputer}
        disputeFloor={disputeFloor}
        disputeCeiling={disputeCeiling}
        disputedAt={disputedAt}
        lastAdminActionKind={lastAdminActionKind}
        footer={footer}
      />

      {/* Stays mounted while open: a filed update flips viewerAction to
          'withdraw' on the next refresh, and the sheet must keep showing its
          result until the fan dismisses it. */}
      {(viewerAction === 'submit_update' || isSheetOpen) && (
        <CounterSubmitSheet
          open={isSheetOpen}
          onClose={handleCloseSheet}
          eventId={eventId}
          disputedSubmissionId={disputedSubmissionId}
          currentFloor={floor}
          {...(ceiling != null ? { currentCeiling: ceiling } : {})}
          currentVendor={vendor}
          currentTier={tier}
          preview={{ kind, submitter, confirmsCount, lastAdminActionKind }}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};
