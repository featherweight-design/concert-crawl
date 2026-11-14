'use client';

import { REPORTING_COPY } from './definitions/copy';
import { REPORT_TOKENS } from './reportTokens';
import { ReportGlyph } from './ReportTypeMark';
import { CheckGlyph, LockGlyph } from '../glyphs';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

// ── Kind glyphs at 14×14 ──────────────────────────────────────────

const copy = REPORTING_COPY.pendingReportBanner;

// ── Helper ────────────────────────────────────────────────────────

const EVIDENCE_METHOD_LABELS: Record<string, string> = {
  bought_myself: 'First-hand',
  saw_listing: 'Saw listing',
  venue_site: 'Venue site',
  other: 'Other',
};

// ── Props ─────────────────────────────────────────────────────────

export interface PendingReportBannerProps {
  kind: 'cancelled' | 'postponed' | 'available';
  confirms: number;
  needed: number;
  view: 'other' | 'reporter' | 'self-locked';
  /** Kept for callers; the board's one attribution line draws no time. */
  reportedAt?: string; // ISO
  evidenceMethod?: string;
  evidenceUrl?: string | null;
  reporter: { handle: string; url: string } | null;
  onConfirm: () => void;
  onWithdraw: () => void;
  /** Absent when there is nothing different left to report. */
  onSawDifferent?: (() => void) | undefined;
}

// ── Component ─────────────────────────────────────────────────────

export const PendingReportBanner = ({
  kind,
  confirms,
  needed,
  view,
  evidenceMethod,
  evidenceUrl,
  reporter,
  onConfirm,
  onWithdraw,
  onSawDifferent,
}: PendingReportBannerProps) => {
  const tokens = REPORT_TOKENS[kind];
  const isReporter = view === 'reporter' || view === 'self-locked';

  const badgeLabel =
    kind === 'cancelled'
      ? copy.cancelledBadge
      : kind === 'postponed'
        ? copy.postponedBadge
        : copy.availableBadge;

  const leadText =
    kind === 'cancelled'
      ? copy.cancelledLead
      : kind === 'postponed'
        ? copy.postponedLead
        : copy.availableLead;

  // Pending is dashed in the status colour for every kind (README rule 3;
  // more-st-ev_pending_canc_m, event-tickets-back-pending-m).
  const lineStyle = 'dashed';

  const methodLabel = evidenceMethod
    ? (EVIDENCE_METHOD_LABELS[evidenceMethod] ?? evidenceMethod)
    : null;

  return (
    <div
      style={{
        borderRadius: 16,
        background: 'var(--surface-1)',
        border: `1px ${lineStyle} ${tokens.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Top strip — kind label + dot tracker */}
      <div
        style={{
          padding: '10px 14px',
          background: tokens.bgStrong,
          borderBottom: `1px ${lineStyle} ${tokens.border}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: kind label */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            // The outlined pill, for every kind (more-st-ev_pending_canc_m).
            padding: '3px 8px',
            borderRadius: 6,
            border: `1px solid ${tokens.border}`,
            background: tokens.bg,
          }}
        >
          {badgeLabel}
        </span>

        {/* Right: dot tracker */}
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
            <span
              key={idx}
              style={{
                width: kind === 'available' ? 9 : 7,
                height: kind === 'available' ? 9 : 7,
                borderRadius: '50%',
                background: idx < confirms ? tokens.color : 'transparent',
                border: `1.1px solid ${tokens.color}`,
                display: 'inline-block',
              }}
            />
          ))}
          <span style={{ marginLeft: 4 }}>
            {copy.confirmProgress(confirms, needed)}
          </span>
        </span>
      </div>

      {/* Body: a tile, the lead and ONE attribution line, for every kind
          (more-st-ev_pending_canc_m, event-tickets-back-pending-m). */}
      <div style={{ padding: 0 }}>
        <div style={{ display: 'flex', gap: 12, padding: 14 }}>
          <div
            aria-hidden="true"
            data-testid="pending-icon-tile"
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              flex: 'none',
              color: tokens.color,
              background: tokens.bgStrong,
              border: `1px solid ${tokens.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReportGlyph kind={kind} size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 15,
                color: 'var(--fg)',
                letterSpacing: '-0.01em',
                lineHeight: 1.35,
              }}
            >
              {leadText}
            </div>
            <div
              data-testid="pending-attribution"
              style={{
                marginTop: 6,
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                color: 'var(--fg-muted)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <span>{copy.attributionPrefix}</span>
              {isReporter ? (
                <span style={{ color: tokens.color, fontWeight: 700 }}>
                  {copy.attributionSelf}
                </span>
              ) : reporter !== null ? (
                <a
                  href={reporter.url ?? '#'}
                  className="ph-no-capture"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {reporter.handle}
                </a>
              ) : (
                <span>{copy.reportedAnonymously}</span>
              )}
              {methodLabel !== null && (
                <>
                  <span>·</span>
                  <span
                    style={{
                      color: isSafeHttpUrl(evidenceUrl)
                        ? 'var(--signal)'
                        : undefined,
                      fontWeight: isSafeHttpUrl(evidenceUrl) ? 700 : undefined,
                    }}
                  >
                    {methodLabel}
                  </span>
                </>
              )}
              {isSafeHttpUrl(evidenceUrl) && (
                <>
                  <span>·</span>
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--signal)',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {copy.viewEvidenceLink}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action row — inside body, separated by borderTop */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {view === 'other' && (
            <>
              {onSawDifferent && (
                <button
                  type="button"
                  onClick={onSawDifferent}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {copy.footerQuestion}
                </button>
              )}

              <button
                type="button"
                onClick={onConfirm}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  justifyContent: 'center',
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 12,
                  background: tokens.color,
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 700,
                  fontSize: 14.5,
                  letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                <CheckGlyph size={13} color="var(--fg-on-accent)" />
                {copy.confirmButton}
              </button>
            </>
          )}

          {view === 'reporter' && (
            <>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.yourReportLabel}
              </span>

              <div style={{ display: 'flex', gap: 14 }}>
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
            </>
          )}

          {view === 'self-locked' && (
            <div
              style={{
                background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 8,
                padding: '7px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: 'auto',
              }}
            >
              <LockGlyph size={10} />
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1,
                }}
              >
                {copy.waitingForConfirms}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
