'use client';

import { REPORTING_COPY } from './definitions/copy';
import { REPORT_TOKENS } from './reportTokens';
import { CheckGlyph, Eyebrow, PendingDot } from '@/components/consumer/glyphs';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = REPORTING_COPY.pendingSoldOutCard;
const tokens = REPORT_TOKENS['sold-out'];
/** The dashed stroke and the outlined pill/chip edge, in the status colour. */
const DASH_STROKE = `color-mix(in oklab, ${tokens.color} 60%, transparent)`;

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// ── Props ─────────────────────────────────────────────────────────

export interface PendingSoldOutCardProps {
  floor: number;
  ceiling?: number;
  vendor: string;
  reporter: { handle: string; url: string } | null;
  reportedAt: string; // ISO
  confirms: number;
  needed: number;
  view: 'other' | 'reporter'; // NO self-locked for sold-out per design
  userHasConfirmed?: boolean;
  evidenceMethod?: string | null;
  evidenceUrl?: string | null;
  note?: string | null;
  onConfirm: () => void;
  onWithdraw: () => void;
  onSawDifferent?: () => void;
}

// ── Component ─────────────────────────────────────────────────────

const evidenceLabel = (
  method: string | null | undefined,
  vendor: string,
  note: string | null | undefined,
): string => {
  let base: string;
  switch (method) {
    case 'saw_listing':
      base = `${vendor} listing`;
      break;
    case 'venue_site':
      base = 'Venue website';
      break;
    case 'bought_myself':
      base = 'Bought personally';
      break;
    default:
      base = 'Community evidence';
  }
  return note ? `${base} · '${note}'` : base;
};

export const PendingSoldOutCard = ({
  floor,
  ceiling,
  vendor,
  reporter,
  reportedAt,
  confirms,
  needed,
  view,
  userHasConfirmed = false,
  evidenceMethod,
  evidenceUrl,
  note,
  onConfirm,
  onWithdraw,
  onSawDifferent,
}: PendingSoldOutCardProps) => {
  const timeAgo = formatTimeAgo(reportedAt);

  const priceStr = ceiling != null ? `$${floor}–$${ceiling}` : `$${floor}`;

  const attributionText = reporter
    ? copy.reportedBy(reporter.handle)
    : copy.reportedAnonymously;

  return (
    <div
      style={{
        // Pending is dashed, in the status colour, on a radius-16 card
        // (README rule 3; more-st-ev_sold_pending_m).
        borderRadius: 16,
        background: 'var(--surface-1)',
        border: `1px dashed ${DASH_STROKE}`,
        overflow: 'hidden',
      }}
    >
      {/* Top pending strip */}
      <div
        style={{
          padding: '8px 14px',
          background: tokens.bgStrong,
          borderBottom: `1px dashed ${DASH_STROKE}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* Left: the outlined "SOLD OUT · PENDING" pill, as drawn */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: 6,
            border: `1px solid ${DASH_STROKE}`,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {copy.stripBadge}
        </span>

        {/* Right: dot tracker + "N of M" (matching PendingCardB / PendingReportBanner) */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: tokens.color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {Array.from({ length: needed }).map((_, idx) => (
            <PendingDot
              key={idx}
              size={7}
              filled={idx < confirms}
              color={tokens.color}
            />
          ))}
          <span style={{ marginLeft: 4 }}>
            {copy.confirmsProgress(confirms, needed)}
          </span>
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 14px 12px' }}>
        {/* Tickets eyebrow */}
        <Eyebrow>{CONSUMER_COPY.ticketsEyebrow}</Eyebrow>

        {/* Price row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {/* The price stays at full strength: a pending report has not
              taken it away yet (more-st-ev_sold_pending_m). */}
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 28,
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            {priceStr}
          </span>

          {/* Outlined "Sold out" chip — bottom-aligned in the price row */}
          <span
            style={{
              background: 'transparent',
              border: `1px solid ${DASH_STROKE}`,
              borderRadius: 4,
              padding: '2px 7px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: tokens.color,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              alignSelf: 'flex-end',
            }}
          >
            {copy.soldOutPill}
          </span>
        </div>

        {/* Evidence row */}
        {(evidenceMethod || evidenceUrl) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 10,
              padding: '7px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-muted)',
                letterSpacing: '0.04em',
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {evidenceLabel(evidenceMethod, vendor, note)}
            </span>
            {isSafeHttpUrl(evidenceUrl) ? (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                {copy.viewLink}
              </a>
            ) : (
              evidenceUrl && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    opacity: 0.4,
                    flexShrink: 0,
                  }}
                >
                  {copy.viewLink}
                </span>
              )
            )}
          </div>
        )}

        {/* Reporter attribution: names the reader, so analytics skips it */}
        <div
          className="ph-no-capture"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
            marginTop: 6,
          }}
        >
          {attributionText} · {timeAgo}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: `1px solid ${tokens.border}`,
        }}
      >
        {view === 'other' && !userHasConfirmed && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onSawDifferent}
              style={{
                all: 'unset',
                cursor: onSawDifferent ? 'pointer' : 'default',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {copy.footerQuestion}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tokens.color,
                color: 'var(--fg-on-accent)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '7px 12px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <CheckGlyph size={11} color="var(--fg-on-accent)" />
              {copy.confirmButton}
            </button>
          </div>
        )}

        {view === 'reporter' && (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginBottom: 8,
              }}
            >
              {copy.yourReportLabel}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={onWithdraw}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--warning)',
                  lineHeight: 1,
                }}
              >
                {copy.withdrawButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
