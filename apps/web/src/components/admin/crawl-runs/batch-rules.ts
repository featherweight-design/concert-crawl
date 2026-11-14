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
 * Not OK (addendum-3 row 4), as the API's `not_ok` filter reads it: a batch
 * with any amber or red run, or a night that didn't start.
 */
export const isNotOkBatch = (
  batch: Pick<BatchRow, 'counts' | 'didntStart'>,
): boolean => batch.counts.notOk > 0 || batch.didntStart;

/**
 * Not OK's count beside the filter, over the loaded rows: all of them under
 * Not OK, the Not OK ones under All. Null under Nightly and By hand, which
 * can't count it, so the last count holds.
 */
export const notOkCountOf = (
  filter: BatchFilter,
  rows: readonly Pick<BatchRow, 'counts' | 'didntStart'>[],
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

export type BatchStatusKey = 'running' | 'didntStart' | 'failed' | 'done';

/**
 * RESULT. Didn't start (danger); Running (signal) while triggers are still
 * queued; Failed (danger, row 24) when no run read its page; else Done.
 * Done is amber only on a Blocked run (ruling: Low and Quiet wait for What's
 * normal); failures alone stay green, since they reach Needs you (row 3).
 */
export const batchStatus = (
  batch: Pick<BatchRow, 'didntStart' | 'pending' | 'counts'>,
): { key: BatchStatusKey; tone: string; label: string } => {
  if (batch.didntStart) {
    return {
      key: 'didntStart',
      tone: 'var(--danger)',
      label: COPY.status.didntStart,
    };
  }
  if (batch.pending > 0) {
    return {
      key: 'running',
      tone: 'var(--signal)',
      label: COPY.status.running,
    };
  }
  const { ok, unchanged, notOk } = batch.counts;
  // The Failed rule (orchestrator ruling, 2026-11-14): a batch is Failed when
  // no run in it read its page, i.e. no OK and no Unchanged run, and at least
  // one Not OK run. One success or one Unchanged makes it Done.
  if (ok === 0 && unchanged === 0 && notOk > 0) {
    return { key: 'failed', tone: 'var(--danger)', label: COPY.status.failed };
  }
  return {
    key: 'done',
    tone: batch.counts.blocked > 0 ? 'var(--warning)' : 'var(--success)',
    label: COPY.status.done,
  };
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
  const { counts } = batch;
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
 * start has none, so it reads its night and the schedule's 3:00 AM.
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
  // Noon UTC is early morning in Denver: the night's own date.
  const date =
    batch.night === null ? COPY.noTime : shortDate(`${batch.night}T12:00:00Z`);
  return { date, time: COPY.scheduledTime };
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
