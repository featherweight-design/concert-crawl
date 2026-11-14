'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CouldntLoad, useIsPhone } from '@/components/admin/primitives';
import {
  BATCH_FILTERS,
  batchesPath,
  fetchBatchPage,
  fetchNextCrawlAt,
  type BatchFilter,
  type BatchPage,
} from './batch-data';
import {
  BATCHES_STEP,
  appendBatches,
  crawlRunsHref,
  filterFromParam,
  keepForFilter,
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
  const isPhone = useIsPhone();
  const filter = filterFromParam(searchParams?.get('kind'));

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  // Not OK's count, over the loaded All or Not OK rows: the other filters
  // can't count it, so it holds until one of those loads again.
  const [notOkCount, setNotOkCount] = useState(0);
  // The next nightly (the API's nextDailyCrawlAt); null hides the line.
  const [nextCrawlAt, setNextCrawlAt] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchNextCrawlAt(() => tokenRef.current())
      .then((at) => {
        if (live) setNextCrawlAt(at);
      })
      .catch((err: unknown) => {
        // The line is left off; the list doesn't depend on it.
        console.warn('[admin crawl runs] next nightly failed', err);
      });
    return () => {
      live = false;
    };
  }, []);

  /** A page as the list holds it: under Not OK, only the chip's Not OK. */
  const accept = useCallback(
    (pageFilter: BatchFilter, page: BatchPage, rows = page.rows) => {
      const kept: BatchPage = {
        ...page,
        rows: keepForFilter(pageFilter, rows),
      };
      setLoaded({ filter: pageFilter, page: kept });
      const count = notOkCountOf(pageFilter, kept.rows);
      if (count !== null) setNotOkCount(count);
    },
    [],
  );

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
      accept(filter, page);
    } catch (err) {
      console.error('[admin crawl runs] list failed', err);
      if (mine === latest.current) setFailed(true);
    }
  }, [filter, accept]);

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
      accept(pageFilter, next, appendBatches(page.rows, next.rows));
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
      segmented={isPhone}
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

  // `A3/09/load-more`: the divider runs edge to edge, the row 12px 18px in
  // the desktop card; the phone list has no card, so no side inset.
  const footer = (page: BatchPage) => (
    <LoadMoreFooter
      shown={page.rows.length}
      step={BATCHES_STEP}
      more={page.hasMore}
      state={loadState}
      onLoadMore={() => void onLoadMore()}
      failedLabel={COPY.loadMoreFailed}
      testId="crawl-runs-load-more"
      padding={isPhone ? '12px 0' : '12px 18px'}
    />
  );

  const header = <CrawlRunsHeader nextCrawlAt={nextCrawlAt} />;
  const gap = isPhone ? 12 : 16;

  // The first load is `A3/09/loading-runs-d` whole: blank pill bars too.
  if (loaded === null && !failed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {header}
        <BatchesSkeleton />
      </div>
    );
  }

  // Nothing matched and nothing older is left: `A3/09/runs-filter-empty-d`'s
  // line. Under All (never any runs) no empty board is drawn, so it is the
  // same line with no Show all. While older pages remain, the table stays
  // with Load more, since an older page may match.
  const content = failed ? (
    <CouldntLoad page={COPY.title} onRetry={() => void load()} />
  ) : shown === null ? (
    <BatchesSkeleton filters={false} />
  ) : shown.page.rows.length === 0 && !shown.page.hasMore ? (
    <RunsFilterEmpty
      message={COPY.filterEmpty[filter]}
      {...(filter !== 'all' && { onShowAll: () => onFilter('all') })}
    />
  ) : (
    <BatchesTable
      batches={shown.page.rows}
      filter={filter}
      phone={isPhone}
      footer={footer(shown.page)}
    />
  );

  // The phone board: 12 from the header to Crawl all and on to the filter,
  // 8 from the filter to the list (`A3/09/runs-filters-m`).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {header}
      {filters}
      <div style={isPhone ? { marginTop: -4 } : undefined}>{content}</div>
    </div>
  );
};
