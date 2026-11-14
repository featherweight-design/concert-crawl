'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Eye, Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  useIsPhone,
} from '@/components/admin/primitives';
import { StatusChip } from '@/components/consumer/StatusChip';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { LoadMoreFooter, type LoadMoreState } from '../../crawl-runs/RunsList';
import {
  eventsListApi,
  type EventListCounts,
  type EventListPage,
  type VenueCount,
} from './events-api';
import { EventsList } from './EventsList';
import {
  EMPTY_FILTERS,
  EVENT_LIST_STATUSES,
  MAX_VENUE_FILTER,
  STATUS_CHIP,
  STATUS_FILTER_OPTIONS,
  eventsListHref,
  filtersFromParams,
  hasFilters,
  isFilterStatus,
  type EventFilters,
  type When,
} from './events-rules';
import {
  ChipCount,
  ClearMark,
  FilterPicker,
  chipStyle,
  pickedChipStyle,
} from './FilterPicker';

const COPY = ADMIN_COPY.eventsList;

/** `A3/09/load-more`: "Showing 25 of N", Load 25 more. */
export const EVENTS_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface Loaded {
  /** The filters' URL, so a page is only ever extended for its own filters. */
  key: string;
  when: When;
  data: EventListPage;
}

/**
 * 4b-1 Events (`06/events`, `06/events-mobile`, `06/past-shows`, with the
 * filters of `06/venue-filter` and `06/status-filter`). Every filter lives in
 * the URL, so a filtered list can be linked and reloaded; the rows load in
 * the browser with the admin's token. Add a show lands in 4b-3.
 */
export const EventsClient = () => {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPhone = useIsPhone();
  const api = useMemo(() => eventsListApi(getToken), [getToken]);

  const paramsKey = searchParams?.toString() ?? '';
  const filters = useMemo(
    () => filtersFromParams(new URLSearchParams(paramsKey)),
    [paramsKey],
  );

  const filtersKey = eventsListHref(filters);

  // The last page loaded, with the filters it was loaded for. Its rows are
  // drawn only under those exact filters, and Load more only extends it
  // there; its counts serve the chips while another load on the same side is
  // in flight.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  const [text, setText] = useState(filters.query);
  // The search this page last put in the URL. Only a URL search that differs
  // from it (Back, a link) rewrites the box, so typing during a pending
  // navigation is never dropped.
  const navigatedQuery = useRef(filters.query);

  const navigate = useCallback(
    (next: EventFilters) => {
      navigatedQuery.current = next.query.trim();
      router.replace(eventsListHref(next), { scroll: false });
    },
    [router],
  );

  // Every venue a load has named. The API lists each venue with a show in the
  // scope (side and search), at 0 when the other filters empty it; a ticked
  // venue with no show in the scope at all (the search leaves it out, or a
  // linked URL) is missing from `byVenue`, and still needs a row (at 0) to
  // untick in the picker.
  const knownVenues = useRef(new Map<string, VenueCount>());

  // Only the newest load may write: a slow older one must not overwrite it.
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latestLoad.current;
    // A failure belongs to the load that hit it; a new load starts clean.
    setFailed(false);
    setLoadState('idle');
    setPending(true);
    try {
      const data = await api.list(filters, 0, EVENTS_PAGE_SIZE);
      if (mine !== latestLoad.current) return;
      for (const venue of data.counts.byVenue)
        knownVenues.current.set(venue.venueId, venue);
      setLoaded({ key: eventsListHref(filters), when: filters.when, data });
      setFailed(false);
    } catch (err) {
      console.error('[admin events] list failed', err);
      if (mine === latestLoad.current) setFailed(true);
    } finally {
      if (mine === latestLoad.current) setPending(false);
    }
  }, [api, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // Typing settles before it reaches the URL.
  useEffect(() => {
    if (text.trim() === filters.query) return undefined;
    const timer = setTimeout(
      () => navigate({ ...filters, query: text }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, filters, navigate]);

  const urlQuery = filters.query;
  useEffect(() => {
    if (urlQuery === navigatedQuery.current) return;
    navigatedQuery.current = urlQuery;
    setText(urlQuery);
  }, [urlQuery]);

  const onLoadMore = async () => {
    // A page loaded for other filters, or a load still in flight, would
    // append the wrong rows at the wrong offset.
    if (loaded === null || pending || loaded.key !== filtersKey) return;
    const mine = latestLoad.current;
    const { key } = loaded;
    setLoadState('loading');
    try {
      const next = await api.list(
        filters,
        loaded.data.rows.length,
        EVENTS_PAGE_SIZE,
      );
      if (mine !== latestLoad.current) return;
      setLoaded((current) => {
        if (current === null || current.key !== key) return current;
        const seen = new Set(current.data.rows.map((row) => row.id));
        return {
          ...current,
          data: {
            ...next,
            rows: [
              ...current.data.rows,
              ...next.rows.filter((row) => !seen.has(row.id)),
            ],
          },
        };
      });
      setLoadState('idle');
    } catch (err) {
      console.error('[admin events] load more failed', err);
      if (mine === latestLoad.current) setLoadState('failed');
    }
  };

  const onWhen = (when: When) => {
    if (when !== filters.when)
      navigate({ ...EMPTY_FILTERS, when, query: filters.query });
  };

  const onClear = () => {
    setText('');
    navigate({ ...EMPTY_FILTERS, when: filters.when });
  };

  const past = filters.when === 'past';
  // Rows are drawn only under the filters they were loaded for. The counts
  // are faceted under every filter, so they are exact for the filters they
  // were loaded for; while a filter change on the same side loads, the last
  // ones stay up so the chips never blank, and the new load replaces them.
  const page =
    loaded !== null && loaded.key === filtersKey ? loaded.data : null;
  const counts =
    loaded !== null && loaded.when === filters.when
      ? loaded.data.counts
      : undefined;
  // Those last counts belong to other filters while this load is in flight,
  // so a picker's Show N waits for the new ones.
  const countsStale = pending && loaded !== null && loaded.key !== filtersKey;

  const header = (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-muted)' }}>
        {past
          ? COPY.pastSubtitle
          : counts === undefined
            ? null
            : isPhone
              ? COPY.phoneSubtitle(counts.all)
              : COPY.subtitle(counts.all)}
      </p>
    </header>
  );

  if (failed && loaded === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}
        <CouldntLoad page={COPY.title} onRetry={() => void load()} />
      </div>
    );
  }

  if (loaded === null) {
    return (
      <PageSkeleton
        heading
        inlineSearch
        card
        filters={5}
        rows={8}
        columns={5}
        rowHeight={65}
      />
    );
  }

  const searchBox = (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        width: isPhone ? '100%' : 260,
        flex: 'none',
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        color: 'var(--fg-subtle)',
      }}
    >
      <Search size={15} strokeWidth={1.7} aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(evt) => setText(evt.target.value)}
        placeholder={COPY.search}
        aria-label={COPY.search}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--fg)',
        }}
      />
    </label>
  );

  const whenChips = (['upcoming', 'past'] as const).map((when) => (
    <button
      key={when}
      type="button"
      aria-pressed={filters.when === when}
      style={chipStyle(filters.when === when)}
      onClick={() => onWhen(when)}
    >
      {COPY.when[when]}
    </button>
  ));

  // On, a count chip keeps its count and gains a × (`04/filter-chips-picked`);
  // the whole chip still toggles, so the × is drawn, not a second button.
  const toggleChip = (key: 'noPrice' | 'hidden', count: number) => {
    const on = filters[key];
    return (
      <button
        key={key}
        type="button"
        aria-pressed={on}
        style={on ? pickedChipStyle : chipStyle(false)}
        onClick={() => navigate({ ...filters, [key]: !on })}
      >
        {on && key === 'hidden' && (
          <Eye
            size={13}
            strokeWidth={1.6}
            aria-hidden="true"
            style={{ flex: 'none', display: 'block', color: 'var(--fg-muted)' }}
          />
        )}
        {COPY[key]}
        <ChipCount count={count} on={on} />
        {on && <ClearMark />}
      </button>
    );
  };

  // The venue chip's pick: the glyph and name, or the first two glyphs
  // stacked and "Red Rocks +1". A linked venue with no show in any load so
  // far has no name to show, so the chip counts them instead.
  const pickedVenues = (() => {
    const [firstId] = filters.venueIds;
    const first =
      firstId === undefined ? undefined : knownVenues.current.get(firstId);
    const more = filters.venueIds.length - 1;
    // "First name, then +N": with the first pick unnamed, count them all.
    if (first === undefined) {
      const text = COPY.venueCount(filters.venueIds.length);
      return { text, node: text };
    }
    const text = more === 0 ? first.name : COPY.venuesPicked(first.name, more);
    const glyphs = filters.venueIds.slice(0, 2).flatMap((id) => {
      const venue = knownVenues.current.get(id);
      return venue === undefined ? [] : [venue];
    });
    const node = (
      <>
        <span style={{ display: 'inline-flex', flex: 'none' }}>
          {glyphs.map((venue, index) => (
            <span
              key={venue.venueId}
              style={{
                display: 'inline-flex',
                marginLeft: index === 0 ? 0 : -6,
                borderRadius: 5,
                boxShadow: index === 0 ? 'none' : '0 0 0 2px var(--surface-2)',
              }}
            >
              <VenueTile slug={venue.slug} name={venue.name} size={18} />
            </span>
          ))}
        </span>
        {/* A long name ellipsises rather than push the row past 320px. */}
        <span
          style={{
            minWidth: 0,
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {text}
        </span>
      </>
    );
    return { text, node };
  })();

  // The status chip's pick: the StatusChip itself, or "2 statuses".
  const [onlyStatus] = filters.statuses;
  const pickedStatuses =
    filters.statuses.length === 1 && onlyStatus !== undefined
      ? {
          text: COPY.status[onlyStatus],
          node: (
            <StatusChip
              status={STATUS_CHIP[onlyStatus]}
              label={COPY.status[onlyStatus]}
            />
          ),
        }
      : (() => {
          const text = COPY.statusesPicked(filters.statuses.length);
          return { text, node: text };
        })();

  const withTicked = (byVenue: readonly VenueCount[]): VenueCount[] => {
    const listed = new Set(byVenue.map((venue) => venue.venueId));
    const ticked = filters.venueIds.flatMap((id) => {
      const known = knownVenues.current.get(id);
      return listed.has(id) || known === undefined
        ? []
        : [{ ...known, total: 0 }];
    });
    return [...byVenue, ...ticked];
  };

  const filterChipsFor = (shownCounts: EventListCounts) => ({
    venue: (
      <FilterPicker
        key="venue"
        label={COPY.anyVenue}
        picked={pickedVenues.node}
        pickedLabel={COPY.venuePickedLabel(pickedVenues.text)}
        clearLabel={COPY.clearVenues}
        testId="venue-filter"
        search={COPY.findVenue}
        max={MAX_VENUE_FILTER}
        stale={countsStale}
        unticked={shownCounts.byVenue.reduce(
          (sum, venue) => sum + venue.total,
          0,
        )}
        selected={filters.venueIds}
        options={withTicked(shownCounts.byVenue)
          .sort(
            (one, two) =>
              two.total - one.total || one.name.localeCompare(two.name),
          )
          .map((venue) => ({
            key: venue.venueId,
            label: venue.name,
            count: venue.total,
            icon: <VenueTile slug={venue.slug} name={venue.name} size={20} />,
          }))}
        onApply={(venueIds) => navigate({ ...filters, venueIds })}
      />
    ),
    status: (
      <FilterPicker
        key="status"
        label={COPY.anyStatus}
        picked={pickedStatuses.node}
        pickedLabel={COPY.statusPickedLabel(pickedStatuses.text)}
        clearLabel={COPY.clearStatuses}
        testId="status-filter"
        stale={countsStale}
        // Every status, not only the pickable ones: with nothing ticked,
        // No longer listed and Played rows show too.
        unticked={EVENT_LIST_STATUSES.reduce(
          (sum, status) => sum + (shownCounts.byStatus[status] ?? 0),
          0,
        )}
        selected={filters.statuses}
        options={STATUS_FILTER_OPTIONS.map((status) => ({
          key: status,
          label: COPY.status[status],
          count: shownCounts.byStatus[status] ?? 0,
        }))}
        onApply={(keys) =>
          navigate({ ...filters, statuses: keys.filter(isFilterStatus) })
        }
      />
    ),
    noPrice: toggleChip('noPrice', shownCounts.noPrice),
    hidden: toggleChip('hidden', shownCounts.hidden),
  });

  // Past draws none of these (`06/past-shows`). On Upcoming they wait for
  // this side's first counts, which the skeleton below covers.
  const filterChips =
    past || counts === undefined ? null : filterChipsFor(counts);

  // Desktop draws one row: search, the side, a rule, then the filters. The
  // phone stacks search over a scrolling chip row in the board's order
  // (`06/events-mobile`, with Past added by 4b#23).
  const filterRow = isPhone ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {searchBox}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {whenChips}
        {filterChips && [
          filterChips.noPrice,
          filterChips.hidden,
          filterChips.venue,
          filterChips.status,
        ]}
      </div>
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {searchBox}
      {whenChips}
      {filterChips && (
        <>
          <span
            aria-hidden="true"
            style={{ width: 1, height: 24, background: 'var(--border)' }}
          />
          {filterChips.venue}
          {filterChips.status}
          {filterChips.noPrice}
          {filterChips.hidden}
        </>
      )}
    </div>
  );

  const footer = (shownPage: EventListPage) => {
    const shown = shownPage.rows.length;
    return (
      <div style={{ padding: isPhone ? '0 0 12px' : '0 18px 14px' }}>
        <LoadMoreFooter
          shown={shown}
          total={shownPage.total}
          step={Math.min(
            EVENTS_PAGE_SIZE,
            Math.max(0, shownPage.total - shown),
          )}
          more={shown < shownPage.total}
          // Nothing more loads while a load for these filters is in flight.
          state={pending ? 'loading' : loadState}
          onLoadMore={() => void onLoadMore()}
          note={past ? COPY.pastNote : undefined}
          failedLabel={COPY.loadMoreFailed}
          testId="events-load-more"
        />
      </div>
    );
  };

  const content = failed ? (
    <CouldntLoad page={COPY.title} onRetry={() => void load()} />
  ) : page === null ? (
    // A page for other filters is still on hand: the table's skeleton, under
    // the filter row, until these filters' page arrives (`07/loading-events`).
    <PageSkeleton card rows={8} columns={5} rowHeight={65} />
  ) : page.total === 0 ? (
    <EmptyState
      title={COPY.empty.title}
      body={COPY.empty.body}
      action={
        hasFilters(filters) ? (
          <AdminButton type="button" variant="outline" onClick={onClear}>
            {COPY.empty.clear}
          </AdminButton>
        ) : undefined
      }
    />
  ) : isPhone ? (
    <div>
      <EventsList rows={page.rows} when={filters.when} />
      {footer(page)}
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
      <EventsList rows={page.rows} when={filters.when} />
      {footer(page)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {header}
      {filterRow}
      {content}
    </div>
  );
};
