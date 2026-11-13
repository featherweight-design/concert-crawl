import { Fragment, type CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { SegmentDivider } from './ChipDivider';
import { FILTER_DEFS } from './filter-defs';

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
  // `browse-active-320`, `shelf-see-all-m`: 10px at 0.14em.
  letterSpacing: '0.14em',
};
export const HEADING_TITLE_CLASS =
  'truncate text-[28px] font-black leading-none tracking-tight text-fg';
export const HEADING_TITLE_STYLE: CSSProperties = { letterSpacing: '-0.03em' };

/** The gradient the title's last word takes: signal into accent. */
export const HEADING_ACCENT_STYLE: CSSProperties = {
  background: 'linear-gradient(90deg, var(--signal), var(--accent))',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/**
 * "What's on?" with "on?" in the signal-to-accent gradient, as every Browse
 * board draws it (`browse-active-320`, `shelf-see-all-m`, `bp-browse`). The
 * split is the copy's last word, so the string stays whole in the copy file
 * and the heading still reads as one phrase.
 */
export const HeadingTitleText = ({ title }: { title: string }) => {
  const cut = title.lastIndexOf(' ');
  if (cut === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, cut + 1)}
      <span data-testid="heading-accent" style={HEADING_ACCENT_STYLE}>
        {title.slice(cut + 1)}
      </span>
    </>
  );
};

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

/** The Filters button's sliders (`browse-320.html`: 15px, 1.6 stroke). */
export const IconSliders = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 4h7M12 4h2M2 12h2M7 12h7" />
      <circle cx="10.5" cy="4" r="1.6" />
      <circle cx="5.5" cy="12" r="1.6" />
    </g>
  </svg>
);

/**
 * The phone row's two pills, Filters and My artists (`bp-f-filt_m_rest`,
 * `browse-320.html`): 38px, fully round, 13.5px bold. Filters pads 13px and
 * rests on the elevated fill; My artists pads 12px on no fill. Either one, once
 * on, takes a signal edge over an 8% signal tint (`browse-active-320.html`).
 */
export const PHONE_PILL_CLASS =
  'inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full border text-[13.5px] font-bold whitespace-nowrap text-fg transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)]';
export const phonePillStyle = (
  active: boolean,
  rest: 'filters' | 'follow',
): CSSProperties => ({
  paddingInline: rest === 'filters' ? 13 : 12,
  borderColor: active ? 'var(--signal)' : 'var(--border-strong)',
  background: active
    ? 'color-mix(in oklab, var(--signal) 8%, transparent)'
    : rest === 'filters'
      ? 'var(--bg-elevated)'
      : 'transparent',
});

export const LockGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect
      x="2.2"
      y="5.4"
      width="7.6"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M4 5.4V4a2 2 0 014 0v1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The My artists switch's track, drawn rather than a native checkbox so it
 * can lock. Off: 30×18, `s3` fill, `border-strong` edge, a 12px `fg-muted`
 * knob (`browse-active-320.html`, `bp-f-filt_d`). On: the signal.
 */
export const SwitchTrack = ({
  on,
  locked,
}: {
  on: boolean;
  locked: boolean;
}) => (
  <span
    aria-hidden
    data-testid="switch-track"
    className="relative inline-flex shrink-0 items-center"
    style={{
      width: 30,
      height: 18,
      borderRadius: 9,
      background: on ? 'var(--signal)' : 'var(--surface-3)',
      border: locked
        ? '1px dashed var(--border-strong)'
        : `1px solid ${on ? 'var(--signal)' : 'var(--border-strong)'}`,
      color: 'var(--fg-subtle)',
    }}
  >
    {locked ? (
      <span className="mx-auto inline-flex">
        <LockGlyph />
      </span>
    ) : (
      <span
        className="absolute rounded-full transition-[left] duration-[var(--motion-fast)] ease-[var(--motion-ease)]"
        style={{
          top: 2,
          left: on ? 14 : 2,
          width: 12,
          height: 12,
          background: on ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
        }}
      />
    )}
  </span>
);

/** A segment's mono eyebrow: signal once its filter is on. */
export const segmentEyebrowStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: active ? 'var(--signal)' : 'var(--fg-subtle)',
});

/** A segment's value under its eyebrow. */
export const segmentValueStyle = (muted: boolean): CSSProperties => ({
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: muted ? 'var(--fg-subtle)' : 'var(--fg)',
});

/** The desktop bar and the count line under it, from sm up. */
export const SEGMENT_BLOCK_CLASS = 'hidden flex-col gap-2.5 sm:flex';

/** The segmented bar itself (`bp-f-filt_d`, `bp-f-filt_active_d`). */
export const SEGMENT_BAR_CLASS =
  'flex items-stretch rounded-[14px] border p-1 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)]';
export const segmentBarStyle = (active: boolean): CSSProperties => ({
  // The bar sits on the elevated fill; the open segment on `s3` above it.
  background: 'var(--bg-elevated)',
  minHeight: 62,
  // At rest a `border-strong` hairline. With any filter or scope on, the
  // whole bar's edge takes the signal.
  borderColor: active
    ? 'color-mix(in oklab, var(--signal) 55%, var(--border-strong))'
    : 'var(--border-strong)',
});

/** The "N shows" row under the bar. */
export const COUNT_ROW_CLASS = 'flex min-h-[22px] items-center gap-3';
export const COUNT_LINE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

/** The preview bar's resting segments after My artists, in the bar's order. */
const PREVIEW_SEGMENTS: readonly { eyebrow: string; value: string }[] = [
  { eyebrow: copy.segment.whoEyebrow, value: CREWS_COPY.lens.pickerNone },
  { eyebrow: FILTER_DEFS.when.label, value: copy.segment.whenPlaceholder },
  { eyebrow: FILTER_DEFS.where.label, value: FILTER_DEFS.where.placeholder },
  { eyebrow: copy.segment.priceEyebrow, value: FILTER_DEFS.price.placeholder },
  { eyebrow: FILTER_DEFS.vibe.label, value: FILTER_DEFS.vibe.placeholder },
];

/** One resting segment of the preview bar, drawn as FilterSegment lays out. */
const PreviewSegment = ({
  eyebrow,
  value,
}: {
  eyebrow: string;
  value: string;
}) => (
  <span
    data-preview-segment={eyebrow}
    className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] py-2 pr-2 pl-3.5"
  >
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span style={segmentEyebrowStyle(false)}>{eyebrow}</span>
      <span className="truncate" style={segmentValueStyle(false)}>
        {value}
      </span>
    </span>
    <span className="shrink-0 text-fg-subtle">
      <IconChevDown size={11} />
    </span>
  </span>
);

/**
 * The FilterBar at rest, inert: the heading, the List/Cal toggle on List, and
 * the chip row with every filter at its placeholder. Browse's route fallback
 * draws it while the page loads, so the chrome is already in place (B+ rule 9,
 * `load_browse_m`/`load_browse_d`). From sm up it draws the segmented bar at
 * rest and the count line under it, the same block heights the live bar
 * takes, so nothing below moves when the page lands. Nothing here is a
 * control: the copies are spans, hidden from assistive tech and out of the
 * tab order, so nothing that looks tappable sits there doing nothing.
 */
interface FilterBarPreviewProps {
  /**
   * Draw the "My artists" chip. Off by default: the live chip renders nothing
   * until its entitlement resolves (and nothing at all for a viewer who
   * follows no one), so a caller that can't know would draw a chip that then
   * disappears. The trade-off is a chip that pops in for viewers who do get
   * one, which shifts the chip row sideways rather than the page down.
   */
  showFollowChip?: boolean;
}

export const FilterBarPreview = ({
  showFollowChip = false,
}: FilterBarPreviewProps) => (
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
          <HeadingTitleText title={copy.headingTitle} />
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
    {/* `bp-f-filt_m_rest`: the Filters pill and, when known, My artists. */}
    <div
      data-testid="filter-bar-preview-chips"
      className="flex items-center gap-2 sm:hidden"
    >
      <span
        className={PHONE_PILL_CLASS}
        style={phonePillStyle(false, 'filters')}
      >
        <IconSliders />
        {copy.phone.filters}
      </span>
      {showFollowChip && (
        <span
          className={PHONE_PILL_CLASS}
          style={phonePillStyle(false, 'follow')}
        >
          <SwitchTrack on={false} locked={false} />
          {FOLLOWING_COPY.chip}
        </span>
      )}
    </div>
    {/* `bp-s-load_browse_d`: the segmented bar at rest, every segment the
        board draws (My artists off, Who, When, Where, Price, Vibe), and
        "… shows" where the count will land. */}
    <div data-testid="filter-bar-preview-bar" className={SEGMENT_BLOCK_CLASS}>
      <div className={SEGMENT_BAR_CLASS} style={segmentBarStyle(false)}>
        <span className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-3.5">
          <SwitchTrack on={false} locked={false} />
          <span className="flex flex-col items-start gap-1">
            <span style={segmentEyebrowStyle(false)}>
              {FOLLOWING_COPY.chip}
            </span>
            <span
              className="whitespace-nowrap"
              style={segmentValueStyle(false)}
            >
              {copy.segment.followOff}
            </span>
          </span>
        </span>
        {PREVIEW_SEGMENTS.map(({ eyebrow, value }) => (
          <Fragment key={eyebrow}>
            <SegmentDivider />
            <PreviewSegment eyebrow={eyebrow} value={value} />
          </Fragment>
        ))}
      </div>
      <div className={COUNT_ROW_CLASS}>
        <span style={COUNT_LINE_STYLE}>{copy.showCountPending}</span>
      </div>
    </div>
  </div>
);
