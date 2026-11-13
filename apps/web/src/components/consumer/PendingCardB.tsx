'use client';

import { SP_POLICY } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CCTip, type TipContent } from '@/components/ui/cc-tip';
import {
  Eyebrow,
  LockGlyph,
  PendingDot,
  PRICE_EYEBROW,
  PRICE_HEADLINE_SIZE,
  TrustPill,
} from './glyphs';

const copy = CONSUMER_COPY.pendingCardB;

// ── Helpers ──────────────────────────────────────────────────────
const vendorDisplayName = (vendor: string): string =>
  vendor === 'VenueBoxOffice' ? 'Venue box office' : vendor;

// ── Color constants ──────────────────────────────────────────────
const COMMUNITY_SIGNAL = 'var(--signal)'; // community tier: the theme's signal, not a fixed azure
const GOLD = 'oklch(0.66 0.14 78)'; // box-office tier

// ── Text colours ─────────────────────────────────────────────────
// The board's tokens, through the --price-text-* set in globals.css: dark
// themes draw them as they are, Light leans them toward --fg to pass WCAG AA
// for their size (ratios in globals.css).
const SUBTLE_TEXT = 'var(--price-text-subtle)';
const WARNING_TEXT = 'var(--price-text-warning)';
const SIGNAL_TEXT = 'var(--price-text-signal)';
// price-states-age-trust: 135deg, signal into the B+ CTA end (accent 75% with
// signal, in sRGB: #DE96DF on Electric). Worst-point contrast for the label:
// Electric 8.93 (dark text), Light 4.57 (white text), both AA at 15px bold.
const CONFIRM_GRADIENT =
  'linear-gradient(135deg, var(--signal), var(--cta-end))';
// "YOUR SUBMISSION": mono 9px, 0.14em, subtle, one line (price-states-age-trust).
const YOUR_SUBMISSION_LABEL = {
  flex: '0 0 auto',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  fontWeight: 500,
  color: SUBTLE_TEXT,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
} as const;

// ── Token shape ──────────────────────────────────────────────────
interface PendingTokens {
  color: string;
  /** Strip text colour, AA on the strip fill. */
  text: string;
  bg: string;
  border: string;
  strip: string;
  stripBorder: string;
  pill: string;
}

// A pending resale card is drawn in the community card's cyan; only its pill
// says Resale (price-states-age-trust).
const pendingTokens = (
  kind: 'community' | 'boxoffice' | 'resale',
): PendingTokens => {
  if (kind !== 'boxoffice') {
    return {
      color: COMMUNITY_SIGNAL,
      text: SIGNAL_TEXT,
      // price-states-age-trust: a --surface-1 body, a 55% signal dashed edge,
      // a 7% strip and a 40% dashed strip rule.
      bg: 'var(--surface-1)',
      border: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 55%, transparent)`,
      strip: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 7%, transparent)`,
      stripBorder: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 40%, transparent)`,
      pill: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 16%, transparent)`,
    };
  }

  return {
    color: GOLD,
    // Box office pending is not on the board; its strip keeps the gold.
    text: GOLD,
    bg: `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`,
    border: `color-mix(in oklab, ${GOLD} 38%, var(--border))`,
    strip: `color-mix(in oklab, ${GOLD} 14%, transparent)`,
    stripBorder: `color-mix(in oklab, ${GOLD} 30%, var(--border))`,
    pill: `color-mix(in oklab, ${GOLD} 22%, transparent)`,
  };
};

// ── Counter pointer link (LOCKED §9 Q3 — Appendix A.4) ──────────
// Coral mono pointer that REPLACES the "Saw a different number?" dispute
// entry when a counter-submission already exists for this parent. Schema
// enforces one counter per parent (migration 0041 partial unique index),
// so opening a second dispute form is guaranteed to 409 — see
// memory:project_pr4_dispute_affordance_hiding. Hiding the affordance is
// the UX equivalent.
const COUNTER_POINTER_CORAL = 'oklch(0.65 0.20 25)';

const CounterPointerLink = ({ href }: { href: string }) => (
  <a
    href={href}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      textDecoration: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      color: COUNTER_POINTER_CORAL,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontWeight: 700,
    }}
  >
    <span
      aria-hidden
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: COUNTER_POINTER_CORAL,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
    <span>{CONSUMER_COPY.priceRegion.dispute.counterPointerLabel}</span>
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </a>
);

// ── Props ────────────────────────────────────────────────────────
export interface PendingCardBProps {
  floor: number;
  ceiling?: number | null;
  tier: string;
  vendor: string;
  kind: 'community' | 'boxoffice' | 'resale';
  submitter: { handle: string; url: string } | null;
  /**
   * Kept on the contract for callers. The card no longer prints the age:
   * more-p-price_states draws "Submitted by @hugh" with no time.
   */
  submittedAt: string;
  confirms: number;
  needed: number;
  view: 'other' | 'submitter' | 'self-locked';
  note?: string | null;
  /**
   * Announces the sign-up gate to assistive tech without drawing it (#1247).
   * The button is unchanged visually and still opens the corroboration sheet,
   * which swaps itself for the tier picker when there is no session.
   */
  signedOut?: boolean;
  onConfirm: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
  // LOCKED §9 Q3 — Appendix A.4. When non-null, the `view === 'other'` footer
  // REPLACES the "Saw a different number?" dispute entry with a coral pointer
  // link to the existing counter card. Confirm button stays unchanged.
  counterPointer?: { href: string } | null;
  // §8 state #18 — when an admin defers the contest on the counter for this
  // tier, render a quiet "Admin requested more info" pill near the pending
  // strip's right side. Mirrors the same affordance on DisputedPriceCard so
  // the engagement signal is visible regardless of which tier-card variant
  // a viewer is looking at. Sourced from
  // priceByTier[].counterSubmission.lastAdminActionKind on the parent
  // orchestrator. The pill only renders on the `view === 'other'` variant
  // (the counter is someone else's; the submitter view has its own footer).
  lastAdminActionKind?: 'defer' | null;
}

// ── Component ────────────────────────────────────────────────────
export const PendingCardB = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  view,
  note,
  confirms,
  needed,
  signedOut = false,
  onConfirm,
  onWithdraw,
  onEdit,
  counterPointer = null,
  lastAdminActionKind = null,
}: PendingCardBProps) => {
  const tok = pendingTokens(kind);
  const isBox = kind === 'boxoffice';
  const isSubmitter = view === 'submitter' || view === 'self-locked';
  const remaining = needed - confirms;
  // The confirm denominator is only elevated above the standard requirement
  // when the show is imminent, so a bumped `needed` is a reliable signal —
  // no extra prop threading needed at the call sites. Surfacing this keeps
  // the "3 of 3 confirmed" strip from reading as a bug (#895 symptom 2).
  const isImminent = needed > SP_POLICY.confirmsRequired;

  // ── Card background / border ─────────────────────────────────
  const cardStyle = isBox
    ? {
        borderRadius: '16px',
        overflow: 'hidden' as const,
        padding: 0,
        background: tok.bg,
        // Pending is dashed in the tier's colour (more-p-price_states).
        border: `1px dashed ${tok.border}`,
        boxShadow: `inset 0 1px 0 color-mix(in oklab, ${GOLD} 40%, transparent)`,
      }
    : {
        // price-states-age-trust: radius 16.
        borderRadius: '16px',
        overflow: 'hidden' as const,
        padding: 0,
        background: 'var(--surface-1)',
        border: `1px dashed ${tok.border}`,
        boxShadow: 'none',
      };

  return (
    <div style={cardStyle}>
      {/* ── Pending strip ── */}
      <div
        style={{
          // more-p-price_states: a 33px strip, 16px gutters, 13px line. The
          // imminent "Days away" pill (undrawn) is about 17px tall, so with
          // it the strip grows to about 37px.
          padding: '10px 16px',
          lineHeight: '13px',
          background: tok.strip,
          borderBottom: `1px dashed ${tok.stripBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {/* Strip left group: the dots lead, then one mono line
            "PENDING · 1 OF 2 CONFIRMED" (9.5px, 0.12em, bold), as drawn */}
        <div
          data-testid="pending-strip-left"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9.5px',
            color: tok.text,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span
            data-testid="pending-strip-dots"
            style={{ display: 'inline-flex', gap: '10px' }}
          >
            {Array.from({ length: needed }).map((_, idx) => (
              <PendingDot
                key={idx}
                size={9}
                filled={idx < confirms}
                color={tok.color}
              />
            ))}
          </span>
          <span>
            {copy.pending}
            {copy.separator}
            {confirms} {copy.of} {needed} {copy.confirmed}
          </span>
          {isImminent && (
            <CCTip
              tip={
                {
                  label: copy.imminentTag,
                  variant: 'text',
                  body: copy.imminentTooltip(
                    SP_POLICY.imminentThresholdDays,
                    SP_POLICY.confirmsRequiredImminent,
                    SP_POLICY.confirmsRequired,
                  ),
                } satisfies TipContent
              }
              triggerStyle={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 7px',
                borderRadius: 999,
                background:
                  'color-mix(in oklab, var(--warning) 12%, transparent)',
                color: 'var(--warning)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {copy.imminentTag}
            </CCTip>
          )}
        </div>

        {/* Strip right — `view === 'other'` + admin-deferred counter renders
            the engagement-signal pill in place of the "N to go" caption so the
            tile reads consistently with DisputedPriceCard. §8 state #18. */}
        {view === 'other' && lastAdminActionKind === 'defer' ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background:
                'color-mix(in oklab, var(--warning) 10%, transparent)',
              color: 'var(--warning)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {CONSUMER_COPY.priceRegion.adminDeferPillLabel}
          </span>
        ) : (
          <span
            data-testid="pending-strip-to-go"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9.5px',
              fontWeight: 500,
              color: 'var(--fg-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {remaining} {copy.toGo}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px' }}>
        {/* TICKETS line: the eyebrow left, the shared TrustPill right, on
            every pending card, yours included (addendum 4 item 5). */}
        <div
          data-testid="pending-tickets-line"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <Eyebrow
            color={isBox ? tok.color : SUBTLE_TEXT}
            size={PRICE_EYEBROW.size}
            tracking={PRICE_EYEBROW.tracking}
          >
            {isBox ? copy.boxOfficeLabel : copy.ticketsLabel}
          </Eyebrow>
          <TrustPill kind={kind} />
        </div>

        {/* Headline row, 6px under the TICKETS line (price-states-age-trust) */}
        <div
          style={{
            marginTop: '6px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span
            data-testid="pending-price-headline"
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 900,
              fontSize: `${PRICE_HEADLINE_SIZE}px`,
              color: 'var(--fg)',
              letterSpacing: '-0.035em',
            }}
          >
            {ceiling != null && ceiling > floor
              ? `$${floor}–$${ceiling}`
              : `$${floor}`}
          </span>
          {/* One mono-caps qualifier, "GA · SEEN ON TICKETMASTER", inline
              after the price (price-states-age-trust: 10px, 0.1em, muted). */}
          <span
            data-testid="pending-qualifier"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: 'var(--fg-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            {tier}
            {copy.separator}
            {copy.seenOnPrefix} {vendorDisplayName(vendor)}
          </span>
          {isBox && (
            <span
              style={{
                fontFamily: 'Inter, system-ui',
                fontWeight: 600,
                fontSize: '12px',
                color: tok.color,
                letterSpacing: '-0.005em',
              }}
            >
              {copy.faceValueNoFees}
            </span>
          )}
        </div>

        {/* Attribution line: "Submitted by @hugh" / "Submitted by you", Inter
            13px, muted, no time, 4px under the price (price-states-age-trust). */}
        <div
          data-testid="pending-attribution"
          style={{
            marginTop: '4px',
            fontFamily: 'Inter, system-ui',
            fontSize: '13px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.submittedByPrefix}{' '}
          {isSubmitter ? (
            copy.you
          ) : submitter !== null ? (
            submitter.url ? (
              <a
                href={submitter.url}
                className="ph-no-capture"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {submitter.handle}
              </a>
            ) : (
              <span className="ph-no-capture">{submitter.handle}</span>
            )
          ) : (
            copy.anonymousFan
          )}
        </div>

        {/* Optional note */}
        {note != null && note !== '' && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontFamily: 'Inter, system-ui',
              fontSize: '12.5px',
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
              lineHeight: 1.45,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{note}&rdquo;
          </div>
        )}

        {/* Footer (price-states-age-trust), 14px under the attribution.
            Someone else's price: two equal buttons, 8px apart, no rule. Your
            own: a solid rule, then the label, the wait line and Edit /
            Withdraw, 10px apart. */}
        <div
          data-testid="pending-footer"
          style={
            view === 'other'
              ? {
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '8px',
                  // Both buttons start from a 140px basis and share the row
                  // equally (170px each in the board's 348px row). At 320 the
                  // row is about 250px, under the pair's minimum (Saw's
                  // nowrap label is about 166px), so the second wraps under
                  // Confirm and each fills its row. The counter pointer link
                  // stays content-wide.
                  flexWrap: 'wrap',
                }
              : {
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  // 10px between items; at 320 the actions wrap to their own
                  // row rather than crush the wait line.
                  gap: '10px',
                  flexWrap: 'wrap',
                }
          }
        >
          {view === 'other' && (
            <>
              <button
                type="button"
                onClick={onConfirm}
                data-testid="pending-confirm"
                {...(signedOut
                  ? { 'aria-label': copy.ariaConfirmPriceSignedOut }
                  : {})}
                // all:unset drops the focus ring; the class restores it.
                className="pending-card-action"
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  flex: '1 1 140px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  background: CONFIRM_GRADIENT,
                  boxShadow:
                    '0 8px 24px color-mix(in oklab, var(--signal) 22%, transparent)',
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 700,
                  fontSize: '15px',
                  whiteSpace: 'nowrap',
                }}
              >
                {copy.confirmPrice}
              </button>
              {counterPointer != null ? (
                // Until migration 0100 lands the schema allows one pending
                // counter per price, so point at the existing one rather than
                // open a form that would 409. Several fans may each file one
                // after 0100; B9b replaces this with "Submit an update".
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CounterPointerLink href={counterPointer.href} />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onEdit}
                  data-testid="pending-saw-different"
                  {...(signedOut
                    ? { 'aria-label': copy.ariaSawDifferentNumberSignedOut }
                    : {})}
                  className="pending-card-action"
                  style={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    flex: '1 1 140px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--fg)',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copy.sawDifferentNumber}
                </button>
              )}
            </>
          )}

          {view === 'self-locked' && (
            <>
              {/* Undrawn view: its label follows the drawn submitter one */}
              <span style={YOUR_SUBMISSION_LABEL}>
                {copy.yourSubmissionLabel}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
                  border: '1px dashed var(--border-strong)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--fg-muted)',
                  letterSpacing: '-0.005em',
                }}
              >
                <LockGlyph size={14} />
                {copy.waitingOnFans(remaining)}
              </span>
            </>
          )}

          {view === 'submitter' && (
            <>
              <span
                data-testid="pending-your-submission"
                style={YOUR_SUBMISSION_LABEL}
              >
                {copy.yourSubmissionLabel}
              </span>
              <span
                data-testid="pending-waiting"
                style={{
                  // At least 120px: in the board's 348px row the label (about
                  // 100px), the wait line and the actions share one line
                  // (about 337px); below that the actions wrap.
                  flex: '1 1 120px',
                  minWidth: '120px',
                  fontFamily: 'Inter, system-ui',
                  fontSize: '13px',
                  color: 'var(--fg-muted)',
                }}
              >
                {copy.waitingOnFans(remaining)}
              </span>
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={onEdit}
                  className="pending-card-action"
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--fg)',
                  }}
                >
                  {copy.editButton}
                </button>
                <button
                  type="button"
                  onClick={onWithdraw}
                  className="pending-card-action"
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: WARNING_TEXT,
                  }}
                >
                  {copy.withdrawButton}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
