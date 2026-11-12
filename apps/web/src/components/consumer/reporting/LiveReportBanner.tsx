'use client';

import { REPORT_TOKENS } from './reportTokens';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.liveReportBanner;

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// ── Glyphs (16×16) ────────────────────────────────────────────────

const CancelledGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    {/* ⊘, as the board draws it: a ring with one bar across. */}
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M2.9 9.1L9.1 2.9"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const PostponedGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.3"
      fill="none"
    />
    <path
      d="M6 3.5V6l2 1.4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SoldOutGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M3.5 8.5L8.5 3.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

type LiveReportStatus = 'sold-out' | 'cancelled' | 'postponed';

const GLYPHS_16: Record<LiveReportStatus, () => React.JSX.Element> = {
  cancelled: CancelledGlyph16,
  postponed: PostponedGlyph16,
  'sold-out': SoldOutGlyph16,
};

// ── Props ─────────────────────────────────────────────────────────

export interface LiveReportBannerProps {
  status: LiveReportStatus;
  promotedAt: string; // ISO
  confirmCount?: number;
  reporter?: { handle: string; url: string } | null;
}

// ── Component ─────────────────────────────────────────────────────

export const LiveReportBanner = ({
  status,
  promotedAt,
  confirmCount,
  reporter,
}: LiveReportBannerProps) => {
  const token = REPORT_TOKENS[status];
  const Glyph = GLYPHS_16[status];
  const timeAgo = formatTimeAgo(promotedAt);

  const headline = copy.headlines[status];

  const subLabel = (() => {
    // A crawled change has no reporter and no confirms, so "0 confirms" would
    // read as a report nobody backed. It keeps only its age.
    if (reporter == null && confirmCount === undefined) return timeAgo;
    const confirms = confirmCount ?? 0;
    if (reporter != null) {
      return copy.reportedBy(reporter.handle, confirms, timeAgo);
    }
    return copy.reportedAnonymous(confirms, timeAgo);
  })();

  return (
    <div
      data-testid="live-report-banner"
      data-status={status}
      style={{
        borderRadius: '12px',
        background: token.bg,
        border: `1px solid ${token.border}`,
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: token.bgStrong,
          border: `1px solid ${token.border}`,
          boxSizing: 'border-box',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: token.color,
        }}
      >
        <Glyph />
      </div>

      {/* Text column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '15px',
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {headline}
        </span>
        {/* "Reported by @x": analytics autocapture skips it. */}
        <span
          className="ph-no-capture"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {subLabel}
        </span>
      </div>
    </div>
  );
};
