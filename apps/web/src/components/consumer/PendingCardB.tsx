'use client';

import { SP_POLICY } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CCTip, type TipContent } from '@/components/ui/cc-tip';
import {
  Eyebrow,
  LockGlyph,
  PendingDot,
  PendingTrustPill,
  PRICE_EYEBROW,
  PRICE_HEADLINE_SIZE,
} from './glyphs';

const copy = CONSUMER_COPY.pendingCardB;

// ── Helpers ──────────────────────────────────────────────────────
const vendorDisplayName = (vendor: string): string =>
  vendor === 'VenueBoxOffice' ? 'Venue box office' : vendor;

// ── Color constants ──────────────────────────────────────────────
const COMMUNITY_SIGNAL = 'var(--signal)'; // community tier: the theme's signal, not a fixed azure
const GOLD = 'oklch(0.66 0.14 78)'; // box-office tier

// ── AA text colours (WCAG 1.4.3, 4.5:1 for text under 18.66px bold) ──
// Each one nudges its token toward --fg, which raises contrast on every theme
// (dark text darkens on a light ground, light text lightens on a dark one).
// Ratios computed on --surface-1, Light / Electric:
// - --fg-subtle alone is 2.79 / 3.17; at 75% it is 4.71 / 5.02.
const SUBTLE_TEXT = 'color-mix(in oklab, var(--fg-subtle) 75%, var(--fg))';
// - --warning alone is 3.65 on Light (Withdraw, 13.5px bold); at 85%, 4.82.
const WARNING_TEXT = 'color-mix(in oklab, var(--warning) 85%, var(--fg))';
// - --signal on the 7% strip is 3.83 on Light; at 85%, 4.98 (Electric 11.1).
const SIGNAL_TEXT = `color-mix(in oklab, ${COMMUNITY_SIGNAL} 85%, var(--fg))`;
// - White --fg-on-accent on the Confirm gradient bottoms out at 4.45 on Light;
//   both stops at 95% toward --fg lift the worst point to 4.86 (Electric 10.2).
const CONFIRM_GRADIENT =
  'linear-gradient(135deg, color-mix(in oklab, var(--signal) 95%, var(--fg)), color-mix(in oklab, var(--cta-end) 95%, var(--fg)))';

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

const pendingTokens = (kind: 'community' | 'boxoffice'): PendingTokens => {
  if (kind === 'community') {
    return {
      color: COMMUNITY_SIGNAL,
      text: SIGNAL_TEXT,
      bg: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 6%, var(--surface-1))`,
      border: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 32%, var(--border))`,
      // more-p-price_states samples the strip at #18243C: signal at ~7%.
      strip: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 7%, transparent)`,
      stripBorder: `color-mix(in oklab, ${COMMUNITY_SIGNAL} 26%, var(--border))`,
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
  kind: 'community' | 'boxoffice';
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
        borderRadius: '12px',
        overflow: 'hidden' as const,
        padding: 0,
        background: tok.bg,
        // Pending is dashed in the tier's colour (more-p-price_states).
        border: `1px dashed ${tok.border}`,
        boxShadow: `inset 0 1px 0 color-mix(in oklab, ${GOLD} 40%, transparent)`,
      }
    : {
        borderRadius: '12px',
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
            "PENDING · 1 OF 2 CONFIRMED" (9.5px, 0.14em), as drawn */}
        <div
          data-testid="pending-strip-left"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9.5px',
            color: tok.text,
            letterSpacing: '0.14em',
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
      <div style={{ padding: '16px 16px 14px' }}>
        {/* Top row (eyebrow row). The board holds it at the live card's
            19px badge-row height, so TICKETS sits 24px under the strip. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '19px',
          }}
        >
          <Eyebrow
            color={isBox ? tok.color : SUBTLE_TEXT}
            size={PRICE_EYEBROW.size}
            tracking={PRICE_EYEBROW.tracking}
          >
            {isBox ? copy.boxOfficeLabel : copy.ticketsLabel}
          </Eyebrow>
        </div>

        {/* Headline row — the live card's scale (more-p-price_states draws
            pending and live $44 at the same 34px) */}
        <div
          style={{
            marginTop: '11px',
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
              letterSpacing: '-0.025em',
              lineHeight: 1,
            }}
          >
            {ceiling != null && ceiling > floor
              ? `$${floor}–$${ceiling}`
              : `$${floor}`}
          </span>
          {/* One mono-caps qualifier, "GA · SEEN ON TICKETMASTER", inline
              after the price (more-p-price_states: 9.5px, 0.14em, muted). */}
          <span
            data-testid="pending-qualifier"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9.5px',
              color: 'var(--fg-muted)',
              letterSpacing: '0.14em',
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
          <PendingTrustPill kind={kind} />
        </div>

        {/* Attribution line: "Submitted by @hugh" / "Submitted by you", sans
            12.5px, muted, no time (more-p-price_states). Price baseline to
            its caps is 17px, as on the live card. */}
        <div
          data-testid="pending-attribution"
          style={{
            marginTop: '9px',
            fontFamily: 'Inter, system-ui',
            fontSize: '12.5px',
            lineHeight: 1.25,
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

        {/* Footer. Someone else's price: two 40px buttons, no rule, 15px
            under the attribution. Your own: a solid rule, then the label,
            the wait line and Edit / Withdraw (more-p-price_states). */}
        <div
          data-testid="pending-footer"
          style={
            view === 'other'
              ? {
                  marginTop: '15px',
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '8px',
                  // At 320 the pair (about 309px) outgrows the 250px row, so
                  // the second item wraps under Confirm. "Saw a different
                  // number?" then fills the row; the counter pointer link
                  // stays content-wide.
                  flexWrap: 'wrap',
                }
              : {
                  marginTop: '15px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  // 16px between items; at 320 the actions wrap to their own
                  // row rather than crush the wait line.
                  columnGap: '16px',
                  rowGap: '10px',
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
                  // Takes the row's spare width (the board's Confirm is 33px
                  // wider than its label; the second button is content-wide).
                  flex: '100 1 auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  // Sampled left to right: signal into accent at about 65%,
                  // with a signal glow under the pill; stops nudged for AA.
                  background: CONFIRM_GRADIENT,
                  boxShadow:
                    '0 6px 18px color-mix(in oklab, var(--signal) 22%, transparent)',
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 700,
                  fontSize: '14px',
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
                    // Grow weight 1 against Confirm's 100: on a shared row it
                    // takes 1/101 of the spare width (under 1px at the board's
                    // 342px row), and once wrapped onto its own row it is the
                    // only item there, so it fills it.
                    flex: '1 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-1)',
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
              <span
                style={{
                  flex: '0 0 80px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9.5px',
                  lineHeight: '12px',
                  color: SUBTLE_TEXT,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
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
              {/* 80px label column that wraps to two mono lines, as drawn */}
              <span
                data-testid="pending-your-submission"
                style={{
                  flex: '0 0 80px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9.5px',
                  lineHeight: '12px',
                  color: SUBTLE_TEXT,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.yourSubmissionLabel}
              </span>
              <span
                data-testid="pending-waiting"
                style={{
                  // At least 120px: at the board's 342px row the label, the
                  // wait line and the actions share one line (330px); below
                  // that the actions wrap.
                  flex: '1 1 120px',
                  minWidth: '120px',
                  fontFamily: 'Inter, system-ui',
                  fontSize: '13.5px',
                  lineHeight: 1.2,
                  color: 'var(--fg-muted)',
                }}
              >
                {copy.waitingOnFans(remaining)}
              </span>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={onEdit}
                  className="pending-card-action"
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 700,
                    fontSize: '13.5px',
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
                    fontSize: '13.5px',
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
