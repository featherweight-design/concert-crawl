import {
  crawlBatchResult,
  finalBatchCounts,
  isNotOkBatch,
  scheduledCrawlAt,
  type CrawlBatchResultInput,
  type CrawlBatchResultKey,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  shortDate,
  shortTime,
} from '@/components/admin/venues/overview/overview-rules';
import { BATCH_FILTERS, type BatchFilter, type BatchRow } from './batch-data';
import { runCost } from './runs-rules';

const COPY = ADMIN_COPY.crawlRuns;

/** Batches per page and per Load more (`A3/09/load-more`). */
export const BATCHES_STEP = 25;

// ── The filter and the URL ───────────────────────────────────

const isBatchFilter = (value: string): value is BatchFilter =>
  BATCH_FILTERS.some((key) => key === value);

/** `?kind=`: one of the API's filters, else All. */
export const filterFromParam = (raw: string | null | undefined): BatchFilter =>
  raw !== null && raw !== undefined && isBatchFilter(raw) ? raw : 'all';

/**
 * The list's URL: `?kind=` unless All, and `?run=<linkKey>` for a row the
 * detail (PR3) opens. The linkKey carries no Clerk id.
 */
export const crawlRunsHref = (
  filter: BatchFilter,
  run: string | null = null,
): string => {
  const query = new URLSearchParams();
  if (filter !== 'all') query.set('kind', filter);
  if (run !== null) query.set('run', run);
  const search = query.toString();
  return search === '' ? '/admin/crawl' : `/admin/crawl?${search}`;
};

/**
 * The API's `not_ok` filter applies the same shared rule (`isNotOkBatch`), so
 * this is only a guard: while a web deploy runs ahead of the API's, an older
 * API can still send green Done batches under Not OK.
 */
export const keepForFilter = <Row extends CrawlBatchResultInput>(
  filter: BatchFilter,
  rows: readonly Row[],
): Row[] => (filter === 'not_ok' ? rows.filter(isNotOkBatch) : [...rows]);

/**
 * Not OK's count beside the filter, over the loaded rows: all of them under
 * Not OK, the Not OK ones under All. Null under Nightly and By hand, which
 * can't count it, so the last count holds.
 */
export const notOkCountOf = (
  filter: BatchFilter,
  rows: readonly CrawlBatchResultInput[],
): number | null => {
  if (filter === 'not_ok') return rows.length;
  if (filter === 'all') return rows.filter(isNotOkBatch).length;
  return null;
};

// ── Paging ───────────────────────────────────────────────────

/**
 * A Load more page laid under the loaded rows. A batch already loaded (a
 * by-hand burst still growing at the edge) keeps its first place.
 */
export const appendBatches = (
  loaded: readonly BatchRow[],
  next: readonly BatchRow[],
): BatchRow[] => {
  const seen = new Set(loaded.map((batch) => batch.key));
  return [...loaded, ...next.filter((batch) => !seen.has(batch.key))];
};

// ── A row ────────────────────────────────────────────────────

/**
 * WHAT: "Nightly"; by hand, "Crawl all", "Re-crawl · Ball Arena" or
 * "Re-crawl · 3 venues", then "by @hugh" (ruling 23) when the actor has a
 * handle.
 */
export const batchLabel = (batch: BatchRow): string => {
  if (batch.kind === 'nightly') return COPY.nightly;
  const what = batch.crawlAll
    ? COPY.crawlAll
    : batch.venueName !== null
      ? COPY.recrawlVenue(batch.venueName)
      : COPY.recrawlVenues(batch.venueCount);
  return batch.actorHandle === null
    ? what
    : COPY.parts([what, COPY.by(batch.actorHandle)]);
};

/**
 * RESULT, by the shared rule (`crawlBatchResult` in @concert-crawl/types, the
 * one the API's Not OK filter reads), with the chip's colour and label.
 */
export const batchStatus = (
  batch: CrawlBatchResultInput,
): { key: CrawlBatchResultKey; tone: string; label: string } => {
  const { key, tone } = crawlBatchResult(batch);
  return { key, tone: `var(--${tone})`, label: COPY.status[key] };
};

/** "14 OK · 4 unchanged · 1 failed · 1 blocked", leaving out the zeros. */
const countParts = (counts: BatchRow['counts']): string[] => {
  const other = Math.max(0, counts.notOk - counts.failed - counts.blocked);
  return [
    counts.ok > 0 ? COPY.ok(counts.ok) : null,
    counts.unchanged > 0 ? COPY.unchanged(counts.unchanged) : null,
    counts.failed > 0 ? COPY.failed(counts.failed) : null,
    counts.blocked > 0 ? COPY.blocked(counts.blocked) : null,
    other > 0 ? COPY.otherNotOk(other) : null,
  ].filter((part): part is string => part !== null);
};

/**
 * SUMMARY. Didn't start says nothing more (row 1: the cause is unknown).
 * Running counts what's done so far ("8 of 19 so far · 7 OK"). One venue that
 * read its page names the shows ("1 venue · 106 shows"). Otherwise the venues,
 * skipped ones left out (row 5), and the outcome counts. A retried night ends
 * "retried at 4:10 AM" (ruling 18).
 */
export const batchSummary = (batch: BatchRow): string => {
  if (batch.didntStart) return '';
  const counts = finalBatchCounts(batch);
  const parts =
    batch.pending > 0
      ? [COPY.soFar(counts.total, batch.venueCount), ...countParts(counts)]
      : batch.venueCount === 1 && counts.ok > 0
        ? [COPY.venues(1), COPY.shows(batch.eventsFound)]
        : [
            COPY.venues(Math.max(0, batch.venueCount - counts.skipped)),
            ...countParts(counts),
          ];
  if (batch.retry !== null)
    parts.push(COPY.retriedAt(shortTime(batch.retry.at)));
  return COPY.parts(parts);
};

/**
 * WHEN: the first run's date and time, Mountain Time. A night that didn't
 * start has none, so it reads the time the daily cron was due that night
 * (`scheduledCrawlAt`, the schedule behind the API's nextDailyCrawlAt).
 */
export const batchWhen = (
  batch: Pick<BatchRow, 'startedAt' | 'night'>,
): { date: string; time: string } => {
  if (batch.startedAt !== null) {
    return {
      date: shortDate(batch.startedAt),
      time: shortTime(batch.startedAt),
    };
  }
  if (batch.night === null) return { date: COPY.noTime, time: COPY.noTime };
  // The time the cron was due that night: 2:07 AM MST, 3:07 AM MDT.
  const due = scheduledCrawlAt(batch.night);
  return { date: shortDate(due), time: shortTime(due) };
};

/**
 * TIME: first run to last, in whole minutes ("18 min", never under 1). The
 * dash for a night that didn't start and for a batch still running.
 */
export const batchTime = (
  batch: Pick<BatchRow, 'startedAt' | 'endedAt' | 'pending' | 'didntStart'>,
): string => {
  if (
    batch.didntStart ||
    batch.pending > 0 ||
    batch.startedAt === null ||
    batch.endedAt === null
  ) {
    return COPY.noTime;
  }
  const ms = Date.parse(batch.endedAt) - Date.parse(batch.startedAt);
  if (!Number.isFinite(ms) || ms < 0) return COPY.noTime;
  return COPY.minutes(Math.max(1, Math.round(ms / 60_000)));
};

/** COST: "$0.71", "$0" for nothing spent, "<$0.01" under a cent. */
export const batchCost = (batch: Pick<BatchRow, 'costUsd'>): string =>
  runCost(batch.costUsd);

/** Every row opens its detail except a night that didn't start (row 14). */
export const isClickableBatch = (batch: Pick<BatchRow, 'didntStart'>) =>
  !batch.didntStart;
