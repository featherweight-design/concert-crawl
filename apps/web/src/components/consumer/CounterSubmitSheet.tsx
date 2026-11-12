'use client';

import { useState, useCallback } from 'react';
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
import { SP_POLICY } from '@concert-crawl/types';
import type { Tier } from '@concert-crawl/types';

const copy = CONSUMER_COPY.counterSubmitSheet;

type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue';

const HOW_FOUND_OPTIONS: { value: HowFound; label: string }[] = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
];

const isValidHowFound = (value: string): value is HowFound =>
  HOW_FOUND_OPTIONS.some((opt) => opt.value === value);

type SheetState =
  'form' | 'submitting' | 'success' | 'update_pending' | 'error';

// B9a's 409 for an update the price's check cannot take yet: another fan's
// update holds it (until migration 0100), or the viewer already has one.
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
  onSuccess?: () => void;
}

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
    errors.floor = 'Has to be at least $1.';
  } else if (floorNum > SP_POLICY.floorMax) {
    errors.floor = 'Cap is $2,000.';
  }

  if (ceiling) {
    const ceilingNum = Number(ceiling);
    if (isNaN(ceilingNum) || ceilingNum > SP_POLICY.ceilingMax) {
      errors.ceiling = 'Cap is $2,000.';
    } else if (!errors.floor && ceilingNum < floorNum) {
      errors.ceiling = "Ceiling can't be below floor.";
    }
  }

  if (!howFound) errors.howFound = 'Tell us how you found out.';

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
  onSuccess,
}: CounterSubmitSheetProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [sheetState, setSheetState] = useState<SheetState>('form');
  const [floor, setFloor] = useState('');
  const [ceiling, setCeiling] = useState('');
  const [howFound, setHowFound] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

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
          setSheetState('update_pending');
          return;
        }
        throw new Error(apiErrorMessage(payload) ?? 'Submission failed');
      }
      router.refresh();
      setSheetState('success');
    } catch (err) {
      console.error('CounterSubmitSheet: price update failed', err);
      setSheetState('error');
    }
  }, [
    floor,
    ceiling,
    howFound,
    getToken,
    eventId,
    disputedSubmissionId,
    router,
  ]);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  const handleReset = useCallback(() => {
    setSheetState('form');
    setFieldErrors({});
  }, []);

  const handleClose = useCallback(() => {
    setSheetState('form');
    setFloor('');
    setCeiling('');
    setHowFound(null);
    setFieldErrors({});
    onClose();
  }, [onClose]);

  const rail = RAIL[sheetState];
  const headerNode = (
    <>
      <SheetRail label={rail.label} code={rail.code} tone={rail.tone} />
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

  const footerNode =
    sheetState === 'form' || sheetState === 'submitting' ? (
      <>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sheetState === 'submitting'}
          style={{
            all: 'unset',
            cursor: sheetState === 'submitting' ? 'not-allowed' : 'pointer',
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
            opacity: sheetState === 'submitting' ? 0.45 : 1,
            transition: 'opacity var(--motion-fast) var(--motion-ease)',
          }}
        >
          {sheetState === 'submitting'
            ? copy.submittingButton
            : copy.submitButton}
        </button>
      </>
    ) : undefined;

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
      footer={footerNode}
    >
      {sheetState === 'success' && <SuccessState onClose={handleSuccess} />}

      {sheetState === 'update_pending' && (
        <UpdatePendingState onClose={handleClose} />
      )}

      {sheetState === 'error' && (
        <ErrorState onReset={handleReset} onClose={handleClose} />
      )}

      {(sheetState === 'form' || sheetState === 'submitting') && (
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

          {/* How found chips */}
          <ChipGroup
            label={copy.howFoundLabel}
            options={HOW_FOUND_OPTIONS}
            value={howFound}
            onChange={setHowFound}
            error={fieldErrors.howFound}
          />

          {/* Honesty disclaimer */}
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              lineHeight: 1.6,
              textTransform: 'uppercase' as const,
            }}
          >
            {copy.honestyFootnote}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function SuccessState({ onClose }: { onClose: () => void }) {
  const copy = CONSUMER_COPY.counterSubmitSheet;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {copy.successHeading}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.successBody}
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
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
          borderRadius: 10,
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 14.5,
          letterSpacing: '-0.005em',
          marginTop: 4,
        }}
      >
        {copy.successBackButton}
      </button>
    </div>
  );
}

function ErrorState({
  onReset,
  onClose,
}: {
  onReset: () => void;
  onClose: () => void;
}) {
  const copy = CONSUMER_COPY.counterSubmitSheet;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {copy.errorHeading}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.errorBody}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={onReset}
          style={{
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
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '-0.005em',
          }}
        >
          {copy.errorTryAgainButton}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
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
          }}
        >
          {copy.errorCloseButton}
        </button>
      </div>
    </div>
  );
}

// A read-only field: drawn dashed, with a check, because the update always
// lands in the checked price's tier and vendor (`more-st-counter_m`).
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
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
      </span>
      <div
        className="flex min-w-0 items-center justify-between rounded-md px-3 h-[46px]"
        style={{
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
      </div>
    </div>
  );
}

// The 409 `price_check_update_pending` answer: not an error, so it reads as a
// status (rail "Waiting") with one way back, rather than "Try again".
function UpdatePendingState({ onClose }: { onClose: () => void }) {
  const copy = CONSUMER_COPY.counterSubmitSheet;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {copy.updatePendingHeading}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.updatePendingBody}
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
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
          marginTop: 4,
        }}
      >
        {copy.successBackButton}
      </button>
    </div>
  );
}
