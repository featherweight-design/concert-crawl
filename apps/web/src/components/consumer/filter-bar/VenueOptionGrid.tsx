'use client';

// The Where popover's body on desktop (B+ B6a): a search field over a
// two-column list of every venue, each with its icon tile and neighborhood.
// Multi-select (Design addendum 2, item 6): each row is a checkbox, as the
// `bp-f-filt_where_d` board draws it, and a pick toggles that venue without
// closing the popover.

import { useEffect, useRef, useState } from 'react';
import type { VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { CheckboxMark } from './CheckboxMark';

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
}

export function VenueOptionGrid({
  venues,
  selected,
  onToggle,
}: VenueOptionGridProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // The field is the fastest way to a venue in a list of twenty, so it takes
  // focus when the popover opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const needle = query.trim().toLowerCase();
  const shown = venues
    .filter((venue) => venue.name.toLowerCase().includes(needle))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div className="flex flex-col gap-2">
      <label
        className="sticky top-0 z-10 flex items-center gap-2 rounded-[10px] border border-border-strong px-3"
        style={{
          height: 40,
          background: 'var(--surface-1)',
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
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {shown.map((venue) => {
            const active = selected.includes(venue.slug);
            return (
              <button
                key={venue.slug}
                type="button"
                role="checkbox"
                aria-checked={active}
                data-testid="venue-option"
                onClick={() => onToggle(venue.slug)}
                // The board lifts a checked row onto the raised surface.
                className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}
              >
                <VenueTile slug={venue.slug} name={venue.name} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    data-testid="venue-option-name"
                    className="truncate text-[13.5px] text-fg"
                    style={{ fontWeight: active ? 800 : 600 }}
                  >
                    {venue.name}
                  </span>
                  {venue.neighborhood && (
                    <span
                      className="truncate text-fg-subtle"
                      style={{ fontSize: active ? 11 : 11.5 }}
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
}
