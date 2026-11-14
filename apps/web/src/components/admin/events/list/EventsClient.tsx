'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  useIsPhone,
} from '@/components/admin/primitives';
import { LoadMoreFooter, type LoadMoreState } from '../../crawl-runs/RunsList';
import { eventsListApi, type EventListPage } from './events-api';
import { EventsList } from './EventsList';
import {
  EMPTY_FILTERS,
  eventsListHref,
  filtersFromParams,
  hasFilters,
  type EventFilters,
  type When,
} from './events-rules';

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

/** A pill on `06/events`; `on` draws the board's selected Upcoming edge. */
const chipStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  flex: 'none',
  height: 36,
  padding: '0 14px',
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: on ? 700 : 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  ...(on
    ? {
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(90deg, var(--signal), var(--accent)) border-box',
      }
    : {
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }),
});

/**
 * 4b-1 Events (`06/events`, `06/events-mobile`, `06/past-shows`). The search
 * and the side live in the URL, so a list can be linked and reloaded; the
 * rows load in the browser with the admin's token. The venue, status, No
 * price and Hidden filters land in 4b-1b, and Add a show in 4b-3.
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

  // The page on screen, with the filters it was loaded for, so Load more and
  // the rows never mix one side's or one search's page with another's.
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

  // Only the newest load may write: a slow older one must not overwrite it.
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latestLoad.current;
    setLoadState('idle');
    setPending(true);
    try {
      const data = await api.list(filters, 0, EVENTS_PAGE_SIZE);
      if (mine !== latestLoad.current) return;
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
  // A page loaded for the other side is never drawn under this one.
  const page =
    loaded !== null && loaded.when === filters.when ? loaded.data : null;
  const counts = page?.counts;

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
        height: 38,
        width: isPhone ? '100%' : 286,
        flex: 'none',
        padding: '0 14px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        color: 'var(--fg-subtle)',
      }}
    >
      <Search size={15} strokeWidth={1.8} aria-hidden="true" />
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
          fontSize: 14,
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

  // Desktop draws one row: search, then the side. The phone stacks search
  // over the chip row (`06/events-mobile`, with Past added by 4b#23).
  const filterRow = isPhone ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {searchBox}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {whenChips}
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
          // Nothing more loads while a search or side change is in flight.
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
    // The other side's page is still on hand: the table's skeleton until
    // this side's arrives (`07/loading-events`).
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
