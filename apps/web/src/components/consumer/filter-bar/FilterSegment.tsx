'use client';

// One segment of the desktop filter bar (B+ B6a): a mono eyebrow over the
// current value, a chevron at rest, and a small ✕ that clears just this
// filter once it is set. The segment opens its own popover; the ✕ is a
// sibling button, never nested inside the opener.

import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

const Chevron = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ClearGlyph = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
    <path
      d="M3 3l10 10M13 3L3 13"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

interface FilterSegmentProps {
  eyebrow: string;
  value: string;
  /** A count after the value ("+1") that never truncates. */
  suffix?: string;
  /** A mark before the value: the venue tile, genre dot or crew patch. */
  leading?: ReactNode;
  active: boolean;
  open: boolean;
  clearLabel: string;
  testId?: string;
  anchorRef: Ref<HTMLDivElement>;
  openerRef: Ref<HTMLButtonElement>;
  onToggle: () => void;
  onClear: () => void;
}

export function FilterSegment({
  eyebrow,
  value,
  suffix,
  leading,
  active,
  open,
  clearLabel,
  testId,
  anchorRef,
  openerRef,
  onToggle,
  onClear,
}: FilterSegmentProps) {
  return (
    <div
      ref={anchorRef}
      data-segment={eyebrow}
      className="flex min-w-0 flex-1 items-center rounded-[10px] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-2"
      // The open segment sits a step above the bar (`bp-f-filt_where_d`).
      style={open ? { background: 'var(--surface-3)' } : undefined}
    >
      <button
        ref={openerRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid={testId}
        // Once active the ✕ follows, with its own inset, so the value keeps
        // that width ("Bluebird +1" whole at the board's 175px segment).
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch py-2 pl-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
          active ? 'pr-0' : 'pr-2',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: active ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {eyebrow}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            {leading}
            {/* The name and its "+1" are one run of text with no flex gap
                between them, so they sit one word space apart, as the board
                sets "Bluebird +1". The name alone ellipsises. */}
            <span
              data-testid="segment-value"
              className="flex min-w-0"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}
            >
              <span className="truncate">{value}</span>
              {suffix !== undefined && (
                <span
                  data-testid="segment-more"
                  className="shrink-0 whitespace-pre"
                >
                  {` ${suffix}`}
                </span>
              )}
            </span>
          </span>
        </span>
        {!active && (
          <span className="shrink-0 text-fg-subtle">
            <Chevron />
          </span>
        )}
      </button>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="mr-1.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-subtle transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-fg focus-visible:outline focus-visible:outline-2"
        >
          <ClearGlyph />
        </button>
      )}
    </div>
  );
}
