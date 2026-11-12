'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Search, X } from 'lucide-react';
import type { VenueWithEventCount } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AddVenueModal } from '@/components/admin/AddVenueModal';
import {
  CouldntLoad,
  EmptyState,
  VenueStatus,
  useIsPhone,
} from '@/components/admin/primitives';
import { VenueTile } from '@/components/consumer/venue-glyph';
import {
  VENUE_FILTERS,
  crawlingLabel,
  foldOk,
  latestRunLine,
  matchesFilter,
  matchesSearch,
  sortWorstFirst,
  withoutTakenDown,
  type VenueFilter,
} from './venue-list-rules';

const COPY = ADMIN_COPY.venuesList;

/** `04/venues-desktop`: the dot, venue, two chips, count, run line, robots. */
const COLUMNS = '8px minmax(0, 1.6fr) 96px 196px 84px minmax(0, 1.4fr) 92px';

const HEAD_CELL: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

const ELLIPSIS: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const RUN_LINE: CSSProperties = {
  ...ELLIPSIS,
  fontSize: 12.5,
  color: 'var(--fg-muted)',
};

const FOLD_ROW: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'block',
  width: '100%',
  cursor: 'pointer',
  fontSize: 12.5,
  color: 'var(--fg-subtle)',
};

const chipStyle = (on: boolean): CSSProperties => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  flex: 'none',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
});

const Robots = ({ allowed }: { allowed: boolean | null }) => {
  if (allowed === null) {
    return (
      <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
        {COPY.robots.notChecked}
      </span>
    );
  }
  const Icon = allowed ? Check : X;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        color: allowed ? 'var(--fg-muted)' : 'var(--warning)',
      }}
    >
      <Icon
        size={13}
        strokeWidth={2}
        aria-hidden
        style={{ flex: 'none', color: allowed ? 'var(--success)' : undefined }}
      />
      {allowed ? COPY.robots.allowed : COPY.robots.disallowed}
    </span>
  );
};

/** The venue's glyph tile at a fixed size; a long name never squeezes it. */
const Tile = ({
  venue,
  size,
}: {
  venue: VenueWithEventCount;
  size: number;
}) => (
  <span style={{ display: 'flex', flex: 'none' }}>
    <VenueTile slug={venue.slug} name={venue.name} size={size} />
  </span>
);

/**
 * The column's name for screen readers. The drawn header row is visual only,
 * since each row is one link, so every cell carries its own name.
 */
const ColumnName = ({ name }: { name: string }) => (
  <span className="sr-only">{COPY.cellName(name)}</span>
);

const DesktopRow = ({ venue }: { venue: VenueWithEventCount }) => (
  <Link
    href={`/admin/venues/${venue.id}`}
    data-testid="venue-row"
    data-venue-id={venue.id}
    className="hover:bg-[var(--surface-2)]"
    style={{
      display: 'grid',
      gridTemplateColumns: COLUMNS,
      alignItems: 'center',
      gap: 12,
      padding: '10px 18px',
      borderTop: '1px solid var(--border)',
      color: 'var(--fg)',
      textDecoration: 'none',
      // The boards set type at the browser's normal leading, not the body's.
      lineHeight: 1.25,
    }}
  >
    {/* HOLD: the Needs you dot waits on 2a (ruling 18). */}
    <span aria-hidden />
    <span
      style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
    >
      <Tile venue={venue} size={34} />
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            ...ELLIPSIS,
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {venue.name}
        </span>
        {venue.neighborhood && (
          <span
            style={{
              ...ELLIPSIS,
              display: 'block',
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            {venue.neighborhood}
          </span>
        )}
      </span>
    </span>
    <span style={{ minWidth: 0 }}>
      <ColumnName name={COPY.columns.onSite} />
      <VenueStatus venue={venue} inList only="onSite" />
    </span>
    <span style={{ minWidth: 0 }}>
      <ColumnName name={COPY.columns.crawling} />
      <VenueStatus
        venue={venue}
        inList
        only="crawling"
        crawlingLabel={crawlingLabel(venue)}
      />
    </span>
    <span
      style={{
        fontSize: 13.5,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <ColumnName name={COPY.columns.upcoming} />
      {venue.eventCount.toLocaleString('en-US')}
    </span>
    <span style={RUN_LINE}>
      <ColumnName name={COPY.columns.latestRun} />
      {latestRunLine(venue)}
    </span>
    <span>
      <ColumnName name={COPY.columns.robots} />
      <Robots allowed={venue.robotsTxtAllowed} />
    </span>
  </Link>
);

const PhoneCard = ({ venue }: { venue: VenueWithEventCount }) => (
  <Link
    href={`/admin/venues/${venue.id}`}
    data-testid="venue-row"
    data-venue-id={venue.id}
    style={{
      display: 'flex',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
      color: 'var(--fg)',
      textDecoration: 'none',
      lineHeight: 1.25,
    }}
  >
    <Tile venue={venue} size={40} />
    <span
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...ELLIPSIS, flex: 1, fontSize: 15, fontWeight: 700 }}>
          {venue.name}
        </span>
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {COPY.shows(venue.eventCount)}
        </span>
      </span>
      <VenueStatus venue={venue} inList crawlingLabel={crawlingLabel(venue)} />
      <span style={RUN_LINE}>{latestRunLine(venue)}</span>
    </span>
  </Link>
);

/**
 * The Venues list (3a part 2): worst first, filter chips, search, and OK
 * venues folded below the fold. Rows open the venue page. Select, Pause and
 * the ⋯ menu land in parts 3 and 4. `venues` is null when the list failed to
 * load.
 */
export const VenuesList = ({
  venues,
}: {
  venues: VenueWithEventCount[] | null;
}) => {
  const router = useRouter();
  const isPhone = useIsPhone();
  const [filter, setFilter] = useState<VenueFilter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const listed = useMemo(() => withoutTakenDown(venues ?? []), [venues]);
  const upcoming = listed.reduce((sum, venue) => sum + venue.eventCount, 0);
  const sorted = useMemo(
    () =>
      sortWorstFirst(
        listed.filter(
          (venue) =>
            matchesFilter(venue, filter) && matchesSearch(venue, query),
        ),
      ),
    [listed, filter, query],
  );
  // The fold is for the whole list; a filter or a search is already short.
  const folds = filter === 'all' && !query.trim() && !expanded;
  const { shown, folded } = folds
    ? foldOk(sorted)
    : { shown: sorted, folded: [] };

  if (venues === null) {
    return <CouldntLoad page={COPY.title} onRetry={() => router.refresh()} />;
  }

  const search = (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        width: isPhone ? '100%' : 280,
        minWidth: 0,
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }}
    >
      <Search
        size={15}
        strokeWidth={1.7}
        aria-hidden
        style={{ flex: 'none', color: 'var(--fg-subtle)' }}
      />
      <input
        type="search"
        value={query}
        onChange={(evt) => {
          setQuery(evt.target.value);
          setExpanded(false);
        }}
        placeholder={COPY.search}
        aria-label={COPY.search}
        style={{
          all: 'unset',
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          color: 'var(--fg)',
        }}
      />
    </label>
  );

  const foldRow = folded.length > 0 && (
    <button
      type="button"
      onClick={() => {
        // The button goes once the rows are out, so focus moves to the
        // first row it revealed rather than falling to the page.
        const firstId = folded[0]?.id;
        setExpanded(true);
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLElement>(`[data-venue-id="${firstId}"]`)
            ?.focus(),
        );
      }}
      style={{
        ...FOLD_ROW,
        padding: isPhone ? '12px 0' : '12px 18px',
        borderTop: isPhone ? undefined : '1px solid var(--border)',
      }}
    >
      {COPY.moreOk(folded.length)}
    </button>
  );

  return (
    <div
      data-testid="venues-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 10 : 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: isPhone ? 10 : 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* On the phone the shell's top bar carries the title, as
              `04/venues-mobile` draws it, so the page doesn't repeat it. */}
          {!isPhone && (
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
              {COPY.title}
            </h1>
          )}
          <p
            style={{
              margin: isPhone ? 0 : '4px 0 0',
              fontSize: isPhone ? 12.5 : 13.5,
              color: 'var(--fg-muted)',
            }}
          >
            {isPhone
              ? COPY.subtitlePhone(listed.length)
              : COPY.subtitle(listed.length, upcoming)}
          </p>
        </div>
        {isPhone ? (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {search}
            <AddVenueModal iconOnly />
          </div>
        ) : (
          <>
            {search}
            <AddVenueModal />
          </>
        )}
      </div>

      <div
        role="group"
        aria-label={COPY.filtersLabel}
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: isPhone ? 'nowrap' : 'wrap',
          overflowX: isPhone ? 'auto' : undefined,
          scrollbarWidth: 'none',
        }}
      >
        {VENUE_FILTERS.map((key) => {
          const on = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFilter(key);
                setExpanded(false);
              }}
              style={chipStyle(on)}
            >
              {COPY.filters[key]}
              <span
                style={{
                  fontSize: 11.5,
                  color: on ? 'var(--fg-muted)' : 'var(--fg-subtle)',
                }}
              >
                {listed.filter((venue) => matchesFilter(venue, key)).length}
              </span>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={COPY.noMatch} />
      ) : isPhone ? (
        <div>
          {shown.map((venue) => (
            <PhoneCard key={venue.id} venue={venue} />
          ))}
          {foldRow}
        </div>
      ) : (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              gap: 12,
              padding: '12px 18px',
            }}
          >
            <span />
            <span style={HEAD_CELL}>{COPY.columns.venue}</span>
            <span style={HEAD_CELL}>{COPY.columns.onSite}</span>
            <span style={HEAD_CELL}>{COPY.columns.crawling}</span>
            <span style={HEAD_CELL}>{COPY.columns.upcoming}</span>
            <span style={HEAD_CELL}>{COPY.columns.latestRun}</span>
            <span style={HEAD_CELL}>{COPY.columns.robots}</span>
          </div>
          {shown.map((venue) => (
            <DesktopRow key={venue.id} venue={venue} />
          ))}
          {foldRow}
        </div>
      )}
    </div>
  );
};
