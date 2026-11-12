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

// About a dozen columns a row: 500 rows is far under 65,535 parameters.
export const PAGE_INSERT_CHUNK = 500;

// Stored bodies can be large, so a chunk also stops once its bodies reach this
// many gzipped bytes (a single page over it still goes alone).
export const PAGE_INSERT_BODY_BYTES = 4 * 1024 * 1024;

const chunkPages = (pages: readonly FetchLogEntry[]): FetchLogEntry[][] => {
  const chunks: FetchLogEntry[][] = [];
  let current: FetchLogEntry[] = [];
  let bodyBytes = 0;
  for (const page of pages) {
    const size = page.htmlGz?.length ?? 0;
    if (
      current.length > 0 &&
      (current.length >= PAGE_INSERT_CHUNK ||
        bodyBytes + size > PAGE_INSERT_BODY_BYTES)
    ) {
      chunks.push(current);
      current = [];
      bodyBytes = 0;
    }
    current.push(page);
    bodyBytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

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
  // 65,535 bind-parameter limit however large it ever grows, and under a byte
  // budget when stored bodies ride along. A chunk that fails is retried once
  // without its bodies, so a body problem costs the bodies and not the page
  // metadata; a chunk that still fails loses only its own rows.
  for (const chunk of chunkPages(pages)) {
    const rows = chunk.map((page) => ({ ...page, crawlRunId: crawlRun.id }));
    try {
      await db.insert(crawlRunPages).values(rows);
    } catch (err) {
      reportFailure({
        event: 'crawl.page_log_error',
        severity: 'warn',
        venueId: crawlRun.venueId,
        error: String(err),
      });
      if (!rows.some((row) => row.htmlGz !== null)) continue;
      try {
        await db.insert(crawlRunPages).values(
          rows.map((row) => ({
            ...row,
            htmlGz: null,
            bodyExpiresAt: null,
          })),
        );
      } catch (retryErr) {
        reportFailure({
          event: 'crawl.page_log_error',
          severity: 'warn',
          venueId: crawlRun.venueId,
          error: String(retryErr),
        });
      }
    }
  }
  return crawlRun;
}
