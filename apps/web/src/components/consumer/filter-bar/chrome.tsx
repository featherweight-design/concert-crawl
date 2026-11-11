import type { CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { ChipDivider } from './ChipDivider';
import { FILTER_DEFS, FILTER_ORDER } from './filter-defs';

// The FilterBar's look, shared by the live bar and Browse's first-load
// fallback (`BrowseSkeleton`), so the fallback draws the same chrome the page
// paints a moment later. No hooks and no 'use client': the route fallback is a
// server component. A change to the bar's look (B6a/B6b) lands here and the
// fallback follows.

const copy = CONSUMER_COPY.filterBar;

export function IconList({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4h10M3 8h10M3 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCal({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3.25"
        width="12"
        height="10.75"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 1.75v2.5M10.5 1.75v2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChevDown({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const HEADING_EYEBROW_CLASS =
  'text-[10px] uppercase tracking-widest text-fg-muted';
export const HEADING_EYEBROW_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
};
export const HEADING_TITLE_CLASS =
  'truncate text-[28px] font-black leading-none tracking-tight text-fg';
export const HEADING_TITLE_STYLE: CSSProperties = { letterSpacing: '-0.03em' };

/** The List/Cal toggle's track (B+ `bp-browse`). */
export const VIEW_TOGGLE_CLASS = 'inline-flex items-center';
export const VIEW_TOGGLE_STYLE: CSSProperties = {
  padding: 3,
  borderRadius: 10,
  background: 'var(--surface-1)',
  border: '1px solid var(--border-strong)',
};
export const VIEW_SEGMENT_CLASS =
  'inline-flex items-center gap-1.5 transition-colors';
export const viewSegmentStyle = (active: boolean): CSSProperties => ({
  padding: '7px 12px',
  borderRadius: 7,
  fontFamily: 'Inter, system-ui',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '-0.005em',
  color: active ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
  // B+ draws the active segment in the brand gradient.
  background: active
    ? 'linear-gradient(135deg, var(--signal), var(--accent))'
    : 'transparent',
});
export const VIEW_SEGMENTS = [
  { key: 'list', label: copy.viewList, Icon: IconList },
  { key: 'cal', label: copy.viewCal, Icon: IconCal },
] as const;

export const CHIP_ROW_CLASS =
  'flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none';
export const CHIP_ROW_STYLE: CSSProperties = {
  maskImage: 'linear-gradient(to right, black 85%, transparent)',
};

/** A dimension chip (When, Where, Price, Vibe). */
export const FILTER_CHIP_CLASS =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3';
export const filterChipStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'Inter, system-ui',
  fontWeight: 600,
  fontSize: 12.5,
  letterSpacing: '-0.005em',
  color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
  borderColor: active ? 'var(--signal)' : 'var(--border)',
  background: active ? 'var(--signal)' : 'var(--surface-1)',
});

/** The "My artists" scope chip, in its usable state. */
export const FOLLOW_CHIP_CLASS =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3';
export const followChipStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'Inter, system-ui',
  fontWeight: 700,
  fontSize: 12,
  background: active ? 'var(--signal)' : 'transparent',
  borderColor: active ? 'var(--signal)' : 'var(--border-strong)',
  color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
});

/**
 * The FilterBar at rest, inert: the heading, the List/Cal toggle on List, and
 * the chip row with every filter at its placeholder. Browse's route fallback
 * draws it while the page loads, so the chrome is already in place (B+ rule 9,
 * `load_browse_m`/`load_browse_d`). Nothing here is a control: the copies are
 * spans, hidden from assistive tech and out of the tab order, so nothing that
 * looks tappable sits there doing nothing.
 */
export const FilterBarPreview = () => (
  <div
    aria-hidden="true"
    data-testid="filter-bar-preview"
    className="pointer-events-none relative flex select-none flex-col gap-3"
  >
    <div className="flex items-end justify-between gap-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={HEADING_EYEBROW_CLASS} style={HEADING_EYEBROW_STYLE}>
          {copy.locationLine}
        </span>
        <span className={HEADING_TITLE_CLASS} style={HEADING_TITLE_STYLE}>
          {copy.headingTitle}
        </span>
      </div>
      <span className={VIEW_TOGGLE_CLASS} style={VIEW_TOGGLE_STYLE}>
        {VIEW_SEGMENTS.map(({ key, label, Icon }) => (
          <span
            key={key}
            className={VIEW_SEGMENT_CLASS}
            style={viewSegmentStyle(key === 'list')}
          >
            <span className="inline-flex">
              <Icon size={15} />
            </span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        ))}
      </span>
    </div>
    <div className={CHIP_ROW_CLASS} style={CHIP_ROW_STYLE}>
      <span className={FOLLOW_CHIP_CLASS} style={followChipStyle(false)}>
        <span style={{ whiteSpace: 'nowrap' }}>{FOLLOWING_COPY.chip}</span>
      </span>
      <ChipDivider />
      {FILTER_ORDER.map((key) => (
        <span
          key={key}
          className={FILTER_CHIP_CLASS}
          style={filterChipStyle(false)}
        >
          <span style={{ whiteSpace: 'nowrap' }}>
            {FILTER_DEFS[key].placeholder}
          </span>
          <IconChevDown size={11} />
        </span>
      ))}
    </div>
  </div>
);
