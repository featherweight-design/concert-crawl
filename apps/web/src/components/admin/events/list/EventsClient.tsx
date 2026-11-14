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

  const [page, setPage] = useState<EventListPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  const [text, setText] = useState(filters.query);

  const navigate = useCallback(
    (next: EventFilters) =>
      router.replace(eventsListHref(next), { scroll: false }),
    [router],
  );

  // Only the newest load may write: a slow older one must not overwrite it.
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latestLoad.current;
    setLoadState('idle');
    try {
      const next = await api.list(filters, 0, EVENTS_PAGE_SIZE);
      if (mine !== latestLoad.current) return;
      setPage(next);
      setFailed(false);
    } catch {
      if (mine === latestLoad.current) setFailed(true);
    }
  }, [api, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // Typing settles before it reaches the URL. A URL change from elsewhere
  // (Clear filters) brings the box along, without trimming a space as typed.
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
    setText((current) => (current.trim() === urlQuery ? current : urlQuery));
  }, [urlQuery]);

  const onLoadMore = async () => {
    if (page === null) return;
    const mine = latestLoad.current;
    setLoadState('loading');
    try {
      const next = await api.list(filters, page.rows.length, EVENTS_PAGE_SIZE);
      if (mine !== latestLoad.current) return;
      setPage((current) => {
        if (current === null) return next;
        const seen = new Set(current.rows.map((row) => row.id));
        return {
          ...next,
          rows: [
            ...current.rows,
            ...next.rows.filter((row) => !seen.has(row.id)),
          ],
        };
      });
      setLoadState('idle');
    } catch {
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

  if (failed && page === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}
        <CouldntLoad page={COPY.title} onRetry={() => void load()} />
      </div>
    );
  }

  if (page === null || counts === undefined) {
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

  const shown = page.rows.length;
  const footer = (
    <div style={{ padding: isPhone ? '0 0 12px' : '0 18px 14px' }}>
      <LoadMoreFooter
        shown={shown}
        total={page.total}
        step={Math.min(EVENTS_PAGE_SIZE, Math.max(0, page.total - shown))}
        more={shown < page.total}
        state={loadState}
        onLoadMore={() => void onLoadMore()}
        note={past ? COPY.pastNote : undefined}
        failedLabel={COPY.loadMoreFailed}
        testId="events-load-more"
      />
    </div>
  );

  const content = failed ? (
    <CouldntLoad page={COPY.title} onRetry={() => void load()} />
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
      {footer}
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
      {footer}
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
