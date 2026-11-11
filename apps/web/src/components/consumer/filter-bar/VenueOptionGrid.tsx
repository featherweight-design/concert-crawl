'use client';

// The Where popover's body on desktop (B+ B6a): a search field over a
// two-column list of every venue, each with its icon tile and neighborhood.
// Single-select, like every other filter: picking a venue applies and closes.

import { useEffect, useRef, useState } from 'react';
import type { VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';

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

const CheckGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 6.5l2.5 2.5L10 3.5"
      stroke="var(--signal)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface VenueOptionGridProps {
  venues: VenuePublic[];
  value: string;
  onPick: (slug: string) => void;
}

export function VenueOptionGrid({
  venues,
  value,
  onPick,
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
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-subtle"
        />
      </label>

      {shown.length === 0 ? (
        <p className="px-2 py-3 text-[13px] text-fg-muted">
          {copy.whereNoMatch}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {shown.map((venue) => {
            const active = venue.slug === value;
            return (
              <button
                key={venue.slug}
                type="button"
                onClick={() => onPick(venue.slug)}
                aria-pressed={active}
                className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-2"
                style={active ? { background: 'var(--surface-2)' } : undefined}
              >
                <VenueTile slug={venue.slug} name={venue.name} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate text-[13.5px] text-fg"
                    style={{ fontWeight: active ? 700 : 600 }}
                  >
                    {venue.name}
                  </span>
                  {venue.neighborhood && (
                    <span className="truncate text-[11.5px] text-fg-subtle">
                      {venue.neighborhood}
                    </span>
                  )}
                </span>
                {active && <CheckGlyph />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
