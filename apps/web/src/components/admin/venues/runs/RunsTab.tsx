'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  CouldntLoad,
  EmptyState,
  useIsPhone,
} from '@/components/admin/primitives';
import { FaultAcknowledgeControl } from '@/components/admin/fault-acknowledge-control/FaultAcknowledgeControl';
import {
  LoadMoreFooter,
  RunFilters,
  RunListRow,
  RUNS_LIST_DESKTOP_GRID,
  RunsFilterEmpty,
  type LoadMoreState,
} from '@/components/admin/crawl-runs/RunsList';
import { RunDetailPanel } from '@/components/admin/crawl-runs/RunDetailPanel';
import {
  parseRunsPage,
  type RunRow,
  type RunsPage,
} from '@/components/admin/crawl-runs/run-data';
import {
  RUNS_FIRST_PAGE,
  filterRuns,
  hasMore,
  isNotOk,
  lastFullRuns,
  mergeRuns,
  nextLimit,
  type RunFilter,
} from '@/components/admin/crawl-runs/runs-rules';
import { apiClient } from '@/lib/api';
import {
  parseVenueRun,
  venueRunHref,
  venueTabHref,
} from '@/lib/admin/venue-tabs';

const COPY = ADMIN_COPY.venueRuns;

/** The run id when it is among the rows, else null (nothing to highlight). */
const knownRun = (
  runId: string | null,
  rows: readonly RunRow[],
): string | null =>
  runId !== null && rows.some((run) => run.id === runId) ? runId : null;

const replaceUrl = (href: string) =>
  window.history.replaceState(window.history.state, '', href);

/**
 * The venue page's Runs tab (3b part 4, `04/venue-runs`; phone
 * `04/venue-runs-mobile`). Fault acknowledgement sits on top (ruling a), then
 * the Runs card: All and Not OK, the rows, and Load more.
 *
 * Selecting a row highlights it, opens its run detail (a side panel; a
 * bottom sheet on the phone) and puts `?run=` in the URL; selecting it again,
 * or closing the detail, clears all three. `?run=` on load (Overview's Open
 * run) does the same for that row and scrolls it into view; a `?run=` not
 * among the loaded rows is dropped from the URL. Leaving the tab closes the
 * detail: the panel stays mounted, only hidden, and a dialog must not stay
 * open behind another tab. Coming back reads `?run=` from the URL again, so
 * Overview's Open run reopens a run even when `initialRun` hasn't changed.
 *
 * The first page comes from the server; Load more re-asks the API with a
 * bigger `limit` (there is no cursor), up to its cap of 100.
 */
export const RunsTab = ({
  venueId,
  runs,
  initialRun,
  active,
}: {
  venueId: string;
  /** The first page, newest first; null when that fetch failed. */
  runs: RunsPage | null;
  /** The run `?run=` named, opened on load. */
  initialRun: string | null;
  /** Whether the Runs tab is the one showing. */
  active: boolean;
}) => {
  const phone = useIsPhone();
  const router = useRouter();
  const { getToken } = useAuth();

  const [rows, setRows] = useState<RunRow[]>(runs?.rows ?? []);
  const [limit, setLimit] = useState(RUNS_FIRST_PAGE);
  const [more, setMore] = useState(
    hasMore(runs?.returned ?? 0, RUNS_FIRST_PAGE),
  );
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  const [filter, setFilter] = useState<RunFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    knownRun(initialRun, runs?.rows ?? []),
  );
  const listRef = useRef<HTMLUListElement>(null);
  // Bumped on a refresh, a venue change and unmount: a Load more still in
  // flight belongs to an older generation and its response is dropped.
  const generation = useRef(0);

  // New props: follow them (React's "adjust state on a prop change").
  // Another venue starts over; a refresh of this one (router.refresh from
  // the header, Try again) lays its fresh rows over what Load more loaded
  // and keeps the limit.
  const [synced, setSynced] = useState({ venueId, runs, initialRun });
  if (synced.venueId !== venueId) {
    setSynced({ venueId, runs, initialRun });
    setRows(runs?.rows ?? []);
    setLimit(RUNS_FIRST_PAGE);
    setMore(hasMore(runs?.returned ?? 0, RUNS_FIRST_PAGE));
    setLoadState('idle');
    setFilter('all');
    setSelectedId(knownRun(initialRun, runs?.rows ?? []));
  } else if (synced.runs !== runs || synced.initialRun !== initialRun) {
    setSynced({ venueId, runs, initialRun });
    const merged = runs === null ? rows : mergeRuns(rows, runs.rows);
    if (synced.runs !== runs) {
      setRows(merged);
      if (runs !== null && limit === RUNS_FIRST_PAGE) {
        setMore(hasMore(runs.returned, RUNS_FIRST_PAGE));
      }
      setLoadState('idle');
    }
    if (synced.initialRun !== initialRun) {
      setSelectedId(knownRun(initialRun, merged));
    }
  }
  // Another tab took over: close the detail. The tab switch has already
  // rewritten the URL without `?run=`.
  if (!active && selectedId !== null) setSelectedId(null);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [venueId, runs],
  );

  // A `?run=` that names no loaded run highlights nothing, so it leaves the
  // URL rather than sitting there silently. Only while the URL still says it.
  useEffect(() => {
    if (initialRun === null || runs === null) return;
    if (knownRun(initialRun, runs.rows) !== null) return;
    const inUrl = new URLSearchParams(window.location.search).get('run');
    if (inUrl === initialRun) replaceUrl(venueTabHref(venueId, 'runs'));
  }, [initialRun, runs, venueId]);

  // Back on the Runs tab: the detail closed when it left, and `initialRun`
  // may not have changed (Open run on the same run twice), so the URL is
  // read again. A loaded run opens; any other `?run=` leaves the URL.
  const wasActive = useRef(active);
  useEffect(() => {
    const cameBack = active && !wasActive.current;
    wasActive.current = active;
    if (!cameBack) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('run')) return;
    const runId = knownRun(parseVenueRun(params.get('run')), rows);
    if (runId === null) {
      replaceUrl(venueTabHref(venueId, 'runs'));
      return;
    }
    setSelectedId(runId);
  }, [active, rows, venueId]);

  // `?run=` on load scrolls its row into view.
  useEffect(() => {
    if (initialRun === null) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [initialRun]);

  const close = () => {
    setSelectedId(null);
    replaceUrl(venueTabHref(venueId, 'runs'));
  };

  const select = (runId: string) => {
    if (runId === selectedId) {
      close();
      return;
    }
    setSelectedId(runId);
    replaceUrl(venueRunHref(venueId, runId));
  };

  const loadMore = async () => {
    const asked = nextLimit(limit);
    generation.current += 1;
    const mine = generation.current;
    setLoadState('loading');
    try {
      const token = await getToken();
      if (!token) throw new Error('No session token');
      const raw = await apiClient.get<unknown>(
        `/v1/admin/crawl/runs?venueId=${encodeURIComponent(venueId)}&limit=${asked}`,
        token,
      );
      if (mine !== generation.current) return;
      const page = parseRunsPage(raw);
      if (page === null) throw new Error('Unexpected runs shape');
      setRows(page.rows);
      setLimit(asked);
      setMore(hasMore(page.returned, asked));
      setLoadState('idle');
    } catch (err: unknown) {
      if (mine !== generation.current) return;
      console.error('RunsTab: could not load more runs', { venueId, err });
      setLoadState('failed');
    }
  };

  const shown = filterRuns(rows, filter);
  const notOkCount = rows.filter(isNotOk).length;
  const lastFull = lastFullRuns(rows);
  const selectedRun = active
    ? (rows.find((run) => run.id === selectedId) ?? null)
    : null;

  return (
    <div
      data-testid="venue-runs"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}
    >
      <FaultAcknowledgeControl venueId={venueId} />
      <section
        aria-label={COPY.title}
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          padding: phone ? '14px 16px' : '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            {COPY.title}
          </h2>
          <span style={{ flex: 1 }} />
          {runs !== null && rows.length > 0 && (
            <RunFilters
              filter={filter}
              notOkCount={notOkCount}
              onChange={setFilter}
            />
          )}
        </div>
        {runs === null ? (
          <CouldntLoad page={COPY.title} onRetry={() => router.refresh()} />
        ) : rows.length === 0 ? (
          // `02/all-clear`, as Overview's Latest run says it.
          <EmptyState
            icon={Check}
            title={ADMIN_COPY.venuesList.latestRun.never}
          />
        ) : (
          <>
            {shown.length === 0 ? (
              <RunsFilterEmpty
                count={rows.length}
                onShowAll={() => setFilter('all')}
              />
            ) : (
              <ul
                ref={listRef}
                data-testid="runs-list"
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  ...(phone
                    ? { display: 'flex', flexDirection: 'column' }
                    : RUNS_LIST_DESKTOP_GRID),
                }}
              >
                {shown.map((run) => (
                  <RunListRow
                    key={run.id}
                    run={run}
                    lastFullRun={lastFull.get(run.id) ?? null}
                    selected={run.id === selectedId}
                    phone={phone}
                    onSelect={() => select(run.id)}
                  />
                ))}
              </ul>
            )}
            <LoadMoreFooter
              shown={rows.length}
              step={nextLimit(limit) - limit}
              more={more}
              state={loadState}
              onLoadMore={() => void loadMore()}
              // `A3/09/load-more` draws one 1px rule. The phone's last row
              // draws it already (as the crawl batch list's last card does),
              // so the footer adds its own only when no row sits above it.
              rule={!phone || shown.length === 0}
            />
          </>
        )}
      </section>
      {selectedRun !== null && (
        <RunDetailPanel
          venueId={venueId}
          run={selectedRun}
          lastFullRun={lastFull.get(selectedRun.id) ?? null}
          phone={phone}
          onClose={close}
        />
      )}
    </div>
  );
};
