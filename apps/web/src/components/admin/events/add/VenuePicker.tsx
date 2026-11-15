'use client';

/** Consumed by the Add a show form (E3 PR C3). */

import { useState, type CSSProperties } from 'react';
import { Check, Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet } from '@/components/admin/primitives';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { POPOVER, usePopover } from '../edit/pickers';
import type { PickVenue } from './add-show-api';

const COPY = ADMIN_COPY.addShow.venuePicker;

/** Hidden venues last, muted (addendum 5 item 4); otherwise by name. */
const ordered = (venues: readonly PickVenue[], query: string): PickVenue[] => {
  const needle = query.trim().toLocaleLowerCase('en-US');
  return venues
    .filter((venue) => venue.name.toLocaleLowerCase('en-US').includes(needle))
    .sort(
      (one, two) =>
        Number(!one.active) - Number(!two.active) ||
        one.name.localeCompare(two.name),
    );
};

/** `04/venue-picker-d` search box: 36px on the first surface. */
const SEARCH: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface-1)',
  flex: 'none',
};

const VenueList = ({
  venues,
  value,
  phone,
  onPick,
}: {
  venues: PickVenue[] | 'failed' | null;
  value: string;
  phone: boolean;
  onPick: (id: string) => void;
}) => {
  const [query, setQuery] = useState('');
  if (venues === null || venues === 'failed') return null;
  const rows = ordered(venues, query);
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: phone ? 12 : 6 }}
    >
      <label style={SEARCH}>
        <Search
          size={15}
          strokeWidth={1.7}
          color="var(--fg-subtle)"
          aria-hidden
        />
        <input
          // The list's one job is finding a venue: focus lands here.
          autoFocus
          data-testid="venue-search"
          className="admin-add-show-input"
          aria-label={COPY.search(venues.length)}
          placeholder={COPY.search(venues.length)}
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--fg)',
            fontSize: phone ? 16 : 13,
            fontFamily: 'inherit',
          }}
        />
      </label>
      {rows.length === 0 ? (
        <div
          style={{
            padding: '8px 10px',
            fontSize: 12.5,
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.noMatch}
        </div>
      ) : (
        <div
          role="listbox"
          aria-label={COPY.title}
          style={{
            display: 'flex',
            flexDirection: 'column',
            // `04/venue-picker-d` spaces the desktop rows 4px apart.
            gap: phone ? 0 : 4,
            maxHeight: phone ? undefined : 220,
            overflowY: 'auto',
          }}
        >
          {rows.map((venue) => {
            const chosen = venue.id === value;
            return (
              <button
                key={venue.id}
                type="button"
                role="option"
                aria-selected={chosen}
                onClick={() => onPick(venue.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  height: phone ? 46 : 40,
                  padding: '0 10px',
                  borderRadius: 9,
                  border: 'none',
                  background: chosen ? 'var(--surface-2)' : 'transparent',
                  color: venue.active ? 'var(--fg)' : 'var(--fg-subtle)',
                  fontSize: 13.5,
                  fontWeight: chosen ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  opacity: venue.active ? 1 : 0.7,
                }}
              >
                <VenueTile slug={venue.slug} name={venue.name} size={24} />
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  {venue.name}
                </span>
                {chosen && (
                  <Check
                    size={15}
                    strokeWidth={2}
                    color="var(--signal)"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Add a show's Venue field (`06/add-a-show-by-hand`: a 20px tile, no chevron)
 * over the shared venue list (`04/venue-picker-d`, a sheet on the phone,
 * `04/venue-picker-m`).
 */
export const VenuePicker = ({
  id,
  venues,
  value,
  onChange,
  onRetry,
  phone,
  invalid,
  describedBy,
}: {
  id: string;
  /** null while loading. */
  venues: PickVenue[] | 'failed' | null;
  value: string;
  onChange: (id: string) => void;
  onRetry: () => void;
  phone: boolean;
  invalid: boolean;
  describedBy?: string | undefined;
}) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  const picked = Array.isArray(venues)
    ? venues.find((venue) => venue.id === value)
    : undefined;
  const pick = (venueId: string) => {
    onChange(venueId);
    close();
  };

  const failed = venues === 'failed' && (
    <div
      role="alert"
      style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 5 }}
    >
      {COPY.loadFailed}{' '}
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--signal)',
          font: 'inherit',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {COPY.tryAgain}
      </button>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen(!open)}
        style={{
          ...inputStyle(invalid),
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {picked ? (
          <>
            <VenueTile slug={picked.slug} name={picked.name} size={20} />
            <span
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {picked.name}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--fg-subtle)' }}>
            {ADMIN_COPY.addShow.venuePlaceholder}
          </span>
        )}
      </button>
      {failed}
      {open && phone && (
        <AdminSheet title={COPY.title} onClose={close}>
          <VenueList venues={venues} value={value} phone onPick={pick} />
        </AdminSheet>
      )}
      {open && !phone && (
        <div data-testid="venue-picker" style={{ ...POPOVER, right: 0 }}>
          <VenueList
            venues={venues}
            value={value}
            phone={false}
            onPick={pick}
          />
        </div>
      )}
    </div>
  );
};
