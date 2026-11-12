'use client';

import type { ReactNode } from 'react';

import { REPORTING_COPY } from './definitions/copy';
import { REPORT_AMBER as AMBER } from './reportTokens';

const copy = REPORTING_COPY.reportFooterLink;

const STATUS_LABELS: Record<'sold-out' | 'cancelled' | 'postponed', string> = {
  'sold-out': 'sold out',
  cancelled: 'cancelled',
  postponed: 'postponed',
};

/**
 * The event page's tile glyph: an amber clock, drawn on bp-event and every
 * B+ event board that reaches the foot of the page (17px, 1.6 stroke).
 */
const StatusClockIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    data-testid="report-status-clock"
    style={{ display: 'block', flex: 'none' }}
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.6V8l2.4 1.6" />
  </svg>
);

export interface ReportFooterLinkProps {
  /** Event page only. The artist card leaves it out. */
  liveStatus?: null | 'sold-out' | 'cancelled' | 'postponed';
  onOpen: () => void;
  /**
   * Announces the sign-up gate to assistive tech without drawing it (#1247).
   * The row is unchanged visually and still opens on tap; ReportSheet swaps
   * itself for the tier picker once it is open.
   */
  signedOut?: boolean;
  /**
   * The card is shared with the artist page (wrong-artist reports), which
   * brings its own words and glyph. Left out, the card is the event page's
   * status card: its words and the amber clock.
   */
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  /** The mono line under the row. */
  footnote?: string;
  /** The accessible name when `signedOut`, for a card with its own title. */
  ariaSignedOut?: string;
  /**
   * The viewer already has a report open: a dashed amber border and this chip
   * in place of the chevron. One prop, so the state can't be half-set. Still
   * tappable; the host decides what it opens.
   */
  reportedChip?: string;
  /** Drops the page-gutter padding for a host that already has its own. */
  flush?: boolean;
  /** A `data-testid` for the row's button, so inventories can tap it. */
  testId?: string;
}

export const ReportFooterLink = ({
  liveStatus = null,
  onOpen,
  signedOut = false,
  icon,
  title: titleOverride,
  subtitle: subtitleOverride,
  footnote,
  ariaSignedOut,
  reportedChip,
  flush = false,
  testId,
}: ReportFooterLinkProps) => {
  const reported = reportedChip !== undefined;
  const hasStatus = liveStatus !== null;
  const title = titleOverride ?? (hasStatus ? copy.titleHasStatus : copy.title);
  const subtitle =
    subtitleOverride ??
    (hasStatus
      ? copy.subtitleHasStatus(STATUS_LABELS[liveStatus])
      : copy.subtitle);
  const signedOutName =
    ariaSignedOut ??
    (hasStatus ? copy.ariaSignedOutHasStatus : copy.ariaSignedOut);

  return (
    <div
      style={{
        width: '100%',
        // Board: margin-top 10, padding-top 22 under a dashed strong rule.
        // A flush host owns its own spacing above the rule.
        marginTop: flush ? 0 : '10px',
        padding: flush ? '22px 0 0' : '22px 18px 32px',
        borderTop: '1px dashed var(--border-strong)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Eyebrow */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9.5px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--fg-subtle)',
          margin: 0,
        }}
      >
        {copy.eyebrow}
      </p>

      {/* Button row */}
      <button
        onClick={onOpen}
        {...(testId === undefined ? {} : { 'data-testid': testId })}
        {...(reported ? { 'data-reported': 'true' } : {})}
        {...(signedOut ? { 'aria-label': signedOutName } : {})}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginTop: '10px',
          padding: '15px 18px',
          borderRadius: '14px',
          background: 'var(--surface-1)',
          border: reported
            ? `1px dashed ${AMBER.border}`
            : '1px solid var(--border)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        {/* Amber icon tile: 36px, radius 10, warning at 10% fill / 40% edge */}
        <span
          aria-hidden="true"
          data-testid="report-icon-tile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            color: AMBER.color,
            background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
            border:
              '1px solid color-mix(in oklab, var(--warning) 40%, transparent)',
          }}
        >
          {icon ?? <StatusClockIcon />}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '15.5px',
              color: 'var(--fg)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: '3px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13.5px',
              color: 'var(--fg-muted)',
            }}
          >
            {subtitle}
          </div>
        </div>

        {reportedChip !== undefined ? (
          <span
            style={{
              flexShrink: 0,
              padding: '3px 7px',
              borderRadius: 6,
              border: '1px solid var(--border-strong)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            {reportedChip}
          </span>
        ) : (
          /* Chevron: 14px, 1.8 stroke, muted */
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              display: 'block',
              color: 'var(--fg-muted)',
            }}
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Bottom note */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          fontWeight: 500,
          color: 'var(--fg-subtle)',
          margin: '10px 0 0',
          lineHeight: 1.5,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {footnote ?? copy.bottomNote}
      </p>
    </div>
  );
};
