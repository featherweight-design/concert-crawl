'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Music, Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  ConfirmDialog,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  Pagination,
  SaveFailedToast,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  PAGE_SIZE,
  StaleRowError,
  artistsApi,
  type AdminArtistRow,
  type ArtistCounts,
  type ArtistTab,
  type ArtistWrite,
  type ShowWindow,
} from './artists-api';
import { belongsTo } from './artist-rules';
import { SECONDARY_BUTTON, gradientBorder } from './artist-styles';
import { MatchedRow, NotArtistRow } from './MatchedRows';
import { ToCheckRow } from './ToCheckRow';

const COPY = ADMIN_COPY.artists;

const TAB_LABEL: Record<ArtistTab, string> = {
  to_check: COPY.tabs.toCheck,
  matched: COPY.tabs.matched,
  not_an_artist: COPY.tabs.notArtists,
};

/** The loaded row's height per tab, so the skeleton doesn't jump. */
const ROW_HEIGHT: Record<ArtistTab, { phone: number; desktop: number }> = {
  to_check: { phone: 138, desktop: 94 },
  matched: { phone: 112, desktop: 68 },
  not_an_artist: { phone: 112, desktop: 64 },
};

const WINDOWS: ShowWindow[] = ['soon', 'later', 'none'];
const WINDOW_COUNT: Record<ShowWindow, keyof ArtistCounts> = {
  soon: 'to_check_soon',
  later: 'to_check_later',
  none: 'to_check_none',
};

/** A tab's count: 12px beside a desktop tab, 11px in a phone segment. */
const Count = ({ value, phone }: { value: number | null; phone: boolean }) =>
  value == null ? null : (
    <span
      style={{
        fontSize: phone ? 11 : 12,
        color: 'var(--fg-subtle)',
        marginLeft: phone ? 5 : 6,
      }}
    >
      {value}
    </span>
  );

/** To check, Matched, Not artists: underline tabs, or the phone's segments. */
const Tabs = ({
  isPhone,
  counts,
  value,
  onChange,
}: {
  isPhone: boolean;
  counts: ArtistCounts | null;
  value: ArtistTab;
  onChange: (next: ArtistTab) => void;
}) => {
  const tabs: { key: ArtistTab; label: string }[] = [
    { key: 'to_check', label: TAB_LABEL.to_check },
    { key: 'matched', label: TAB_LABEL.matched },
    { key: 'not_an_artist', label: TAB_LABEL.not_an_artist },
  ];
  return (
    <div
      role="tablist"
      aria-label={COPY.tabs.label}
      style={
        isPhone
          ? {
              display: 'flex',
              padding: 3,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }
          : { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }
      }
    >
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              cursor: 'pointer',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
              border: 'none',
              ...(isPhone
                ? {
                    flex: 1,
                    height: 32,
                    borderRadius: 7,
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: on ? 'var(--bg-elevated)' : 'transparent',
                  }
                : {
                    height: 40,
                    padding: '0 14px',
                    fontSize: 14,
                    fontWeight: 600,
                    background: 'transparent',
                    borderBottom: `2px solid ${on ? 'var(--signal)' : 'transparent'}`,
                  }),
            }}
          >
            {tab.label}
            <Count value={counts ? counts[tab.key] : null} phone={isPhone} />
          </button>
        );
      })}
    </div>
  );
};

/** Show in 60 days, Later, No show: pills with counts. */
const WindowChips = ({
  value,
  counts,
  onChange,
}: {
  value: ShowWindow;
  counts: ArtistCounts | null;
  onChange: (next: ShowWindow) => void;
}) => (
  <div
    role="group"
    aria-label={COPY.windows.label}
    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
  >
    {WINDOWS.map((key) => {
      const on = key === value;
      return (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(key)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 32,
            padding: '0 12px',
            borderRadius: 999,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            color: on ? 'var(--fg)' : 'var(--fg-muted)',
            ...(on
              ? gradientBorder('var(--surface-2)')
              : {
                  border: '1px solid var(--border)',
                  background:
                    'color-mix(in oklab, var(--bg-elevated) 60%, transparent)',
                }),
          }}
        >
          {COPY.windows[key]}
          {counts && (
            <span
              style={{
                fontSize: 11.5,
                color: on ? 'var(--fg-muted)' : 'var(--fg-subtle)',
              }}
            >
              {counts[WINDOW_COUNT[key]]}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

const SearchBox = ({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (next: string) => void;
  width: number | '100%';
}) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      width,
      padding: '0 12px',
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      color: 'var(--fg-subtle)',
      boxSizing: 'border-box',
    }}
  >
    <Search size={14} aria-hidden style={{ flex: 'none' }} />
    <input
      type="search"
      // The API caps a search at 200 characters.
      maxLength={200}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={COPY.search}
      aria-label={COPY.search}
      style={{
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: 'var(--fg)',
        fontFamily: 'inherit',
        fontSize: 13,
      }}
    />
  </label>
);

/** A write in flight or failed: the row and where it sat, to put it back. */
interface Pending {
  row: AdminArtistRow;
  index: number;
  write: ArtistWrite;
  tab: ArtistTab;
}

/**
 * 4c Artists (`06/artists-to-check`, `06/artists-matched`,
 * `06/artists-not-artists`, `06/artists-mobile`). The artist search lands in
 * 4c C.
 */
export function ArtistsClient() {
  const { getToken } = useAuth();
  const isPhone = useIsPhone();
  const api = useMemo(() => artistsApi(getToken), [getToken]);
  const [tab, setTab] = useState<ArtistTab>('to_check');
  const [counts, setCounts] = useState<ArtistCounts | null>(null);
  const [showWindow, setShowWindow] = useState<ShowWindow>('soon');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{
    rows: AdminArtistRow[];
    total: number;
    /** A search hit only rows that live in another tab. */
    elsewhere?: boolean;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<Pending | null>(null);
  const [confirming, setConfirming] = useState<AdminArtistRow | null>(null);
  // Bumped on every load, so a stale response never lands over a newer one.
  const generation = useRef(0);
  // Rows saved out of To check, keyed to the load that was current then: a
  // load started before the save may still list them, so it drops them.
  const resolved = useRef(new Map<string, number>());
  const listRef = useRef<HTMLUListElement>(null);

  // A keystroke per request would spend a query on every prefix of the name.
  // Only a changed search resets the page, so mounting never undoes paging.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return undefined;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // A late /counts response never lands over a newer one.
  const countsGeneration = useRef(0);
  const loadCounts = useCallback(() => {
    const mine = ++countsGeneration.current;
    api
      .counts()
      .then((next) => {
        if (mine === countsGeneration.current) setCounts(next);
      })
      // The counts are a nicety; the list still works without them.
      .catch((err: unknown) => {
        console.error('[admin artists] counts failed', err);
      });
  }, [api]);

  /**
   * Rows saved off a page, by filter and page. The server's later pages
   * shift up by that many, so a page's offset subtracts the rows saved off
   * the pages before it, and no row is skipped.
   */
  const removals = useRef<{ key: string; page: number }[]>([]);
  const filterKey = `${tab}|${showWindow}|${search}`;

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setLoadFailed(false);
    setList(null);
    const shift = removals.current.filter(
      (each) => each.key === filterKey && each.page < page,
    ).length;
    try {
      const next = await api.list({
        tab,
        ...(tab === 'to_check' ? { window: showWindow } : {}),
        search,
        offset: Math.max(0, (page - 1) * PAGE_SIZE - shift),
      });
      if (mine !== generation.current) return;
      const fresh = next.rows.filter(
        (row) => (resolved.current.get(row.id) ?? -1) < mine,
      );
      const dropped = next.rows.length - fresh.length;
      // A search lists every status; each tab keeps only its own rows, and
      // pages through the search's own total.
      const rows =
        search === '' ? fresh : fresh.filter((row) => belongsTo(tab, row));
      setList({
        rows,
        total: Math.max(0, next.total - dropped),
        // Only when the API returned every hit: a capped page can hold this
        // tab's matches further on.
        elsewhere:
          search !== '' &&
          rows.length === 0 &&
          fresh.length > 0 &&
          next.total <= next.rows.length,
      });
    } catch (err) {
      console.error('[admin artists] list failed', err);
      if (mine === generation.current) setLoadFailed(true);
    }
  }, [api, tab, showWindow, search, page, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // A write's 409 reloads what is on screen now, not the tab it began on.
  const loadRef = useRef(load);
  loadRef.current = load;

  // Saving the last row of a later page leaves that page empty: step back.
  useEffect(() => {
    if (list && list.rows.length === 0 && page > 1 && search === '') {
      setPage((prev) => Math.max(1, prev - 1));
    }
  }, [list, page, search]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const setRowBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /**
   * Every write here moves the row out of its tab, so it leaves at once and
   * comes back where it was if the save fails (rule 10). A 409 means the row
   * changed under the page: reload rather than retry a stale answer.
   */
  const runWrite = async (row: AdminArtistRow, write: ArtistWrite) => {
    // A retry from the toast can run after the list moved on; it still saves.
    const index = list?.rows.findIndex((each) => each.id === row.id) ?? -1;
    const mine = generation.current;
    const at = { key: filterKey, page };
    const searched = search !== '';
    setFailed(null);
    setRowBusy(row.id, true);
    // Resolved before the PATCH, so a load landing mid-write drops the row;
    // a failed save clears it again.
    resolved.current.set(row.id, Number.MAX_SAFE_INTEGER);
    if (index >= 0) {
      setList((prev) =>
        prev
          ? {
              rows: prev.rows.filter((each) => each.id !== row.id),
              total: Math.max(0, prev.total - 1),
            }
          : prev,
      );
      // The pressed button left with its row; keep focus in the list.
      requestAnimationFrame(() => listRef.current?.focus());
    }
    try {
      await api.write(row.id, write);
      // Loads from here on may list it again wherever it now belongs.
      resolved.current.set(row.id, generation.current);
      // A search pages through every status, where a save moves nothing.
      if (index >= 0 && !searched) removals.current.push(at);
      loadCounts();
    } catch (err) {
      resolved.current.delete(row.id);
      if (err instanceof StaleRowError) {
        void loadRef.current();
        loadCounts();
        return;
      }
      console.error('[admin artists] save failed', row.id, err);
      // Snap back only into the list the row left; a newer list never had it.
      if (index >= 0 && generation.current === mine) {
        setList((prev) => {
          if (!prev || prev.rows.some((each) => each.id === row.id))
            return prev;
          const rows = [...prev.rows];
          rows.splice(Math.min(index, rows.length), 0, row);
          return { ...prev, rows, total: prev.total + 1 };
        });
      }
      setFailed({ row, index, write, tab });
    } finally {
      setRowBusy(row.id, false);
    }
  };

  const toast = failed && (
    <SaveFailedToast
      what={failed.row.name}
      saved={COPY.stillIn(TAB_LABEL[failed.tab])}
      onRetry={() => void runWrite(failed.row, failed.write)}
    />
  );

  let body;
  if (loadFailed) {
    body = <CouldntLoad page={COPY.title} onRetry={() => void load()} />;
  } else if (list == null) {
    body = (
      <PageSkeleton
        columns={isPhone ? 2 : 3}
        rows={isPhone ? 5 : 6}
        rowHeight={ROW_HEIGHT[tab][isPhone ? 'phone' : 'desktop']}
      />
    );
  } else if (list.rows.length === 0) {
    body =
      search !== '' ? (
        <EmptyState
          title={
            list.elsewhere
              ? COPY.noResults.elsewhereTitle
              : COPY.noResults.title
          }
          body={
            list.elsewhere ? COPY.noResults.elsewhereBody : COPY.noResults.body
          }
          action={
            <AdminButton
              type="button"
              onClick={() => setSearchInput('')}
              style={{ ...SECONDARY_BUTTON, height: 34 }}
            >
              {COPY.noResults.clear}
            </AdminButton>
          }
        />
      ) : (
        // Each tab reuses `artists-to-check-empty` with its own line.
        <EmptyState
          icon={Music}
          {...(tab === 'to_check'
            ? { title: COPY.empty.title, body: COPY.empty[showWindow] }
            : tab === 'matched'
              ? COPY.emptyMatched
              : COPY.emptyNotArtists)}
        />
      );
  } else {
    body = (
      <ul
        ref={listRef}
        tabIndex={-1}
        data-testid="artists-list"
        aria-label={TAB_LABEL[tab]}
        style={{ listStyle: 'none', margin: 0, padding: 0, outline: 'none' }}
      >
        {list.rows.map((row) =>
          tab === 'to_check' ? (
            <ToCheckRow
              key={row.id}
              row={row}
              api={api}
              isPhone={isPhone}
              busy={busy.has(row.id)}
              onWrite={(write) => void runWrite(row, write)}
              onNotAnArtist={() => setConfirming(row)}
            />
          ) : tab === 'matched' ? (
            <MatchedRow
              key={row.id}
              row={row}
              isPhone={isPhone}
              busy={busy.has(row.id)}
              onNotAnArtist={() => setConfirming(row)}
            />
          ) : (
            <NotArtistRow
              key={row.id}
              row={row}
              isPhone={isPhone}
              busy={busy.has(row.id)}
              onItsAnArtist={() =>
                void runWrite(row, { kind: 'its_an_artist' })
              }
            />
          ),
        )}
      </ul>
    );
  }

  const changeTab = (next: ArtistTab) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    // A search reads one tab's rows; the next tab starts unfiltered.
    setSearchInput('');
    setSearch('');
  };
  const tabs = (
    <Tabs isPhone={isPhone} counts={counts} value={tab} onChange={changeTab} />
  );
  const hasSearch = tab !== 'not_an_artist';

  const chips = (
    <WindowChips
      value={showWindow}
      counts={counts}
      onChange={(next) => {
        setShowWindow(next);
        setPage(1);
      }}
    />
  );

  const pager = list && list.total > PAGE_SIZE && (
    <Pagination
      page={page}
      pageSize={PAGE_SIZE}
      total={list.total}
      onPageChange={setPage}
      showSizeSelector={false}
      itemLabel={COPY.itemLabel}
    />
  );

  const confirm = confirming && (
    <ConfirmDialog
      title={COPY.notAnArtistConfirm.title(confirming.name)}
      body={COPY.notAnArtistConfirm.body}
      confirmLabel={COPY.notAnArtistConfirm.confirm}
      onCancel={() => setConfirming(null)}
      onConfirm={() => {
        setConfirming(null);
        void runWrite(confirming, { kind: 'not_an_artist' });
      }}
    />
  );

  if (isPhone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* The shell's bar carries the title; the count sits under it. */}
        <p
          style={{
            margin: '-10px 0 0',
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            minHeight: 16,
          }}
        >
          {counts ? COPY.toCheckCount(counts.to_check) : null}
        </p>
        {hasSearch && (
          <SearchBox
            value={searchInput}
            onChange={setSearchInput}
            width="100%"
          />
        )}
        {tabs}
        {tab === 'to_check' && search === '' && chips}
        {toast}
        {body}
        {pager}
        {confirm}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {COPY.title}
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13.5,
            color: 'var(--fg-muted)',
          }}
        >
          {/* Matched and Not artists drop the reports sentence. */}
          {tab === 'to_check' ? COPY.subtitle : COPY.subtitleShort}
        </p>
      </div>
      {tabs}
      {toast}
      {/* Matched draws its search above the card; Not artists has none. */}
      {tab === 'matched' && (
        <SearchBox value={searchInput} onChange={setSearchInput} width={260} />
      )}
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          // The ⋯ menu must not clip on the last rows; To check's toolbar
          // and rows draw no fill past the radius, so nothing needs clipping.
          overflow: tab === 'matched' ? 'visible' : 'hidden',
        }}
      >
        {tab === 'to_check' && (
          <div
            style={{
              padding: '12px 18px',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {search === '' && chips}
            <span style={{ flex: 1 }} />
            <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              width={220}
            />
          </div>
        )}
        {list != null && list.rows.length > 0 ? (
          body
        ) : (
          <div
            style={{ borderTop: '1px solid var(--border)', padding: '0 18px' }}
          >
            {body}
          </div>
        )}
      </div>
      {pager}
      {confirm}
    </div>
  );
}
