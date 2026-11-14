// A crawl batch's RESULT and whether it is Not OK: one pure rule, shared so
// the API's `?kind=not_ok` filter and the web's RESULT chip and Not OK count
// can never disagree about a batch (a green Done with a failed run once came
// back under Not OK and was dropped by the web, leaving sparse pages).

import type { CrawlBatch, CrawlBatchCounts } from './index.js';

/** What the RESULT and the Not OK rule read off a batch. */
export type CrawlBatchResultInput = Pick<
  CrawlBatch,
  'didntStart' | 'pending' | 'counts' | 'retry' | 'venueCount'
>;

export type CrawlBatchResultKey = 'running' | 'didntStart' | 'failed' | 'done';

/** The chip's tone, a design token name: the web draws it as `var(--<tone>)`. */
export type CrawlBatchResultTone = 'danger' | 'signal' | 'warning' | 'success';

export interface CrawlBatchResult {
  key: CrawlBatchResultKey;
  tone: CrawlBatchResultTone;
}

/**
 * A batch's counts by venue, each venue's last result. Without a retry that
 * is the run counts. A retried night's counts hold both waves, so a venue
 * that failed at 3:00 and read OK on the retry is in both "OK" and "failed".
 * The API sends the retry's counts but not which venues it re-ran, so:
 *   - Not OK, failed and blocked are the retry's: what's still wrong after it.
 *   - Skipped is the larger of the two waves' (a paused venue skips in each).
 *   - Unchanged is both waves', capped so the counts fit the venues.
 *   - OK is the rest of the venues, so the parts always add up to them.
 */
export const finalBatchCounts = (
  batch: Pick<CrawlBatch, 'counts' | 'retry' | 'venueCount'>,
): CrawlBatchCounts => {
  const { counts, retry } = batch;
  if (retry === null) return counts;
  const again = retry.counts;
  const skipped = Math.max(counts.skipped - again.skipped, again.skipped);
  const crawled = Math.max(0, batch.venueCount - skipped);
  const notOk = Math.min(again.notOk, crawled);
  const unchanged = Math.min(counts.unchanged, crawled - notOk);
  return {
    ok: crawled - notOk - unchanged,
    notOk,
    unchanged,
    skipped,
    total: crawled + skipped,
    failed: Math.min(again.failed, notOk),
    blocked: Math.min(again.blocked, notOk),
  };
};

/**
 * RESULT. Didn't start (danger); Running (signal) while triggers are still
 * queued; Failed (danger, row 24) when no run read its page; else Done.
 * Done is amber only on a Blocked run (ruling: Low and Quiet wait for What's
 * normal); failures alone stay green, since they reach Needs you (row 3).
 * A retried night is read by its final counts.
 */
export const crawlBatchResult = (
  batch: CrawlBatchResultInput,
): CrawlBatchResult => {
  if (batch.didntStart) return { key: 'didntStart', tone: 'danger' };
  if (batch.pending > 0) return { key: 'running', tone: 'signal' };
  const { ok, unchanged, notOk, blocked } = finalBatchCounts(batch);
  // The Failed rule (orchestrator ruling, 2026-11-14): a batch is Failed when
  // no run in it read its page, i.e. no OK and no Unchanged run, and at least
  // one Not OK run. One success or one Unchanged makes it Done.
  if (ok === 0 && unchanged === 0 && notOk > 0) {
    return { key: 'failed', tone: 'danger' };
  }
  return { key: 'done', tone: blocked > 0 ? 'warning' : 'success' };
};

/**
 * Not OK follows the RESULT chip, not the run counts: an amber Done, Failed
 * and Didn't start are Not OK; a green Done is not, whatever its failed count
 * (`07/crawl-runs-desktop`: two green "1 failed" nights, and "Not OK 2").
 * Running isn't either: it hasn't settled.
 */
export const isNotOkBatch = (batch: CrawlBatchResultInput): boolean => {
  const { key, tone } = crawlBatchResult(batch);
  return key === 'done' ? tone !== 'success' : key !== 'running';
};
