'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Users } from 'lucide-react';
import { CheckGlyph, PendingTrustPill } from './glyphs';
import { PriceRailMark } from './price-rail/PriceRailMark';
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy';
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants';

const copy = CONSUMER_COPY.corroborationSheet;

// ── Helpers ──────────────────────────────────────────────────────
const vendorDisplayName = (vendor: string): string =>
  vendor === 'VenueBoxOffice' ? 'Venue box office' : vendor;

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// ── Color constants ──────────────────────────────────────────────
// HELD FOR DESIGN: the selected option's and the CTA's accent. The 08 board
// (more-p-check_m) draws it pink and the 06 board (bp-s-confirm_price_m) draws
// it green, and no ruling picks one, so it stays the azure it is on main.
const AZURE = 'oklch(0.62 0.12 240)';
const GOLD = 'oklch(0.66 0.14 78)';

const RAIL_TEXT = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--fg-muted)',
  whiteSpace: 'nowrap' as const,
};

// ── Token shape ──────────────────────────────────────────────────
interface PendingTokens {
  color: string;
  bg: string;
  border: string;
}

// A resale submission takes the community tokens; only its pill says Resale.
const pendingTokens = (
  kind: 'community' | 'boxoffice' | 'resale',
): PendingTokens => {
  if (kind !== 'boxoffice') {
    // The community card is drawn in the theme's signal, not the old fixed
    // azure (B+ more-p-check_m).
    return {
      color: 'var(--price-text-signal)',
      bg: `color-mix(in oklab, var(--signal) 10%, var(--surface-1))`,
      border: `color-mix(in oklab, var(--signal) 38%, var(--border))`,
    };
  }

  return {
    color: GOLD,
    bg: `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`,
    border: `color-mix(in oklab, ${GOLD} 38%, var(--border))`,
  };
};

// ── Verify option type ────────────────────────────────────────────
type VerifyMethod =
  'same_vendor' | 'other_vendor' | 'saw_listing' | 'bought_myself';

type ApiConfirmMethod = 'same-vendor' | 'other-vendor' | 'box-office';

const VERIFY_METHOD_TO_API: Record<VerifyMethod, ApiConfirmMethod> = {
  same_vendor: 'same-vendor',
  other_vendor: 'other-vendor',
  saw_listing: 'box-office',
  bought_myself: 'box-office',
};

// ── Props ────────────────────────────────────────────────────────
export interface CorroborationSheetProps {
  submission: {
    floor: number;
    ceiling?: number;
    tier: string;
    vendor: string;
    kind: 'community' | 'boxoffice' | 'resale';
    submitter: { handle: string; url: string } | null;
    submittedAt: string;
    confirms: number;
    needed: number;
    note?: string | null;
    submissionId: string;
  };
  open: boolean;
  isSelfLocked?: boolean;
  onClose: () => void;
  onConfirm: (method: ApiConfirmMethod) => void;
  /** The self-locked sheet's Withdraw. Without it the button is not drawn. */
  onWithdraw?: () => void;
  onSubmitUpdate: () => void;
  /** The self-locked sheet's Edit. Without it the button is not drawn. */
  onEdit?: () => void;
}

// ── Sub-component: SubmissionDetailCard ──────────────────────────
interface SubmissionDetailCardProps {
  floor: number;
  ceiling?: number;
  tier: string;
  vendor: string;
  kind: 'community' | 'boxoffice' | 'resale';
  submitter: { handle: string; url: string } | null;
  submittedAt: string;
  note?: string | null | undefined;
  accentColor: string;
}

const SubmissionDetailCard = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  submittedAt,
  note,
  accentColor,
}: SubmissionDetailCardProps) => {
  const tokens = pendingTokens(kind);

  const byNode = (() => {
    // Both take the row's Inter value style; the handle stays out of session
    // capture.
    if (submitter === null) return <span>{copy.viaAnonymous}</span>;
    return (
      <span className="ph-no-capture">
        {copy.viaHandlePrefix}
        {submitter.handle}
      </span>
    );
  })();

  const labelStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '10px',
    color: 'var(--fg-subtle)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  };
  const valueStyle = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--fg)',
    textAlign: 'right' as const,
  };

  return (
    <div
      style={{
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Price and tier left, the trust pill top right (B+ more-p-check_m) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: '30px',
                color: 'var(--fg)',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
              }}
            >
              {ceiling !== undefined && ceiling > floor
                ? `$${floor}–$${ceiling}`
                : `$${floor}`}
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {tier}
            </span>
          </div>
          <PendingTrustPill kind={kind} />
        </div>

        {/* VENDOR / BY / WHEN: hairline-divided rows, values right-aligned */}
        <div>
          {[
            [copy.vendorLabel, vendorDisplayName(vendor)],
            [copy.byLabel, byNode],
            [copy.whenLabel, formatTimeAgo(submittedAt)],
          ].map(([label, value]) => (
            <div
              key={label as string}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '8px 0',
                borderTop: `1px solid ${tokens.border}`,
              }}
            >
              <span style={labelStyle}>{label}</span>
              <span style={valueStyle}>{value}</span>
            </div>
          ))}
        </div>

        {/* Box-office face-value note */}
        {kind === 'boxoffice' && (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: accentColor,
            }}
          >
            {copy.boxOfficeFaceValueNote}
          </span>
        )}

        {/* Submission note */}
        {note != null && note !== '' && (
          <div
            style={{
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontStyle: 'italic',
                fontSize: '13px',
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              &ldquo;{note}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-component: VerifyOption row ──────────────────────────────
interface VerifyOptionProps {
  method: VerifyMethod;
  label: string;
  description: string;
  isSelected: boolean;
  /** The one option in the Tab order: the selected one, else the first. */
  tabbable: boolean;
  accentColor: string;
  onSelect: (method: VerifyMethod) => void;
}

const VerifyOption = ({
  method,
  label,
  description,
  isSelected,
  tabbable,
  accentColor,
  onSelect,
}: VerifyOptionProps) => {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      // Roving tab stop: the group is one Tab stop, arrows move within it.
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onSelect(method)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          onSelect(method);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '14px',
        border: isSelected
          ? `1.5px solid ${accentColor}`
          : '1px solid var(--border)',
        background: isSelected
          ? `color-mix(in oklab, ${accentColor} 10%, transparent)`
          : 'var(--surface-1)',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Radio: a ring, with an inner dot when selected (B+ more-p-check_m) */}
      <div
        data-testid="verify-radio"
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: '1px',
          border: isSelected
            ? `2px solid ${accentColor}`
            : '1.5px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected && (
          <span
            data-testid="verify-radio-dot"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: accentColor,
            }}
          />
        )}
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'var(--fg)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────
export const CorroborationSheet = ({
  submission,
  open,
  isSelfLocked = false,
  onClose,
  onConfirm,
  onWithdraw,
  onSubmitUpdate,
  onEdit,
}: CorroborationSheetProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod | null>(
    null,
  );

  const accentColor = submission.kind === 'boxoffice' ? GOLD : AZURE;
  // The rail's dot and code: the accent while confirmable, amber when the
  // viewer's own price (bp-s-confirm_self_m).
  const stateColor = isSelfLocked ? 'var(--warning)' : accentColor;

  const isBoxOfficeSubmission = submission.kind === 'boxoffice';

  const verifyOptions: Array<{
    method: VerifyMethod;
    label: string;
    description: string;
  }> = [
    {
      method: 'same_vendor',
      label: isBoxOfficeSubmission
        ? copy.options.sameVendor.boxOfficeLabel
        : copy.options.sameVendor.label(submission.vendor),
      description: isBoxOfficeSubmission
        ? copy.options.sameVendor.boxOfficeDescription
        : copy.options.sameVendor.description(submission.vendor),
    },
    {
      method: 'other_vendor',
      label: copy.options.otherVendor.label,
      description: copy.options.otherVendor.description,
    },
    {
      method: 'saw_listing',
      label: copy.options.sawListing.label,
      description: copy.options.sawListing.description,
    },
    ...(!isBoxOfficeSubmission
      ? [
          {
            method: 'bought_myself' as VerifyMethod,
            label: copy.options.boughtMyself.label,
            description: copy.options.boughtMyself.description,
          },
        ]
      : []),
  ];

  // Gated here rather than at each trigger, matching SubmitPriceModal: two
  // surfaces open this sheet, and the confirm POST needs a Clerk token, so a
  // signed-out visitor previously picked a verify method and got silence
  // (#1247). Corroborating is free; the account is the only thing missing.
  if (open && isLoaded && !isSignedIn) {
    return (
      <TierPickerSheet
        open
        onClose={onClose}
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
      onClose={onClose}
      ariaLabel="Corroborate price submission"
      sheetHeight="tall"
      header={
        <>
          {/* The rail (B+ bp-s-confirm_price_m, bp-s-confirm_self_m): the mark,
              a state dot, the sheet's name, a hairline, the state's code, and
              a close tile. The state colour is the accent while confirmable
              and amber when the price is the viewer's own. */}
          <div
            data-testid="confirm-rail"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <PriceRailMark />
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                flexShrink: 0,
                background: stateColor,
                boxShadow: `0 0 0 3px color-mix(in oklab, ${stateColor} 22%, transparent)`,
              }}
            />
            <span style={RAIL_TEXT}>{copy.eyebrow}</span>
            <span
              aria-hidden="true"
              style={{
                flex: 1,
                height: 1,
                background: 'var(--border)',
              }}
            />
            <span
              data-testid="confirm-rail-status"
              style={{ ...RAIL_TEXT, color: stateColor }}
            >
              {isSelfLocked
                ? copy.selfLocked.railTag
                : copy.status(submission.confirms, submission.needed)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeAriaLabel}
              style={{
                width: 30,
                height: 30,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontSize: 24,
                letterSpacing: '-0.025em',
                color: 'var(--fg)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {isSelfLocked
                ? copy.selfLocked.heading(submission.floor, submission.ceiling)
                : copy.heading(submission.floor, submission.ceiling)}
            </h2>
            {!isSelfLocked && (
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13.5,
                  color: 'var(--fg-muted)',
                  margin: 0,
                }}
              >
                {copy.subtitle}
              </p>
            )}
          </div>
        </>
      }
      footer={
        isSelfLocked ? (
          /* Self-locked footer: Edit + Withdraw */
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            {/* Each button is drawn only with its own handler: neither falls
                back to something else (a Withdraw that only closed the sheet
                would look like it worked). */}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 999,
                  height: 44,
                  padding: '0 22px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                }}
              >
                {copy.selfLocked.editButton}
              </button>
            )}
            {onWithdraw && (
              <button
                type="button"
                onClick={onWithdraw}
                style={{
                  background: 'transparent',
                  border:
                    '1px solid color-mix(in oklab, var(--warning) 60%, transparent)',
                  borderRadius: 999,
                  height: 44,
                  padding: '0 22px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--price-text-warning)',
                  cursor: 'pointer',
                }}
              >
                {copy.selfLocked.withdrawButton}
              </button>
            )}
          </div>
        ) : (
          /* Fresh state footer: Confirm CTA + escape link + disclaimer */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (selectedMethod !== null) {
                  onConfirm(VERIFY_METHOD_TO_API[selectedMethod]);
                }
              }}
              disabled={selectedMethod === null}
              style={{
                background: accentColor,
                height: 48,
                borderRadius: 10,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 14.5,
                color: 'var(--fg-on-accent)',
                border: 'none',
                cursor: selectedMethod !== null ? 'pointer' : 'not-allowed',
                opacity: selectedMethod !== null ? 1 : 0.45,
                width: '100%',
                transition: 'opacity 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckGlyph size={13} color="var(--fg-on-accent)" />
              {copy.confirmButton}
            </button>
            <button
              type="button"
              onClick={onSubmitUpdate}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                width: '100%',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                textAlign: 'center' as const,
                lineHeight: 1.4,
              }}
            >
              {copy.escapeLead}{' '}
              <span
                style={{ fontWeight: 800, color: 'var(--price-text-signal)' }}
              >
                {copy.escapeAction}
              </span>
            </button>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Submission detail card */}
        <SubmissionDetailCard
          floor={submission.floor}
          {...(submission.ceiling !== undefined
            ? { ceiling: submission.ceiling }
            : {})}
          tier={submission.tier}
          vendor={submission.vendor}
          kind={submission.kind}
          submitter={submission.submitter}
          submittedAt={submission.submittedAt}
          note={submission.note}
          accentColor={accentColor}
        />

        {isSelfLocked ? (
          /* Self-locked waiting notice */
          <div
            data-testid="self-locked-notice"
            style={{
              background: 'color-mix(in oklab, var(--warning) 6%, transparent)',
              border:
                '1px dashed color-mix(in oklab, var(--warning) 55%, transparent)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Users
              size={18}
              aria-hidden="true"
              style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }}
            />
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 15,
                color: 'var(--fg-muted)',
                lineHeight: 1.45,
              }}
            >
              {copy.selfLocked.waitingNotice(
                submission.needed - submission.confirms,
              )}
            </span>
          </div>
        ) : (
          <>
            {/* Verify options (fresh state) */}
            <div
              role="radiogroup"
              aria-label={copy.verifyOptionsAriaLabel}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              onKeyDown={(evt) => {
                const step =
                  evt.key === 'ArrowDown' || evt.key === 'ArrowRight'
                    ? 1
                    : evt.key === 'ArrowUp' || evt.key === 'ArrowLeft'
                      ? -1
                      : 0;
                if (step === 0) return;
                const radios = Array.from(
                  evt.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="radio"]',
                  ),
                );
                const from = radios.findIndex(
                  (radio) => radio === document.activeElement,
                );
                const next =
                  radios[(from + step + radios.length) % radios.length];
                if (from === -1 || !next) return;
                evt.preventDefault();
                next.focus();
                next.click();
              }}
            >
              {verifyOptions.map((opt, index) => (
                <VerifyOption
                  key={opt.method}
                  method={opt.method}
                  label={opt.label}
                  description={opt.description}
                  isSelected={selectedMethod === opt.method}
                  tabbable={
                    selectedMethod === null
                      ? index === 0
                      : selectedMethod === opt.method
                  }
                  accentColor={accentColor}
                  onSelect={setSelectedMethod}
                />
              ))}
            </div>

            {/* Honesty line: plain, centred and quiet (B+ more-p-check_m) */}
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                fontFamily: 'Inter, system-ui',
                fontSize: 12,
                color: 'var(--fg-subtle)',
                letterSpacing: '-0.005em',
                lineHeight: 1.45,
              }}
            >
              {copy.honestyDisclaimer}
            </p>
          </>
        )}
      </div>
    </ModalShell>
  );
};
