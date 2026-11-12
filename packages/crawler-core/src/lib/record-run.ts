import { db, crawlRuns, crawlRunPages } from '@concert-crawl/db';
import type { CrawlRun, CrawlRunReason, NewCrawlRun } from '@concert-crawl/db';
import { reportFailure } from '@concert-crawl/logger';
import type { FetchLogEntry } from './fetch-log.js';

/**
 * A run row to insert. The type makes `reason` required for every status but
 * success, so a new crawl path cannot record a skip or a failure without
 * saying why.
 */
export type CrawlRunValues = Omit<NewCrawlRun, 'status' | 'reason'> &
  (
    | { status: 'success'; reason?: null }
    | { status: 'failed' | 'partial' | 'skipped'; reason: CrawlRunReason }
  );

/**
 * The one writer of `crawl_runs`. Inserts the run, then its fetched-page
 * records. The page rows are metadata: a failure writing them is reported and
 * never fails the crawl.
 */
export async function insertCrawlRun(
  values: CrawlRunValues,
  fetchLog?: { readonly entries: readonly FetchLogEntry[] },
): Promise<CrawlRun> {
  const [crawlRun] = await db.insert(crawlRuns).values(values).returning();
  if (!crawlRun) throw new Error('crawl_runs insert returned no row');

  const pages = fetchLog?.entries ?? [];
  // Chunked, so a log is flushed in statements that stay far under Postgres's
  // 65,535 bind-parameter limit however large it ever grows. A chunk that
  // fails loses only its own rows.
  for (let start = 0; start < pages.length; start += PAGE_INSERT_CHUNK) {
    try {
      await db
        .insert(crawlRunPages)
        .values(
          pages
            .slice(start, start + PAGE_INSERT_CHUNK)
            .map((page) => ({ ...page, crawlRunId: crawlRun.id })),
        );
    } catch (err) {
      reportFailure({
        event: 'crawl.page_log_error',
        severity: 'warn',
        venueId: crawlRun.venueId,
        error: String(err),
      });
    }
  }
  return crawlRun;
}

// Nine columns a row: 500 rows is 4,500 parameters.
export const PAGE_INSERT_CHUNK = 500;
