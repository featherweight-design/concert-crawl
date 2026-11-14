'use client';

import { SignInRedirect } from '@/components/consumer/SignInRedirect';
import { useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { SPNumberField } from './SPNumberField';
import { ChipGroup } from './ChipGroup';
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import { PriceRailMark } from '@/components/consumer/price-rail/PriceRailMark';
import { displayVendor } from '@/components/consumer/vendor-display';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { apiErrorMessage } from '@/components/consumer/lib/api-error-message';
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

type SheetState = 'form' | 'submitting' | 'success' | 'error';

/** The update the viewer just filed, as the POST returns it. */
export interface SubmittedUpdate {
  id: string;
  floor: number;
  ceiling: number | undefined;
  createdAt: string;
}

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
   * the sheet shows that slot locked instead of asking for one.
   */
  currentTier?: Tier | null;
  onSuccess?: () => void;
  /**
   * Draws the pending update on the success screen (the board's preview card).
   * The page owns the card, so the sheet never imports it back.
   */
  renderPreview?: (
    update: SubmittedUpdate,
    onWithdraw: () => void,
  ) => ReactNode;
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

interface FormErrors {
  floor?: string;
  ceiling?: string;
}

const validateForm = (floor: string, ceiling: string): FormErrors => {
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

  return errors;
};

// The POST answers `{ success, data: row }`. Only what the preview needs is read.
const readSubmitted = (body: unknown): SubmittedUpdate | null => {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    return null;
  }
  const row: unknown = body.data;
  if (typeof row !== 'object' || row === null) return null;
  if (!('id' in row) || typeof row.id !== 'string') return null;
  // Prices are `numeric` columns, so they come back as strings ("55.00").
  if (!('priceMin' in row)) return null;
  const floor = Number(row.priceMin);
  if (!Number.isFinite(floor)) return null;
  const ceilingValue = 'priceMax' in row ? row.priceMax : null;
  const ceiling =
    ceilingValue === null || ceilingValue === undefined
      ? undefined
      : Number(ceilingValue);
  const createdAt =
    'createdAt' in row && typeof row.createdAt === 'string'
      ? row.createdAt
      : new Date().toISOString();
  return {
    id: row.id,
    floor,
    ceiling: Number.isFinite(ceiling) ? ceiling : undefined,
    createdAt,
  };
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
  renderPreview,
}: CounterSubmitSheetProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [sheetState, setSheetState] = useState<SheetState>('form');
  const [floor, setFloor] = useState('');
  const [ceiling, setCeiling] = useState('');
  const [howFound, setHowFound] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<SubmittedUpdate | null>(null);
  const [withdraw, setWithdraw] = useState<'idle' | 'busy' | 'failed'>('idle');

  const priceText =
    currentCeiling != null
      ? `$${currentFloor}–$${currentCeiling}`
      : `$${currentFloor}`;
  const vendorName = displayVendor(currentVendor);

  const handleSubmit = useCallback(async () => {
    const errors = validateForm(floor, ceiling);
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
        throw new Error(
          apiErrorMessage(await res.json().catch(() => null)) ??
            'Submission failed',
        );
      }
      setSubmitted(readSubmitted(await res.json().catch(() => null)));
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
    setSubmitted(null);
    setWithdraw('idle');
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    handleClose();
  }, [onSuccess, handleClose]);

  // Withdrawing from the success screen deletes the update just filed and
  // closes the sheet (a6 ruling 33).
  const handleWithdraw = useCallback(() => {
    if (!submitted || withdraw === 'busy') return;
    setWithdraw('busy');
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setWithdraw('failed');
          return;
        }
        const res = await fetch(`${API_URL}/v1/submissions/${submitted.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error('CounterSubmitSheet: withdraw failed', res.status);
          setWithdraw('failed');
          return;
        }
        router.refresh();
        handleClose();
      } catch (err) {
        console.error('CounterSubmitSheet: withdraw failed', err);
        setWithdraw('failed');
      }
    })();
  }, [submitted, withdraw, getToken, router, handleClose]);

  const canSubmit = howFound !== null && sheetState === 'form';

  const headerNode = (
    <SheetHeader
      state={sheetState}
      priceText={priceText}
      vendorName={vendorName}
      onClose={handleClose}
    />
  );

  const footerNode =
    sheetState === 'form' || sheetState === 'submitting' ? (
      <>
        <GradientButton
          onClick={handleSubmit}
          disabled={!canSubmit}
          busy={sheetState === 'submitting'}
        >
          {sheetState === 'submitting'
            ? copy.submittingButton
            : copy.submitButton}
        </GradientButton>
        <p
          style={{
            margin: '10px 0 0',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--fg-subtle)',
            lineHeight: 1.45,
            textAlign: 'center',
          }}
        >
          {copy.honestyFootnote}
        </p>
      </>
    ) : undefined;

  // Gated here rather than at the trigger, matching SubmitPriceModal: the
  // counter POST needs a Clerk token, so a signed-out visitor previously filled
  // the whole form and got silence (#1247). A price check is free; the account
  // is the only thing missing.
  if (open && isLoaded && !isSignedIn) {
    return <SignInRedirect onDone={handleClose} />;
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel={copy.heading}
      sheetHeight={
        sheetState === 'form' || sheetState === 'submitting' ? 'tall' : 'fit'
      }
      header={headerNode}
      footer={footerNode}
    >
      {sheetState === 'success' && (
        <SuccessState
          onClose={handleSuccess}
          withdrawFailed={withdraw === 'failed'}
          preview={
            submitted && renderPreview
              ? renderPreview(submitted, handleWithdraw)
              : null
          }
        />
      )}

      {sheetState === 'error' && (
        <ErrorState onReset={handleReset} onClose={handleClose} />
      )}

      {(sheetState === 'form' || sheetState === 'submitting') && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            opacity: sheetState === 'submitting' ? 0.6 : 1,
            pointerEvents: sheetState === 'submitting' ? 'none' : 'auto',
          }}
        >
          {/* The checked price's slot, locked: the two numbers must compare. */}
          <div>
            <div style={{ display: 'flex', gap: 10 }}>
              {currentTier !== null && (
                <LockedField label={copy.tierLabel} value={currentTier} />
              )}
              <LockedField label={copy.vendorLabel} value={vendorName} />
            </div>
            <p
              style={{
                margin: '6px 0 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--fg-subtle)',
                lineHeight: 1.4,
              }}
            >
              {copy.lockedNote}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <SPNumberField
              id="counter-floor"
              look="board"
              label={copy.floorLabel}
              value={floor}
              onChange={setFloor}
              placeholder={copy.floorPlaceholder}
              required
              error={fieldErrors.floor}
            />
            <SPNumberField
              id="counter-ceiling"
              look="board"
              label={copy.ceilingLabel}
              value={ceiling}
              onChange={setCeiling}
              placeholder={copy.ceilingPlaceholder}
              error={fieldErrors.ceiling}
            />
          </div>

          <ChipGroup
            label={copy.howFoundLabel}
            options={HOW_FOUND_OPTIONS}
            value={howFound}
            onChange={setHowFound}
          />
        </div>
      )}
    </ModalShell>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

const MONO_RAIL = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
} as const;

// The rail (more-st-counter_m, more-st-counter_done_m): the mark tile, a dot
// with an amber ring, the state word, a hairline, the state's code and a boxed
// close. The error rail is --danger (a6 ruling 36); the others are amber.
function SheetHeader({
  state,
  priceText,
  vendorName,
  onClose,
}: {
  state: SheetState;
  priceText: string;
  vendorName: string;
  onClose: () => void;
}) {
  const isError = state === 'error';
  const isSent = state === 'success';
  const tone = isError
    ? 'var(--price-text-danger)'
    : 'var(--price-text-warning)';
  const word = isError
    ? copy.railError
    : isSent
      ? copy.railSent
      : copy.railOpen;
  const code = isError
    ? copy.railErrorCode
    : isSent
      ? copy.railSentCode
      : copy.railOpenCode;
  const heading = isError
    ? copy.errorHeading
    : isSent
      ? copy.successHeading
      : copy.heading;

  return (
    <div data-testid="counter-rail-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PriceRailMark />
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            background: tone,
            boxShadow: `0 0 0 3px color-mix(in oklab, ${tone} 20%, transparent)`,
          }}
        />
        <span
          style={{
            ...MONO_RAIL,
            fontWeight: 600,
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {word}
        </span>
        <span
          aria-hidden="true"
          style={{ flex: 1, height: 1, background: 'var(--border)' }}
        />
        <span
          data-testid="counter-rail-code"
          data-tone={isError ? 'danger' : 'warning'}
          style={{ ...MONO_RAIL, fontWeight: 700, color: tone }}
        >
          {code}
        </span>
        <button
          type="button"
          aria-label={copy.closeAria}
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 30,
            height: 30,
            borderRadius: 8,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--fg-muted)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <p
        style={{
          margin: '18px 0 0',
          fontFamily: 'var(--font-ui)',
          fontSize: 25,
          fontWeight: 900,
          color: 'var(--fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
        }}
      >
        {heading}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.45,
        }}
      >
        {isError ? (
          copy.errorBody
        ) : isSent ? (
          copy.successBody
        ) : (
          <>
            {copy.subtitleLead}
            <b style={{ color: 'var(--fg)' }}>{priceText}</b>
            {copy.subtitleTail(vendorName)}
          </>
        )}
      </p>
    </div>
  );
}

// A slot the viewer cannot change: dashed, quiet, with a check on the right.
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <span
        style={{
          display: 'block',
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
        }}
      >
        {label}
      </span>
      <div
        data-testid="counter-locked-field"
        style={{
          height: 42,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          borderRadius: 12,
          background: 'var(--bg)',
          border: '1px dashed var(--border-strong)',
          fontFamily: 'var(--font-ui)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--fg-muted)',
        }}
      >
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <svg
          aria-hidden="true"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--fg-subtle)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    </div>
  );
}

// Every filled button on the price sheets is the signal-to-pink gradient at
// radius 12, no glyph (more-st-counter_m, more-st-counter_done_m).
function GradientButton({
  children,
  onClick,
  disabled = false,
  busy = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      style={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        width: '100%',
        boxSizing: 'border-box',
        background: 'linear-gradient(90deg, var(--signal), var(--cta-end))',
        color: 'var(--fg-on-accent)',
        borderRadius: 12,
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: '-0.005em',
        boxShadow: disabled ? 'none' : '0 12px 32px -16px var(--signal)',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity .12s',
      }}
    >
      {children}
    </button>
  );
}

function SuccessState({
  onClose,
  preview,
  withdrawFailed,
}: {
  onClose: () => void;
  preview: ReactNode;
  withdrawFailed: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {preview}
      {withdrawFailed && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--price-text-danger)',
          }}
        >
          {copy.withdrawFailed}
        </p>
      )}
      <GradientButton onClick={onClose}>
        {copy.successBackButton}
      </GradientButton>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <GradientButton onClick={onReset}>
        {copy.errorTryAgainButton}
      </GradientButton>
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
  );
}
