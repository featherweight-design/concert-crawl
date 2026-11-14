'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CouldntLoad } from '@/components/admin/primitives';
import {
  BATCH_FILTERS,
  batchesPath,
  fetchBatchPage,
  type BatchFilter,
  type BatchPage,
} from './batch-data';
import {
  BATCHES_STEP,
  appendBatches,
  crawlRunsHref,
  filterFromParam,
  notOkCountOf,
} from './batch-rules';
import { BatchesSkeleton, BatchesTable, CrawlRunsHeader } from './BatchesTable';
import {
  FilterPills,
  LoadMoreFooter,
  RunsFilterEmpty,
  type LoadMoreState,
} from './RunsList';

const COPY = ADMIN_COPY.crawlRuns;

interface Loaded {
  filter: BatchFilter;
  page: BatchPage;
}

/**
 * 1d Crawl runs, the batch list (`07/crawl-runs-desktop`; phone
 * `A3/09/runs-filters-m`). The filter lives in `?kind=`; a row links to
 * `?run=<linkKey>`, which the batch detail (PR3) will open. Pages load in the
 * browser with the admin's token, 25 at a time, older ones by `nextBefore`.
 */
export const CrawlRunsClient = () => {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = filterFromParam(searchParams?.get('kind'));

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  // Not OK's count, over the loaded All or Not OK rows: the other filters
  // can't count it, so it holds until one of those loads again.
  const [notOkCount, setNotOkCount] = useState(0);
  const countNotOk = useCallback((pageFilter: BatchFilter, page: BatchPage) => {
    const count = notOkCountOf(pageFilter, page.rows);
    if (count !== null) setNotOkCount(count);
  }, []);

  // Only the newest load may write: a slow older one must not overwrite it.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    setFailed(false);
    setLoadState('idle');
    try {
      const page = await fetchBatchPage(
        () => tokenRef.current(),
        batchesPath(filter, BATCHES_STEP, null),
      );
      if (mine !== latest.current) return;
      setLoaded({ filter, page });
      countNotOk(filter, page);
    } catch (err) {
      console.error('[admin crawl runs] list failed', err);
      if (mine === latest.current) setFailed(true);
    }
  }, [filter, countNotOk]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = loaded !== null && loaded.filter === filter ? loaded : null;

  const onLoadMore = async () => {
    if (shown === null || shown.page.nextBefore === null) return;
    // A page still loading for a new filter would append to the wrong list.
    const mine = latest.current;
    const { filter: pageFilter, page } = shown;
    setLoadState('loading');
    try {
      const next = await fetchBatchPage(
        () => tokenRef.current(),
        batchesPath(pageFilter, BATCHES_STEP, page.nextBefore),
      );
      if (mine !== latest.current) return;
      const merged: BatchPage = {
        ...next,
        rows: appendBatches(page.rows, next.rows),
      };
      setLoaded({ filter: pageFilter, page: merged });
      countNotOk(pageFilter, merged);
      setLoadState('idle');
    } catch (err) {
      console.error('[admin crawl runs] load more failed', err);
      if (mine === latest.current) setLoadState('failed');
    }
  };

  const onFilter = (next: BatchFilter) => {
    if (next !== filter) router.replace(crawlRunsHref(next), { scroll: false });
  };

  const filters = (
    <FilterPills
      label={COPY.filters.label}
      value={filter}
      onChange={onFilter}
      options={BATCH_FILTERS.map((key) =>
        key === 'not_ok'
          ? {
              key,
              label: COPY.filters[key],
              count: notOkCount,
              countLabel: COPY.filters.notOkCount(notOkCount),
            }
          : { key, label: COPY.filters[key] },
      )}
    />
  );

  const footer = (page: BatchPage) =>
    page.rows.length === 0 && !page.hasMore ? null : (
      <div style={{ padding: '0 18px 12px' }}>
        <LoadMoreFooter
          shown={page.rows.length}
          step={BATCHES_STEP}
          more={page.hasMore}
          state={loadState}
          onLoadMore={() => void onLoadMore()}
          failedLabel={COPY.loadMoreFailed}
          testId="crawl-runs-load-more"
        />
      </div>
    );

  // Nothing under the filter reads `A3/09/runs-filter-empty-d`'s line; under
  // All (never any runs) there is no drawn empty board, so it is the same
  // line with no Show all.
  const content = failed ? (
    <CouldntLoad page={COPY.title} onRetry={() => void load()} />
  ) : shown === null ? (
    <BatchesSkeleton filters={false} />
  ) : shown.page.rows.length === 0 ? (
    <>
      <RunsFilterEmpty
        message={COPY.filterEmpty[filter]}
        {...(filter !== 'all' && { onShowAll: () => onFilter('all') })}
      />
      {shown.page.hasMore && footer(shown.page)}
    </>
  ) : (
    <BatchesTable
      batches={shown.page.rows}
      filter={filter}
      footer={footer(shown.page)}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CrawlRunsHeader />
      {filters}
      {content}
    </div>
  );
};
