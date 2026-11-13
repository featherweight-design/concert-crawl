'use client';

// The Where popover's body on desktop (B+ B6a): a search field over a
// two-column list of every venue, each with its icon tile and neighborhood.
// Multi-select (Design addendum 2, item 6): each row is a checkbox, as the
// `bp-f-filt_where_d` board draws it, and a pick toggles that venue without
// closing the popover.

import { useEffect, useRef, useState } from 'react';
import { MAX_LIST_PARAM_VALUES, type VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { CheckboxMark } from './CheckboxMark';
import { compareVenueNames } from './filter-defs';

const copy = CONSUMER_COPY.filterBar.popover;

const SearchGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.5 10.5L14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

interface VenueOptionGridProps {
  venues: VenuePublic[];
  selected: readonly string[];
  onToggle: (slug: string) => void;
  /**
   * `popover` is the desktop two-column list. `sheet` is the phone Where list
   * (`bp-f-filt_venues_m`): one column, 36px tiles, a 14px name, and no
   * focus on open, so the keyboard doesn't cover the list it opens on.
   */
  variant?: 'popover' | 'sheet';
}

const VARIANT = {
  popover: {
    grid: 'grid-cols-2',
    gap: 'gap-y-1.5',
    tile: 28,
    name: 13.5,
    sub: 11,
    nameLead: undefined,
    subLead: undefined,
  },
  // The board's rows land every 52px: a 48px row and a 4px gap. The 36px
  // tile sets that height only while the two text lines stay under it, so
  // they take 18px and 14px lines (32px) rather than the default 1.5 (38px).
  sheet: {
    grid: 'grid-cols-1',
    gap: 'gap-y-1',
    tile: 36,
    name: 14,
    sub: 11.5,
    nameLead: '18px',
    subLead: '14px',
  },
} as const;

export const VenueOptionGrid = ({
  venues,
  selected,
  onToggle,
  variant = 'popover',
}: VenueOptionGridProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const look = VARIANT[variant];

  // The field is the fastest way to a venue in a list of twenty, so it takes
  // focus when the popover opens.
  useEffect(() => {
    if (variant === 'popover') inputRef.current?.focus();
  }, [variant]);

  // The API keeps the first 25 values of a list and drops the rest, so at the
  // cap an unticked row is disabled rather than accepting a pick it ignores.
  const atCap = selected.length >= MAX_LIST_PARAM_VALUES;
  const needle = query.trim().toLowerCase();
  const shown = venues
    .filter((venue) => venue.name.toLowerCase().includes(needle))
    .sort((left, right) => compareVenueNames(left.name, right.name));

  return (
    <div className="flex flex-col gap-3">
      {/* The board's field is sunk below the popover's surface, on the bar's
          own fill. */}
      <label
        className="sticky top-0 z-10 flex items-center gap-2 rounded-[10px] border border-border-strong px-3"
        style={{
          height: 40,
          background: 'var(--bg-elevated)',
          color: 'var(--fg-subtle)',
        }}
      >
        <SearchGlyph />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.whereSearch}
          aria-label={copy.whereSearch}
          // 16px: iOS Safari zooms a focused field under it, and a landscape
          // phone is wide enough to get this popover.
          className="min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-subtle"
        />
      </label>

      {shown.length === 0 ? (
        <p className="px-2 py-3 text-[13px] text-fg-muted">
          {copy.whereNoMatch}
        </p>
      ) : (
        <div className={`grid ${look.grid} gap-x-2.5 ${look.gap}`}>
          {shown.map((venue) => {
            const active = selected.includes(venue.slug);
            const disabled = atCap && !active;
            return (
              <button
                key={venue.slug}
                type="button"
                role="checkbox"
                aria-checked={active}
                disabled={disabled}
                data-testid="venue-option"
                onClick={() => onToggle(venue.slug)}
                // The board tints a checked row with the signal at 8%.
                className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                style={
                  active
                    ? {
                        background:
                          'color-mix(in oklab, var(--signal) 8%, transparent)',
                      }
                    : undefined
                }
              >
                <VenueTile
                  slug={venue.slug}
                  name={venue.name}
                  size={look.tile}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    data-testid="venue-option-name"
                    className="truncate text-fg"
                    style={{
                      fontSize: look.name,
                      fontWeight: active ? 800 : 600,
                      ...(look.nameLead && { lineHeight: look.nameLead }),
                    }}
                  >
                    {venue.name}
                  </span>
                  {venue.neighborhood && (
                    <span
                      className="truncate text-fg-subtle"
                      style={{
                        fontSize: look.sub,
                        ...(look.subLead && { lineHeight: look.subLead }),
                      }}
                    >
                      {venue.neighborhood}
                    </span>
                  )}
                </span>
                <CheckboxMark checked={active} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
