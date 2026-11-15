'use client';

/** Consumed by the Add a show form (E3 PR C3). */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet } from '@/components/admin/primitives';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { POPOVER, usePopover } from '../edit/pickers';
import type { PickVenue } from './add-show-api';

const COPY = ADMIN_COPY.addShow.venuePicker;

export type PickVenues = PickVenue[] | 'failed' | null;

/**
 * The picker's venues, loaded once on mount: null while loading, 'failed'
 * after a failed load, else the list. `reload` is the picker's `onRetry`.
 * The latest `load` is kept in a ref, so a caller passing a fresh function
 * each render never loads again.
 */
export const usePickVenues = (
  load: () => Promise<PickVenue[]>,
  logTag: string,
): { venues: PickVenues; reload: () => void } => {
  const [venues, setVenues] = useState<PickVenues>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const reload = useCallback(() => {
    setVenues(null);
    loadRef.current().then(setVenues, (err: unknown) => {
      console.error(`[${logTag}] venues failed`, err);
      setVenues('failed');
    });
  }, [logTag]);
  useEffect(reload, [reload]);
  return { venues, reload };
};

/**
 * Event edit's trigger (`06/event-edit`, addendum 5 `04/venue-picker-d`):
 * 10px side padding, a 22px tile and a trailing chevron.
 */
const EDIT_TRIGGER: CSSProperties = { padding: '0 10px' };

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

/**
 * The search box over the list, as a combobox: ArrowUp/Down move the active
 * option, Home/End jump to the ends, Enter picks it (LineupField's pattern).
 * The active option starts on the chosen venue, else the first.
 */
const VenueList = ({
  id,
  venues,
  value,
  phone,
  onPick,
}: {
  id: string;
  venues: PickVenue[];
  value: string;
  phone: boolean;
  onPick: (id: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const rows = ordered(venues, query);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      rows.findIndex((venue) => venue.id === value),
    ),
  );
  const listId = `${id}-list`;
  const optionId = (index: number) => `${listId}-${index}`;
  const current = rows.length === 0 ? -1 : Math.min(active, rows.length - 1);
  return (
    <div
      id={id}
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
          role="combobox"
          aria-expanded={rows.length > 0}
          aria-controls={rows.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={current >= 0 ? optionId(current) : undefined}
          aria-label={COPY.search(venues.length)}
          placeholder={COPY.search(venues.length)}
          value={query}
          onChange={(evt) => {
            setQuery(evt.target.value);
            setActive(0);
          }}
          onKeyDown={(evt) => {
            if (rows.length === 0) return;
            const last = rows.length - 1;
            const moves: Record<string, number> = {
              ArrowDown: Math.min(last, current + 1),
              ArrowUp: Math.max(0, current - 1),
              Home: 0,
              End: last,
            };
            const next = moves[evt.key];
            if (next !== undefined) {
              evt.preventDefault();
              setActive(next);
              document
                .getElementById(optionId(next))
                ?.scrollIntoView?.({ block: 'nearest' });
            } else if (evt.key === 'Enter') {
              evt.preventDefault();
              const venue = rows[current];
              if (venue) onPick(venue.id);
            }
          }}
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
          id={listId}
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
          {rows.map((venue, index) => {
            const chosen = venue.id === value;
            const lit = chosen || index === current;
            return (
              // Hidden venues stay pickable: listed last and muted, never
              // blocked (orchestrator ruling); removed ones never arrive.
              <div
                key={venue.id}
                id={optionId(index)}
                role="option"
                aria-selected={chosen}
                data-active={index === current || undefined}
                // Keeps focus in the search box, which owns the keyboard.
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => onPick(venue.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 'none',
                  gap: 10,
                  width: '100%',
                  height: phone ? 46 : 40,
                  padding: '0 10px',
                  borderRadius: 9,
                  boxSizing: 'border-box',
                  background: lit ? 'var(--surface-2)' : 'transparent',
                  color: venue.active ? 'var(--fg)' : 'var(--fg-subtle)',
                  fontSize: 13.5,
                  fontWeight: chosen ? 600 : 500,
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
              </div>
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
 * `04/venue-picker-m`). `variant="edit"` is Event edit's trigger
 * (`06/event-edit`: a 22px tile and a chevron); the list is the same.
 *
 * `venues` is null while loading and 'failed' after a failed load; the list
 * opens only once it is an array, so a press while loading opens nothing.
 * Retry contract: on `onRetry` the parent sets `venues` back to null, then
 * loads again and sets the array or 'failed' (`usePickVenues` does both).
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
  variant = 'add',
  known,
}: {
  id: string;
  /** null while loading. */
  venues: PickVenues;
  value: string;
  onChange: (id: string) => void;
  onRetry: () => void;
  phone: boolean;
  invalid: boolean;
  describedBy?: string | undefined;
  variant?: 'add' | 'edit';
  /**
   * The venue `value` names, drawn while the list loads or when it lacks
   * it (Event edit's saved venue, which may since have been taken down).
   */
  known?: { name: string; slug: string } | undefined;
}) => {
  const { open, setOpen, close, ref, trigger } = usePopover();
  const edit = variant === 'edit';
  const list = Array.isArray(venues) ? venues : null;
  // Never an empty shell: the list shows only once the venues are in.
  const shown = open && list !== null;
  const listId = `${id}-venues`;
  const picked = list?.find((venue) => venue.id === value) ?? known;
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
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-busy={venues === null || undefined}
        // A button takes no aria-invalid (jsx-a11y, as DateField's trigger);
        // the error line, tied by aria-describedby, names it.
        aria-describedby={describedBy}
        onClick={() => {
          if (list !== null) setOpen(!open);
        }}
        style={{
          ...inputStyle(invalid),
          ...(edit && EDIT_TRIGGER),
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {picked ? (
          <>
            {edit ? (
              // The board's 22px tile: 6px corners, a 1px edge.
              <VenueTile
                slug={picked.slug}
                name={picked.name}
                size={22}
                cornerRadius={6}
                edgeWeight={1}
              />
            ) : (
              <VenueTile slug={picked.slug} name={picked.name} size={20} />
            )}
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
        {edit && (
          <>
            <span style={{ flex: 1 }} />
            {/* The board's 13px chevron, stroke 1.8 in a 16 box: 2.7 in
                lucide's 24 box renders the same weight. */}
            <ChevronDown
              data-testid="venue-picker-chevron"
              size={13}
              strokeWidth={2.7}
              color="var(--fg-muted)"
              aria-hidden
              style={{ flex: 'none', display: 'block' }}
            />
          </>
        )}
      </button>
      {failed}
      {shown && phone && (
        <AdminSheet title={COPY.title} onClose={close}>
          <VenueList
            id={listId}
            venues={list}
            value={value}
            phone
            onPick={pick}
          />
        </AdminSheet>
      )}
      {shown && !phone && (
        <div data-testid="venue-picker" style={{ ...POPOVER, right: 0 }}>
          <VenueList
            id={listId}
            venues={list}
            value={value}
            phone={false}
            onPick={pick}
          />
        </div>
      )}
    </div>
  );
};
