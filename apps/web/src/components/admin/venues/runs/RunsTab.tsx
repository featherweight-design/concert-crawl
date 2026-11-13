'use client';

import { useState } from 'react';
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
import { RunDetailPanel } from '@/components/admin/crawl-runs/RunDetailPanel';
import {
  LoadMoreFooter,
  RunFilters,
  RunListRow,
  RunsFilterEmpty,
  type LoadMoreState,
} from '@/components/admin/crawl-runs/RunsList';
import {
  parseRunRows,
  type RunRow,
} from '@/components/admin/crawl-runs/run-data';
import {
  RUNS_STEP,
  filterRuns,
  hasMore,
  isNotOk,
  lastFullRunBefore,
  nextLimit,
  type RunFilter,
} from '@/components/admin/crawl-runs/runs-rules';
import { apiClient } from '@/lib/api';
import { venueTabHref } from '@/lib/admin/venue-tabs';

const COPY = ADMIN_COPY.venueRuns;

/** `?tab=runs&run=<id>`: the URL while a run's detail is open. */
export const venueRunHref = (venueId: string, runId: string): string =>
  `${venueTabHref(venueId, 'runs')}&run=${encodeURIComponent(runId)}`;

/**
 * The venue page's Runs tab (3b part 4, `04/venue-runs`; phone
 * `04/venue-runs-mobile`). Fault acknowledgement sits on top (ruling a), then
 * the Runs card: All and Not OK, the rows, and Load more. A row opens its
 * detail (`RunDetailPanel`) and puts `?run=` in the URL; `?run=` on load
 * opens it.
 *
 * The first page comes from the server; Load more re-asks the API with a
 * bigger `limit` (there is no cursor), up to its cap of 100.
 */
export const RunsTab = ({
  venueId,
  runs,
  initialRun,
}: {
  venueId: string;
  /** The first page, newest first; null when that fetch failed. */
  runs: RunRow[] | null;
  /** The run `?run=` named, opened on load. */
  initialRun: string | null;
}) => {
  const phone = useIsPhone();
  const router = useRouter();
  const { getToken } = useAuth();

  const [rows, setRows] = useState<RunRow[]>(runs ?? []);
  const [limit, setLimit] = useState(RUNS_STEP);
  const [more, setMore] = useState(hasMore(runs?.length ?? 0, RUNS_STEP));
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  const [filter, setFilter] = useState<RunFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialRun);

  // A refresh (Try again) or a navigation to another `?run=` re-renders the
  // page with new props; follow them (adjusting state during render).
  const [runsFromServer, setRunsFromServer] = useState(runs);
  if (runsFromServer !== runs) {
    setRunsFromServer(runs);
    setRows(runs ?? []);
    setLimit(RUNS_STEP);
    setMore(hasMore(runs?.length ?? 0, RUNS_STEP));
    setLoadState('idle');
  }
  const [runFromUrl, setRunFromUrl] = useState(initialRun);
  if (runFromUrl !== initialRun) {
    setRunFromUrl(initialRun);
    setSelectedId(initialRun);
  }

  const select = (runId: string) => {
    setSelectedId(runId);
    window.history.replaceState(
      window.history.state,
      '',
      venueRunHref(venueId, runId),
    );
  };
  const close = () => {
    setSelectedId(null);
    window.history.replaceState(
      window.history.state,
      '',
      venueTabHref(venueId, 'runs'),
    );
  };

  const loadMore = async () => {
    const asked = nextLimit(limit);
    setLoadState('loading');
    try {
      const token = await getToken();
      if (!token) throw new Error('No session token');
      const raw = await apiClient.get<unknown>(
        `/v1/admin/crawl/runs?venueId=${encodeURIComponent(venueId)}&limit=${asked}`,
        token,
      );
      const parsed = parseRunRows(raw);
      if (parsed === null) throw new Error('Unexpected runs shape');
      setRows(parsed);
      setLimit(asked);
      setMore(hasMore(parsed.length, asked));
      setLoadState('idle');
    } catch (err: unknown) {
      console.error('RunsTab: could not load more runs', { venueId, err });
      setLoadState('failed');
    }
  };

  const selected = rows.find((run) => run.id === selectedId) ?? null;
  const shown = filterRuns(rows, filter);
  const notOkCount = rows.filter(isNotOk).length;

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
                data-testid="runs-list"
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: phone ? 0 : 4,
                }}
              >
                {shown.map((run) => (
                  <RunListRow
                    key={run.id}
                    run={run}
                    lastFullRun={lastFullRunBefore(rows, run)}
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
            />
          </>
        )}
      </section>
      {selected !== null && (
        <RunDetailPanel
          venueId={venueId}
          run={selected}
          runs={rows}
          phone={phone}
          onClose={close}
        />
      )}
    </div>
  );
};
