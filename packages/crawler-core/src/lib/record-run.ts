import { db, crawlRuns, crawlRunPages } from '@concert-crawl/db';
import type { CrawlRun, CrawlRunReason, NewCrawlRun } from '@concert-crawl/db';
import { reportFailure } from '@concert-crawl/logger';
import type { CrawlRunReason as ApiCrawlRunReason } from '@concert-crawl/types';
import type { FetchLog } from './fetch-log.js';

// The API's CrawlRunReason mirrors the DB enum by hand. This fails to compile
// when one gains or loses a value the other lacks.
type Same<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : never
  : never;
export const reasonsMatchApi: Same<CrawlRunReason, ApiCrawlRunReason> = true;

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
  fetchLog?: FetchLog,
): Promise<CrawlRun> {
  const [crawlRun] = await db.insert(crawlRuns).values(values).returning();
  if (!crawlRun) throw new Error('crawl_runs insert returned no row');

  const pages = fetchLog?.entries ?? [];
  if (pages.length > 0) {
    try {
      await db
        .insert(crawlRunPages)
        .values(pages.map((page) => ({ ...page, crawlRunId: crawlRun.id })));
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
