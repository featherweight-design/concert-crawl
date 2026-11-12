'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { JumpPicker } from '@/components/consumer/jump-picker';
import { accessibleDayLabelFor } from '@/components/consumer/jump-picker/date-math';
import { BackToTodayControl } from './BackToTodayControl';

interface WeekStripHeaderProps {
  monthLabel: string;
  selectedDate: string;
  today: string;
  availability: Map<string, number>;
  onPick: (iso: string) => void;
  prevWeekHref: string | null;
  nextWeekHref: string;
  showBackToToday: boolean;
  onBackToToday: () => void;
}

const STYLE_ID = 'cjp-header-styles';

/** The chevrons' drawn size (the boards) and their hit area (44px minimum). */
export const CHEV_SIZE = 30;
export const CHEV_HIT = 44;
const CHEV_HIT_OUTSET = (CHEV_HIT - CHEV_SIZE) / 2;
const STYLE_CONTENT = [
  '.cjp-cue{transition:opacity var(--motion-fast) var(--motion-ease)}',
  '.cjp-cue:hover{opacity:.8}',
  '.cjp-chev{transition:background var(--motion-fast) var(--motion-ease),opacity var(--motion-fast) var(--motion-ease)}',
  '.cjp-chev:hover:not(:disabled):not([aria-disabled="true"]){background:var(--overlay-hover)}',
  '.cjp-chev:disabled{opacity:.32;cursor:default}',
  // Drawn at the boards' 30px, hit at 44px: an out-of-flow ::before reaches
  // 7px past every edge, so the target grows without moving the layout. The
  // two chevrons sit 6px apart, so their halos overlap by 8px in the gap; the
  // later one paints on top and takes that strip (1px of the earlier box).
  // Its own class: the jump picker's buttons share `.cjp-chev` and must not
  // grow halos inside the sheet.
  `.cjp-wk-chev{position:relative}`,
  `.cjp-wk-chev::before{content:'';position:absolute;inset:-${CHEV_HIT_OUTSET}px}`,
  // Click-catcher: invisible on desktop (popover model), a blurred scrim on
  // mobile (sheet model). Closing the picker by clicking it is a specified
  // close path. On the phone it sits over the bottom nav (z-40), as the sheet
  // does.
  '.cjp-catch{position:fixed;inset:0;z-index:30;cursor:pointer}',
  '@media (max-width:639.98px){.cjp-catch{z-index:45;background:var(--scrim);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}}',
  // Positioner: a left-anchored popover on desktop, a bottom sheet on the
  // phone (B+ `cal_jump_m`). CSS media query only, so the two models stay
  // SSR-safe with no JS viewport branch.
  '.cjp-pos{position:absolute;top:44px;left:0;z-index:40}',
  '@media (max-width:639.98px){.cjp-pos{position:fixed;top:auto;left:0;right:0;bottom:0;z-index:50}}',
].join('\n');

const ensureStyles = (): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLE_CONTENT;
  document.head.appendChild(styleEl);
};

// The boards' week chevrons: 30px squares, 9px corners, 6px apart.
const chevStyle: CSSProperties = {
  width: CHEV_SIZE,
  height: CHEV_SIZE,
  borderRadius: 9,
  border: '1px solid var(--border-strong)',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const CalendarGlyph = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x={2}
      y={3}
      width={12}
      height={11}
      rx={2}
      stroke="currentColor"
      strokeWidth={1.5}
    />
    <path
      d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

const ChevronGlyph = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg
    width={10}
    height={10}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      // The board's right chevron, and its mirror: the board's own left
      // glyph is a broken path that draws a slash, so it is not copied.
      d={dir === 'left' ? 'M10 4L6 8l4 4' : 'M6 4l4 4-4 4'}
      stroke="var(--fg-muted)"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const WeekStripHeader = ({
  monthLabel,
  selectedDate,
  today,
  availability,
  onPick,
  prevWeekHref,
  nextWeekHref,
  showBackToToday,
  onBackToToday,
}: WeekStripHeaderProps) => {
  const [open, setOpen] = useState(false);
  const cueRef = useRef<HTMLButtonElement>(null);
  const posRef = useRef<HTMLDivElement>(null);

  // Inject the one-off style tag after commit, not during render — a
  // render-time DOM mutation would run on every (possibly aborted) render.
  useEffect(ensureStyles, []);

  // The desktop popover grows from the cue: hand its centre, relative to the
  // positioner (both sit in this relative wrapper), to the picker's
  // transform-origin.
  const openPicker = () => {
    const cue = cueRef.current;
    if (cue) {
      posRef.current?.style.setProperty(
        '--cjp-origin-x',
        `${cue.offsetLeft + cue.offsetWidth / 2}px`,
      );
    }
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    cueRef.current?.focus();
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="flex items-center justify-between gap-2"
        style={{ marginBottom: 10 }}
      >
        {/* The month is the heading; the jump cue sits inline beside it, as
            `bp-s-cal_m` and `bp-s-cal_d` both draw it (17px month, 12px cue,
            one size at every width). It wraps under the month only when the
            row cannot hold it, rather than pushing the chevrons off. */}
        <div
          data-testid="cal-month-row"
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span
            data-testid="cal-month"
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--fg)',
              lineHeight: 1.1,
            }}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            ref={cueRef}
            className="cjp-cue inline-flex cursor-pointer items-center"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${monthLabel}. ${CONSUMER_COPY.jumpPickerCueSuffix}`}
            onClick={() => (open ? close() : openPicker())}
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 12,
              fontWeight: 700,
              gap: 5,
              color: 'var(--signal)',
              background: 'transparent',
              border: 0,
              padding: '4px 0',
            }}
          >
            <CalendarGlyph />
            <span>{CONSUMER_COPY.jumpPickerCueSuffix}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showBackToToday && (
            <BackToTodayControl
              todaySpoken={accessibleDayLabelFor(today)}
              onClick={onBackToToday}
            />
          )}
          {prevWeekHref ? (
            <Link
              href={prevWeekHref}
              scroll={false}
              aria-label={CONSUMER_COPY.jumpPickerPrevWeek}
              className="cjp-chev cjp-wk-chev"
              style={chevStyle}
            >
              <ChevronGlyph dir="left" />
            </Link>
          ) : (
            <span
              className="cjp-chev"
              aria-disabled="true"
              style={{ ...chevStyle, opacity: 0.32, cursor: 'default' }}
            >
              <ChevronGlyph dir="left" />
            </span>
          )}
          <Link
            href={nextWeekHref}
            scroll={false}
            aria-label={CONSUMER_COPY.jumpPickerNextWeek}
            className="cjp-chev cjp-wk-chev"
            style={chevStyle}
          >
            <ChevronGlyph dir="right" />
          </Link>
        </div>
      </div>

      {open && <div className="cjp-catch" onClick={close} aria-hidden="true" />}
      <div ref={posRef} className="cjp-pos">
        <JumpPicker
          open={open}
          onClose={close}
          selectedDate={selectedDate}
          today={today}
          availability={availability}
          onPick={(iso) => {
            close();
            onPick(iso);
          }}
        />
      </div>
    </div>
  );
};
