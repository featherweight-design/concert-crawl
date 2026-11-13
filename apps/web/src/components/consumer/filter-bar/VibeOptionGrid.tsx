'use client';

// The Vibe popover's body on desktop (B+ B6a), drawn to
// `bp-vibe-vibe_pop_d`: two columns of genre rows in the board's order, each
// with its glowing dot, its name, a line of what it covers and a checkbox. A
// checked row takes its genre's color for its edge, its tint and its box.
// Multi-select (Hugh's ruling): a pick toggles without closing the popover.

import type { CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { GenreDot } from '@/components/consumer/GenreDot';
import { genreColor } from '@/lib/genre-color';
import { CheckboxMark } from './CheckboxMark';
import { getFilterOptions, VIBE_ORDER } from './filter-defs';

const copy = CONSUMER_COPY.filterBar.popover;

const VIBE_KINDS: Readonly<Record<string, string | undefined>> = copy.vibeKinds;

/** The line under a Vibe option, or none for a bucket the board doesn't name. */
export const vibeKind = (genre: string): string | undefined =>
  VIBE_KINDS[genre];

const rowStyle = (checked: boolean, color: string): CSSProperties => ({
  minHeight: 54,
  padding: '8px 12px 8px 14px',
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: checked
    ? `color-mix(in oklab, ${color} 60%, transparent)`
    : 'transparent',
  background: checked
    ? `color-mix(in oklab, ${color} 10%, transparent)`
    : undefined,
});

interface VibeOptionGridProps {
  selected: readonly string[];
  onToggle: (genre: string) => void;
  /** Two in the desktop popover; one on the phone (`bp-vibe-vibe_sheet_m`). */
  columns?: 1 | 2;
}

/**
 * Every one of the 16 buckets, always, in the board's order: `vibe_pop_d`
 * draws them all, and no board hides a bucket without shows. Picking an empty
 * one simply returns no shows.
 */
export const VibeOptionGrid = ({
  selected,
  onToggle,
  columns = 2,
}: VibeOptionGridProps) => {
  const options = getFilterOptions('vibe', [], [...VIBE_ORDER]);
  return (
    <div
      className={`grid ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-2.5 gap-y-1`}
    >
      {options.map((option) => {
        const checked = selected.includes(option.value);
        const color = genreColor(option.value) ?? 'var(--signal)';
        const kind = vibeKind(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={option.label}
            data-testid="vibe-option"
            onClick={() => onToggle(option.value)}
            className={`flex min-w-0 cursor-pointer items-center gap-3 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] ${checked ? '' : 'hover:bg-surface-3'}`}
            style={rowStyle(checked, color)}
          >
            <GenreDot genre={option.value} size={10} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className="truncate text-[15px] text-fg"
                style={{
                  fontWeight: checked ? 700 : 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {option.label}
              </span>
              {kind !== undefined && (
                <span
                  data-testid="vibe-option-kind"
                  className="truncate text-[11.5px] text-fg-subtle"
                >
                  {kind}
                </span>
              )}
            </span>
            <CheckboxMark checked={checked} size={20} color={color} />
          </button>
        );
      })}
    </div>
  );
};

interface VibeShowButtonProps {
  count: number;
  onClick: () => void;
}

/** The footer's "Show N shows": applies nothing new, it closes the popover. */
export const VibeShowButton = ({ count, onClick }: VibeShowButtonProps) => {
  return (
    <button
      type="button"
      data-testid="vibe-show"
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center rounded-[12px] px-[18px] text-[14.5px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        color: 'var(--fg-on-accent)',
        background: 'linear-gradient(90deg, var(--signal), var(--cta-end))',
        boxShadow:
          '0 6px 18px color-mix(in oklab, var(--signal) 25%, transparent)',
      }}
    >
      {copy.vibeShow(count)}
    </button>
  );
};
