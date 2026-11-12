'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { SPNumberField } from './SPNumberField';
import { ChipGroup } from './ChipGroup';
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy';
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { apiErrorMessage } from '@/components/consumer/lib/api-error-message';
import {
  SheetRail,
  type SheetRailTone,
} from '@/components/consumer/price-check/SheetRail';
import {
  PriceCheckCardView,
  WithdrawFooter,
} from '@/components/consumer/price-check/PriceCheckCardView';
import { useWithdrawUpdate } from '@/components/consumer/price-check/use-withdraw-update';
import { SP_POLICY } from '@concert-crawl/types';
import type { Tier } from '@concert-crawl/types';

const copy = CONSUMER_COPY.counterSubmitSheet;

type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue';

const HOW_FOUND_OPTIONS: { value: HowFound; label: string }[] = [
  { value: 'bought_myself', label: copy.howFoundOptions.boughtMyself },
  { value: 'saw_listing', label: copy.howFoundOptions.sawListing },
  { value: 'at_the_venue', label: copy.howFoundOptions.atTheVenue },
];

const isValidHowFound = (value: string): value is HowFound =>
  HOW_FOUND_OPTIONS.some((opt) => opt.value === value);

type SheetState =
  'form' | 'submitting' | 'success' | 'update_pending' | 'error';

// B9a's 409 for an update the price's check cannot take yet: another fan's
// update holds it (until migration 0100), or the viewer already has one. The
// response carries the same code for both; only its prose `error` differs, so
// the sheet does not try to tell them apart.
const UPDATE_PENDING_CODE = 'price_check_update_pending';

// A failing endpoint can answer with HTML or an empty body, so narrow the
// parsed payload instead of asserting it.
const isUpdatePendingConflict = (status: number, payload: unknown): boolean =>
  status === 409 &&
  typeof payload === 'object' &&
  payload !== null &&
  'code' in payload &&
  payload.code === UPDATE_PENDING_CODE;

const RAIL: Record<
  SheetState,
  { label: string; code: string; tone: SheetRailTone }
> = {
  form: { label: copy.rail.open, code: copy.rail.openCode, tone: 'warning' },
  submitting: {
    label: copy.rail.open,
    code: copy.rail.openCode,
    tone: 'warning',
  },
  success: {
    label: copy.rail.success,
    code: copy.rail.successCode,
    tone: 'warning',
  },
  update_pending: {
    label: copy.rail.updatePending,
    code: copy.rail.updatePendingCode,
    tone: 'warning',
  },
  error: { label: copy.rail.error, code: copy.rail.errorCode, tone: 'danger' },
};

export interface CounterSubmitSheetProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  disputedSubmissionId: string;
  currentFloor: number;
  currentCeiling?: number;
  currentVendor: string;
  /**
   * The checked price's tier, when the page knows it. A price update always
   * lands in the checked price's slot (the API copies its tier and vendor), so
   * the sheet names that slot instead of asking for one.
   */
  currentTier?: Tier | null;
  /**
   * The checked price's context for the success state's card preview
   * (`more-st-counter_done_m`). Without it the success state has no card.
   */
  preview?: PriceCheckPreviewContext;
  onSuccess?: () => void;
}

export interface PriceCheckPreviewContext {
  kind: 'community' | 'boxoffice';
  submitter: { handle: string } | null;
  confirmsCount: number;
  lastAdminActionKind?: 'defer' | null;
}

// The update this sheet just filed, as the success preview draws it.
interface FiledUpdate {
  id: string | null;
  createdAt: string;
  floor: number;
  ceiling?: number | undefined;
}

// The POST answers `{ success, data: <the new row> }`. Narrowed rather than
// asserted: without an id the preview simply draws no Withdraw.
const readFiledRow = (
  payload: unknown,
): { id: string | null; createdAt: string | null } => {
  if (typeof payload !== 'object' || payload === null || !('data' in payload))
    return { id: null, createdAt: null };
  const { data } = payload;
  if (typeof data !== 'object' || data === null)
    return { id: null, createdAt: null };
  const id = 'id' in data && typeof data.id === 'string' ? data.id : null;
  const createdAt =
    'createdAt' in data && typeof data.createdAt === 'string'
      ? data.createdAt
      : null;
  return { id, createdAt };
};

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

// The B+ primary action: the sheet edge's blue-to-pink, as a fill.
const PRIMARY_GRADIENT = 'linear-gradient(90deg, var(--signal), var(--accent))';

// An unknown tier still draws its locked field, as the copy placeholder.
const EMPTY_SLOT = '—';

interface FormErrors {
  floor?: string;
  ceiling?: string;
  howFound?: string;
}

const validateForm = (
  floor: string,
  ceiling: string,
  howFound: string | null,
): FormErrors => {
  const errors: FormErrors = {};
  const floorNum = Number(floor);

  if (!floor || isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
    errors.floor = copy.validation.floorMin;
  } else if (floorNum > SP_POLICY.floorMax) {
    errors.floor = copy.validation.cap;
  }

  if (ceiling) {
    const ceilingNum = Number(ceiling);
    if (isNaN(ceilingNum) || ceilingNum > SP_POLICY.ceilingMax) {
      errors.ceiling = copy.validation.cap;
    } else if (!errors.floor && ceilingNum < floorNum) {
      errors.ceiling = copy.validation.ceilingBelowFloor;
    }
  }

  if (!howFound) errors.howFound = copy.validation.howFoundRequired;

  return errors;
};

export function CounterSubmitSheet({
  open,
  onClose,
  eventId,
  disputedSubmissionId,
  currentFloor,
  currentCeiling,
  currentVendor,
  currentTier = null,
  preview,
  onSuccess,
}: CounterSubmitSheetProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [sheetState, setSheetState] = useState<SheetState>('form');
  const [floor, setFloor] = useState('');
  const [ceiling, setCeiling] = useState('');
  const [howFound, setHowFound] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  // Set once the server has a new answer for this price (a filed update, or a
  // 409 that says one is already in review). The page refreshes when the sheet
  // is dismissed, not on arrival: a refresh flips the card's viewerAction,
  // and refreshing under an open sheet would swap the result for the card.
  const staleRef = useRef(false);
  const [filed, setFiled] = useState<FiledUpdate | null>(null);

  const subtitle =
    currentCeiling != null
      ? copy.subtitleWithRange(currentFloor, currentCeiling, currentVendor)
      : copy.subtitleFloorOnly(currentFloor, currentVendor);

  const handleSubmit = useCallback(async () => {
    const errors = validateForm(floor, ceiling, howFound);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!howFound) return;

    const resolvedHowFound: HowFound = isValidHowFound(howFound)
      ? howFound
      : 'saw_listing';

    setSheetState('submitting');
    try {
      const token = await getToken();
      if (!token) {
        setSheetState('error');
        return;
      }
      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(floor),
            priceMax: ceiling ? Number(ceiling) : undefined,
            howFound: resolvedHowFound,
            disputedSubmissionId,
          }),
        },
      );
      if (!res.ok) {
        const payload: unknown = await res.json().catch(() => null);
        if (isUpdatePendingConflict(res.status, payload)) {
          staleRef.current = true;
          setSheetState('update_pending');
          return;
        }
        throw new Error(apiErrorMessage(payload) ?? 'Submission failed');
      }
      const row = readFiledRow(await res.json().catch(() => null));
      staleRef.current = true;
      setFiled({
        id: row.id,
        createdAt: row.createdAt ?? new Date().toISOString(),
        floor: Number(floor),
        ceiling: ceiling ? Number(ceiling) : undefined,
      });
      setSheetState('success');
    } catch (err) {
      console.error('CounterSubmitSheet: price update failed', err);
      setSheetState('error');
    }
  }, [floor, ceiling, howFound, getToken, eventId, disputedSubmissionId]);

  const handleReset = useCallback(() => {
    setSheetState('form');
    setFieldErrors({});
  }, []);

  const handleClose = useCallback(() => {
    const wasSuccess = sheetState === 'success';
    setSheetState('form');
    setFloor('');
    setCeiling('');
    setHowFound(null);
    setFieldErrors({});
    setFiled(null);
    if (staleRef.current) {
      staleRef.current = false;
      router.refresh();
    }
    if (wasSuccess) onSuccess?.();
    onClose();
  }, [sheetState, router, onSuccess, onClose]);

  // One live region for the sheet's whole life: its text changes, the node
  // does not, so a screen reader announces each result.
  const announcement =
    sheetState === 'success'
      ? `${copy.successHeading} ${copy.successBody}`
      : sheetState === 'update_pending'
        ? `${copy.updatePendingHeading} ${copy.updatePendingBody}`
        : sheetState === 'error'
          ? `${copy.errorHeading} ${copy.errorBody}`
          : '';

  const rail = RAIL[sheetState];
  const headerNode = (
    <>
      <SheetRail
        label={rail.label}
        code={rail.code}
        tone={rail.tone}
        onClose={handleClose}
        closeLabel={copy.closeAriaLabel}
      />
      {(sheetState === 'form' || sheetState === 'submitting') && (
        <>
          <p
            style={{
              margin: '16px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--fg)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </>
      )}
    </>
  );

  // Addendum 2 item 28 (`counter-how-found-m`): Submit stays disabled until a
  // "How you found out" chip is picked.
  const submitDisabled = sheetState === 'submitting' || howFound === null;

  // Gated here rather than at the trigger, matching SubmitPriceModal: the
  // counter POST needs a Clerk token, so a signed-out visitor previously filled
  // the whole form and got silence (#1247). A price check is free; the account
  // is the only thing missing.
  if (open && isLoaded && !isSignedIn) {
    return (
      <TierPickerSheet
        open
        onClose={handleClose}
        planState={LOGGED_OUT_PLAN_STATE}
        // No payment element is reachable signed out; `true` only adds legal
        // copy, matching the other logged-out picker call-sites.
        scaRegion
        entry="logged-out-price"
      />
    );
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel={copy.heading}
      sheetHeight="tall"
      header={headerNode}
    >
      <p role="status" className="sr-only" data-testid="counter-sheet-status">
        {announcement}
      </p>

      {sheetState === 'success' && (
        <ResultState
          heading={copy.successHeading}
          body={copy.successBody}
          primaryLabel={copy.successBackButton}
          onPrimary={handleClose}
        >
          {preview !== undefined && filed !== null && (
            <FiledUpdatePreview
              filed={filed}
              context={preview}
              currentFloor={currentFloor}
              currentCeiling={currentCeiling}
              currentTier={currentTier}
              currentVendor={currentVendor}
              onWithdrawn={handleClose}
            />
          )}
        </ResultState>
      )}

      {sheetState === 'update_pending' && (
        <ResultState
          heading={copy.updatePendingHeading}
          body={copy.updatePendingBody}
          primaryLabel={copy.successBackButton}
          onPrimary={handleClose}
        />
      )}

      {sheetState === 'error' && (
        <ResultState
          heading={copy.errorHeading}
          body={copy.errorBody}
          primaryLabel={copy.errorTryAgainButton}
          onPrimary={handleReset}
          secondaryLabel={copy.errorCloseButton}
          onSecondary={handleClose}
        />
      )}

      {(sheetState === 'form' || sheetState === 'submitting') && (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              opacity: sheetState === 'submitting' ? 0.6 : 1,
              pointerEvents: sheetState === 'submitting' ? 'none' : 'auto',
            }}
          >
            {/* The slot the update lands in: locked to the checked price */}
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <LockedField
                  label={copy.tierLabel}
                  value={currentTier ?? EMPTY_SLOT}
                />
                <LockedField label={copy.vendorLabel} value={currentVendor} />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '11.5px',
                  color: 'var(--fg-subtle)',
                  lineHeight: 1.4,
                  margin: '8px 0 0',
                }}
              >
                {copy.lockedHint}
              </p>
            </div>

            {/* Price fields */}
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <SPNumberField
                  id="counter-floor"
                  label={copy.floorLabel}
                  value={floor}
                  onChange={setFloor}
                  placeholder={copy.floorPlaceholder}
                  required
                  error={fieldErrors.floor}
                />
                <SPNumberField
                  id="counter-ceiling"
                  label={copy.ceilingLabel}
                  value={ceiling}
                  onChange={setCeiling}
                  placeholder={copy.ceilingPlaceholder}
                  error={fieldErrors.ceiling}
                />
              </div>
            </div>

            {/* Addendum 2 item 28 (`counter-how-found-m`): the single-choice
                chips sit between the price fields and Submit. */}
            <ChipGroup
              label={copy.howFoundLabel}
              options={HOW_FOUND_OPTIONS}
              value={howFound}
              onChange={setHowFound}
              error={fieldErrors.howFound}
            />
          </div>

          {/* Submit follows the chips, and the honesty footnote is centred
              under it in small subtle text. Outside the dimmed column, so
              the button's own disabled opacity is the only one it wears. */}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              style={{
                all: 'unset',
                cursor: submitDisabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 48,
                width: '100%',
                boxSizing: 'border-box',
                background: PRIMARY_GRADIENT,
                color: 'var(--fg-on-accent)',
                borderRadius: 12,
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '-0.005em',
                opacity: submitDisabled ? 0.45 : 1,
                transition: 'opacity var(--motion-fast) var(--motion-ease)',
              }}
            >
              {sheetState === 'submitting'
                ? copy.submittingButton
                : copy.submitButton}
            </button>
            <p
              data-testid="counter-honesty-footnote"
              style={{
                margin: '10px 0 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--fg-subtle)',
                textAlign: 'center',
              }}
            >
              {copy.honestyFootnote}
            </p>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

const primaryButtonStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 48,
  width: '100%',
  boxSizing: 'border-box',
  background: PRIMARY_GRADIENT,
  color: 'var(--fg-on-accent)',
  borderRadius: 12,
  fontFamily: 'var(--font-ui)',
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: '-0.005em',
};

const secondaryButtonStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  width: '100%',
  boxSizing: 'border-box',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '-0.005em',
};

interface ResultStateProps {
  heading: string;
  body: string;
  /** Drawn between the body and the buttons (the success card preview). */
  children?: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

// Success, update already in review, and error share one shape. Focus moves
// to the heading when it mounts: the button that triggered the change is gone,
// so focus would otherwise fall back to the dialog root and skip the result.
function ResultState({
  heading,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: ResultStateProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
          outline: 'none',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {body}
      </p>
      {children}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <button type="button" onClick={onPrimary} style={primaryButtonStyle}>
          {primaryLabel}
        </button>
        {secondaryLabel !== undefined && onSecondary !== undefined && (
          <button
            type="button"
            onClick={onSecondary}
            style={secondaryButtonStyle}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// A read-only field: drawn dashed, with a check, because the update always
// lands in the checked price's tier and vendor (`more-st-counter_m`). A
// term/definition pair, so the value is read with its label.
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <dl style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0 }}>
      <dt
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </dt>
      <dd
        className="flex min-w-0 items-center justify-between rounded-md px-3 h-[46px]"
        style={{
          margin: 0,
          border: '1px dashed var(--border-strong)',
          background: 'var(--surface-1)',
          color: 'var(--fg-muted)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        <span className="truncate">{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          style={{ flexShrink: 0, color: 'var(--fg-subtle)' }}
        >
          <path
            d="M2.5 6.2l2.3 2.3 4.7-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </dd>
    </dl>
  );
}

// The success preview (`more-st-counter_done_m`): the event page's price check
// card, drawn with the update just filed as its pending price and the
// viewer's own footer. The API does not return the filer's handle, so the
// strip falls back to the card's anonymous label.
function FiledUpdatePreview({
  filed,
  context,
  currentFloor,
  currentCeiling,
  currentTier,
  currentVendor,
  onWithdrawn,
}: {
  filed: FiledUpdate;
  context: PriceCheckPreviewContext;
  currentFloor: number;
  currentCeiling: number | undefined;
  currentTier: Tier | null;
  currentVendor: string;
  onWithdrawn: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const withdraw = useWithdrawUpdate({
    counterId: filed.id,
    focusRef: cardRef,
    onDone: onWithdrawn,
  });
  return (
    <PriceCheckCardView
      testId="counter-sheet-preview"
      cardRef={cardRef}
      floor={currentFloor}
      ceiling={currentCeiling}
      tier={currentTier}
      vendor={currentVendor}
      kind={context.kind}
      submitter={context.submitter}
      confirmsCount={context.confirmsCount}
      disputer={null}
      disputeFloor={filed.floor}
      disputeCeiling={filed.ceiling}
      disputedAt={filed.createdAt}
      lastAdminActionKind={context.lastAdminActionKind ?? null}
      footer={
        <WithdrawFooter
          state={withdraw.state}
          canWithdraw={filed.id !== null}
          onWithdraw={withdraw.withdraw}
        />
      }
    />
  );
}
