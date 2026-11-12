'use client';

import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.liveReportBanner;

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

// ── Glyphs (16×16) ────────────────────────────────────────────────

const CancelledGlyph16 = () => (
  <svg
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    {/* ✕, as the sold-out board (more-st-ev_sold_m) draws it. */}
    <path
      d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
      stroke="currentColor"
      strokeWidth="1.3"
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

// ── Tones ─────────────────────────────────────────────────────────
// The card's own tones, as the three status boards draw them
// (08-prices-and-status/more-st-ev_canc_m, _post_m, _sold_m, and addendum 2's
// 13-cancelled-variants): sold out is the pink accent, not the report family's
// amber, so these don't come from REPORT_TOKENS.
const TONE: Record<LiveReportStatus, string> = {
  cancelled: 'var(--danger)',
  postponed: 'var(--warning)',
  'sold-out': 'var(--accent)',
};

const mix = (tone: string, pct: number) =>
  `color-mix(in oklab, ${tone} ${pct}%, transparent)`;

// ── Props ─────────────────────────────────────────────────────────

export interface LiveReportBannerProps {
  status: LiveReportStatus;
  promotedAt: string; // ISO
  confirmCount?: number;
  reporter?: { handle: string; url: string } | null;
  /** The card's second sentence, under the headline. */
  body?: string | undefined;
}

// ── Component ─────────────────────────────────────────────────────

export const LiveReportBanner = ({
  status,
  promotedAt,
  confirmCount,
  reporter,
  body,
}: LiveReportBannerProps) => {
  const tone = TONE[status];
  const Glyph = GLYPHS_16[status];
  const timeAgo = formatTimeAgo(promotedAt);

  const headline = copy.headlines[status];

  const subLabel = (() => {
    // A crawled change has no reporter and no confirms, so "0 confirms" would
    // read as a report nobody backed. It names the venue's calendar instead.
    if (reporter == null && confirmCount === undefined) {
      return copy.fromVenueCalendar(timeAgo);
    }
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
        borderRadius: '16px',
        padding: '16px',
        background: `linear-gradient(135deg, ${mix(tone, 16)}, ${mix(tone, 4)} 70%), var(--surface-1)`,
        border: `1px solid ${mix(tone, 55)}`,
        display: 'flex',
        gap: '12px',
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: mix(tone, 12),
          border: `1px solid ${mix(tone, 50)}`,
          boxSizing: 'border-box',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tone,
        }}
      >
        <Glyph />
      </div>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontSize: '18px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--fg)',
          }}
        >
          {headline}
        </div>
        {body !== undefined && (
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13.5px',
              color: 'var(--fg-muted)',
              lineHeight: 1.45,
              marginTop: '5px',
            }}
          >
            {body}
          </div>
        )}
        {/* "Reported by @x": analytics autocapture skips it. */}
        <div
          className="ph-no-capture"
          style={{
            marginTop: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            // A handle has no spaces to wrap at, so a 20-character one can
            // break mid-word rather than run past the card at 320.
            overflowWrap: 'anywhere',
          }}
        >
          {subLabel}
        </div>
      </div>
    </div>
  );
};
