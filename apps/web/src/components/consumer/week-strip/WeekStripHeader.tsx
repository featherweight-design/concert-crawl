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
const STYLE_CONTENT = [
  '.cjp-cue{transition:opacity var(--motion-fast) var(--motion-ease)}',
  '.cjp-cue:hover{opacity:.8}',
  '.cjp-chev{transition:background var(--motion-fast) var(--motion-ease),opacity var(--motion-fast) var(--motion-ease)}',
  '.cjp-chev:hover:not(:disabled):not([aria-disabled="true"]){background:var(--overlay-hover)}',
  '.cjp-chev:disabled{opacity:.32;cursor:default}',
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

const chevStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const CalendarGlyph = () => (
  <svg
    width={15}
    height={15}
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
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
      stroke="var(--fg-muted)"
      strokeWidth={2}
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
      <div className="mb-3 flex items-center justify-between gap-2">
        {/* The month is the heading; the jump cue sits beside it and wraps
            under it at 320px rather than pushing the chevrons off. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="text-[20px] sm:text-[17px]"
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.1,
            }}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            ref={cueRef}
            className="cjp-cue inline-flex cursor-pointer items-center gap-1.5 text-[15px] sm:text-[13px]"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${monthLabel}. ${CONSUMER_COPY.jumpPickerCueSuffix}`}
            onClick={() => (open ? close() : openPicker())}
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 700,
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

        <div className="flex shrink-0 items-center gap-2">
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
              className="cjp-chev"
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
            className="cjp-chev"
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
