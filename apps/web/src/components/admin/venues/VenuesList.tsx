'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Search, X } from 'lucide-react';
import type { NeedsYouItem } from '@concert-crawl/types';
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
  needsByVenue,
  crawlingLabel,
  foldOk,
  latestRunLine,
  matchesFilter,
  matchesSearch,
  sortWorstFirst,
  type VenueFilter,
  type VenueListRow,
} from './venue-list-rules';
import { PausePanel } from './PausePanel';
import {
  BULK_BUTTON,
  SELECT_BAR_HEIGHT,
  SelectBar,
  SelectBox,
  useVenueBulk,
} from './VenueBulk';
import { canPause } from './pause-rules';

const COPY = ADMIN_COPY.venuesList;

/** `04/venues-desktop`: the dot, venue, two chips, count, run line, robots. */
const COLUMNS = '8px minmax(0, 1.6fr) 96px 196px 84px minmax(0, 1.4fr) 92px';
/** `A3/03/venues-select-d`: the 18px checkbox takes the dot's place. */
const SELECT_COLUMNS =
  '18px minmax(0, 1.6fr) 96px 196px 84px minmax(0, 1.4fr) 92px';

/** The head's Select / Done button (`A3/03/venues-select-d`). */
const HEAD_BUTTON: CSSProperties = { ...BULK_BUTTON, height: 36, fontSize: 13 };

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
const Tile = ({ venue, size }: { venue: VenueListRow; size: number }) => (
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

const ROW: CSSProperties = {
  display: 'grid',
  alignItems: 'center',
  gap: 12,
  padding: '10px 18px',
  borderTop: '1px solid var(--border)',
  color: 'var(--fg)',
  textDecoration: 'none',
  // The boards set type at the browser's normal leading, not the body's.
  lineHeight: 1.25,
};

/**
 * A row opens the venue page; in Select mode (`A3/03/venues-select-d`) the
 * whole row toggles its checkbox instead, and a picked row takes a signal wash.
 */
const DesktopRow = ({
  venue,
  select,
}: {
  venue: VenueListRow;
  select?: { on: boolean; disabled: boolean; onToggle: () => void };
}) =>
  select ? (
    <label
      data-testid="venue-row"
      data-venue-id={venue.id}
      data-select-option
      style={{
        ...ROW,
        gridTemplateColumns: SELECT_COLUMNS,
        cursor: select.disabled ? 'default' : 'pointer',
        background: select.on
          ? 'color-mix(in srgb, var(--signal) 6%, transparent)'
          : undefined,
      }}
    >
      <span style={{ display: 'flex' }}>
        <input
          type="checkbox"
          className="sr-only"
          checked={select.on}
          disabled={select.disabled}
          onChange={select.onToggle}
          aria-label={COPY.selectVenue(venue.name)}
        />
        <SelectBox on={select.on} />
      </span>
      <RowCells venue={venue} />
    </label>
  ) : (
    <Link
      href={`/admin/venues/${venue.id}`}
      data-testid="venue-row"
      data-venue-id={venue.id}
      className="hover:bg-[var(--surface-2)]"
      style={{ ...ROW, gridTemplateColumns: COLUMNS }}
    >
      {/* `04/venues-desktop`: the Needs you dot, in its 8px column. */}
      <span style={{ display: 'flex' }}>
        {venue.needsLook && <NeedsYouDot halo />}
      </span>
      <RowCells venue={venue} />
    </Link>
  );

/**
 * The pink Needs you dot (`04/venues-desktop`, `04/venues-mobile`): 8px in
 * the accent, with a 3px halo on desktop. Screen readers hear its name.
 */
const NeedsYouDot = ({ halo = false }: { halo?: boolean }) => (
  <span
    data-testid="needs-you-dot"
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      flex: 'none',
      background: 'var(--accent)',
      boxShadow: halo
        ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)'
        : undefined,
    }}
  >
    <span className="sr-only">{COPY.needsYouDot}</span>
  </span>
);

const RowCells = ({ venue }: { venue: VenueListRow }) => (
  <>
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
  </>
);

const PhoneCard = ({ venue }: { venue: VenueListRow }) => (
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
        <span style={{ ...ELLIPSIS, fontSize: 15, fontWeight: 700 }}>
          {venue.name}
        </span>
        {/* `04/venues-mobile`: the dot follows the name, without the halo. */}
        {venue.needsLook && <NeedsYouDot />}
        <span style={{ flex: 1 }} />
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
  needsYou = null,
}: {
  venues: VenueListRow[] | null;
  /** Open Needs you items; null when that list didn't load. */
  needsYou?: readonly Pick<NeedsYouItem, 'venueId'>[] | null;
}) => {
  const router = useRouter();
  const isPhone = useIsPhone();
  const [chosenFilter, setFilter] = useState<VenueFilter>('all');
  // "Needs a look" without the Needs you list would hide every row with no
  // chip left to clear it, so it falls back to All.
  const filter: VenueFilter =
    chosenFilter === 'needsLook' && needsYou === null ? 'all' : chosenFilter;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  // The API leaves taken-down venues out (row 11). Each row learns whether it
  // has an item in Needs you; without that list, no row does.
  const listed = useMemo(() => {
    const rows = venues ?? [];
    if (needsYou === null) return rows;
    const counts = needsByVenue(needsYou);
    return rows.map((venue) => ({
      ...venue,
      needsLook: counts.has(venue.id),
    }));
  }, [venues, needsYou]);
  // Without the Needs you list the chip would filter on nothing, so it goes.
  const filters = VENUE_FILTERS.filter(
    (key) => key !== 'needsLook' || needsYou !== null,
  );
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
  // No phone board draws Select, so the phone has none; switching to it
  // leaves Select (the hook resets).
  const bulk = useVenueBulk({ listed, visible: shown, isPhone });
  const selecting = bulk.selecting && !isPhone;
  const pickedShown = bulk.picked.length;
  // Bulk Pause sends only venues being crawled (see `canPause`).
  const pausable = bulk.picked.filter(canPause);
  const allShown = shown.length > 0 && pickedShown === shown.length;
  const someShown = pickedShown > 0 && !allShown;

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
            <button
              type="button"
              onClick={selecting ? bulk.stop : bulk.start}
              // Done waits for a request out: it settles into Select's state.
              disabled={selecting && bulk.busy}
              style={{
                ...HEAD_BUTTON,
                opacity: selecting && bulk.busy ? 0.45 : 1,
              }}
            >
              {selecting ? COPY.done : COPY.select}
            </button>
            {/* `A3/03/venues-select-d` drops Add a venue while selecting. */}
            {!selecting && <AddVenueModal />}
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
        {filters.map((key) => {
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

      {/* On the phone too: a failure from before a switch stays said. */}
      {bulk.toast}

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
            style={{
              display: 'grid',
              gridTemplateColumns: selecting ? SELECT_COLUMNS : COLUMNS,
              alignItems: 'center',
              gap: 12,
              padding: '12px 18px',
            }}
          >
            {selecting ? (
              <label
                data-select-option
                style={{ display: 'flex', cursor: 'pointer', borderRadius: 5 }}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  // Some picked, not all: the mixed state, set on the node
                  // because React has no prop for it.
                  ref={(node) => {
                    if (node) node.indeterminate = someShown;
                  }}
                  checked={allShown}
                  disabled={bulk.busy}
                  onChange={() =>
                    bulk.setMany(
                      shown.map((venue) => venue.id),
                      !allShown,
                    )
                  }
                  aria-label={COPY.selectAll}
                />
                <SelectBox on={allShown} mixed={someShown} />
              </label>
            ) : (
              <span />
            )}
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.venue}
            </span>
            {/* The drawn head is visual only; each cell names its column. */}
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.onSite}
            </span>
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.crawling}
            </span>
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.upcoming}
            </span>
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.latestRun}
            </span>
            <span aria-hidden style={HEAD_CELL}>
              {COPY.columns.robots}
            </span>
          </div>
          {shown.map((venue) => (
            <DesktopRow
              key={venue.id}
              venue={venue}
              {...(selecting && {
                select: {
                  on: bulk.selected.has(venue.id),
                  disabled: bulk.busy,
                  onToggle: () => bulk.toggle(venue.id),
                },
              })}
            />
          ))}
          {foldRow}
        </div>
      )}
      {selecting && (
        <>
          {/* Room for the pinned bar, so the last row can scroll clear. */}
          <div aria-hidden style={{ height: SELECT_BAR_HEIGHT - 16 }} />
          <SelectBar bulk={bulk} />
        </>
      )}
      {bulk.pausing && pausable.length > 0 && (
        <PausePanel
          venues={pausable}
          onClose={bulk.closePause}
          onSubmit={(body) =>
            bulk.pause(
              pausable.map((venue) => venue.id),
              body,
            )
          }
          refused={bulk.refused}
        />
      )}
    </div>
  );
};
