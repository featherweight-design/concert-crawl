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
   * brings its own words and a tile. Left out, the card is the event page's
   * status card exactly as it always was.
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

  const text = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
          color: 'var(--fg-muted)',
          letterSpacing: '-0.005em',
        }}
      >
        {subtitle}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        padding: flush ? '24px 0 0' : '24px 18px 32px',
        borderTop: '1px dashed var(--border)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Eyebrow */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--fg-subtle)',
          margin: '0 0 10px',
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
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'var(--surface-1)',
          border: reported
            ? `1px dashed ${AMBER.border}`
            : '1px solid var(--border)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {icon === undefined ? (
          text
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                color: AMBER.color,
                background: AMBER.bgStrong,
                border: `1px solid ${AMBER.border}`,
              }}
            >
              {icon}
            </span>
            {text}
          </div>
        )}

        {reportedChip !== undefined ? (
          <span
            style={{
              marginLeft: '8px',
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
          /* Arrow icon */
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{
              marginLeft: '8px',
              flexShrink: 0,
              color: 'var(--fg-muted)',
            }}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
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
          color: 'var(--fg-subtle)',
          margin: '10px 0 0',
          lineHeight: 1.5,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {footnote ?? copy.bottomNote}
      </p>
    </div>
  );
};
