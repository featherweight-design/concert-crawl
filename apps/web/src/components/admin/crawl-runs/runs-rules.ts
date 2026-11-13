import type { VenueLastFullRun } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  isUnchanged,
  runOutcome,
  runReasonLine,
  runSentence,
  shortDate,
} from '@/components/admin/venues/overview/overview-rules';
import type { RunPage, RunRow } from './run-data';

const COPY = ADMIN_COPY.venueRuns;
const DETAIL = ADMIN_COPY.runDetail;

/**
 * Whether Inspect page and Compare show. Inspect is 3b part 5 (PR 5): until
 * its route lands the buttons would 404, so they stay hidden. Flip this in
 * that PR.
 */
export const INSPECT_READY = false;

/** The Inspect route (3b part 5) for one run. */
export const inspectHref = (venueId: string, runId: string): string =>
  `/admin/venues/${encodeURIComponent(venueId)}/inspect/${encodeURIComponent(runId)}`;

// ── Load more ────────────────────────────────────────────────

/** Runs per load: the first page, and each Load more. */
export const RUNS_STEP = 20;
/** The API's `limit` ceiling: there is no cursor, so this is the most shown. */
export const RUNS_CAP = 100;

/** The next `limit` to ask for: one step more, never past the cap. */
export const nextLimit = (limit: number): number =>
  Math.min(limit + RUNS_STEP, RUNS_CAP);

/**
 * Whether Load more shows. A response shorter than the limit asked for has
 * nothing behind it; at the cap the API can send no more.
 */
export const hasMore = (returned: number, asked: number): boolean =>
  asked < RUNS_CAP && returned >= asked;

// ── The filter ───────────────────────────────────────────────

export const RUN_FILTERS = ['all', 'notOk'] as const;
export type RunFilter = (typeof RUN_FILTERS)[number];

/** Not OK: anything but a run that read shows or found the page unchanged. */
export const isNotOk = (run: Pick<RunRow, 'status' | 'reason'>): boolean =>
  run.status !== 'success' && !isUnchanged(run);

export const filterRuns = <T extends Pick<RunRow, 'status' | 'reason'>>(
  runs: readonly T[],
  filter: RunFilter,
): T[] => (filter === 'all' ? [...runs] : runs.filter(isNotOk));

// ── A row ────────────────────────────────────────────────────

/** "230 s", or the dash when the run recorded none. */
export const runDuration = (ms: number | null): string =>
  ms === null ? COPY.noDuration : COPY.duration(Math.round(ms / 1000));

/** "$0.15"; "$0" for nothing spent, "<$0.01" under a cent. */
export const runCost = (usd: number | null | undefined): string => {
  if (usd === null || usd === undefined || usd <= 0) return COPY.noCost;
  if (usd < 0.005) return COPY.underACent;
  return COPY.cost(usd.toFixed(2));
};

/**
 * The last full run before this one: the next older `success` in the list
 * (newest first). It names the date an Unchanged run kept.
 */
export const lastFullRunBefore = (
  runs: readonly RunRow[],
  run: Pick<RunRow, 'id'>,
): VenueLastFullRun | null => {
  const index = runs.findIndex((row) => row.id === run.id);
  if (index < 0) return null;
  const full = runs.slice(index + 1).find((row) => row.status === 'success');
  return full ? { at: full.createdAt, eventsFound: full.eventsFound } : null;
};

/**
 * Compare's target: the previous `success` run in the loaded list, older
 * than this one. Null when none is loaded.
 */
export const compareTarget = (
  runs: readonly RunRow[],
  run: Pick<RunRow, 'id'>,
): RunRow | null => {
  const index = runs.findIndex((row) => row.id === run.id);
  if (index < 0) return null;
  return runs.slice(index + 1).find((row) => row.status === 'success') ?? null;
};

/**
 * A row's line (`04/venue-runs`): "106 shows · 2 new" for a run that read
 * shows, "Page unchanged since Nov 10" for Unchanged, otherwise the list's
 * reason line ("Failed: timed out"), or the outcome when there is none.
 * "via Haiku" is left off: no copy maps `extractionStrategyUsed` to a name.
 */
export const runLine = (
  run: RunRow,
  lastFullRun: VenueLastFullRun | null,
): string => {
  if (run.status === 'success' || run.status === 'partial') {
    return COPY.shows(run.eventsFound, run.eventsInserted);
  }
  if (isUnchanged(run)) {
    return lastFullRun
      ? COPY.unchangedSince(shortDate(lastFullRun.at))
      : runOutcome(run);
  }
  return runReasonLine(run) ?? runOutcome(run);
};

/**
 * The run detail's summary: the row's line as its title, and a sentence
 * under it only where it adds something (Unchanged says what was kept).
 */
export const runSummary = (
  run: RunRow,
  lastFullRun: VenueLastFullRun | null,
): { title: string; body: string | null } => {
  const title = runLine(run, lastFullRun);
  return {
    title,
    body: isUnchanged(run) ? runSentence(run, lastFullRun) : null,
  };
};

// ── Pages ────────────────────────────────────────────────────

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const restOf = (url: string): string => {
  const parsed = new URL(url);
  const path = parsed.pathname === '/' ? '' : parsed.pathname;
  return `${path}${parsed.search}`;
};

/**
 * A page's URL as the board shortens it: "ballarena.com/events" for the
 * first, "…/events?page=2" for a later page on the same host. A URL that
 * won't parse reads as itself.
 */
export const shortUrl = (url: string, firstUrl: string): string => {
  const host = hostOf(url);
  if (host === null) return url;
  const rest = restOf(url);
  if (url !== firstUrl && host === hostOf(firstUrl) && rest !== '') {
    return `…${rest}`;
  }
  return `${host}${rest}`;
};

const KB = 1024;
const MB = KB * 1024;

/** "1.9 MB", "640 KB", "512 B". */
export const pageSize = (bytes: number): string => {
  if (bytes >= MB) return DETAIL.megabytes((bytes / MB).toFixed(1));
  if (bytes >= KB) return DETAIL.kilobytes(Math.round(bytes / KB));
  return DETAIL.bytes(bytes);
};

/** A page that didn't come back 2xx: an error status, or no response. */
export const isFailedPage = (page: Pick<RunPage, 'httpStatus'>): boolean =>
  page.httpStatus === null || page.httpStatus < 200 || page.httpStatus >= 300;

/** The first failed page, the one the list marks; -1 when none failed. */
export const firstFailedPage = (
  pages: readonly Pick<RunPage, 'httpStatus'>[],
): number => pages.findIndex(isFailedPage);

/**
 * "200 · 1.9 MB". No per-page time is stored, so the board's third part is
 * left off.
 */
export const pageLine = (page: Pick<RunPage, 'httpStatus' | 'bytes'>): string =>
  DETAIL.pageLine([
    page.httpStatus === null ? DETAIL.noResponse : String(page.httpStatus),
    ...(page.bytes === null ? [] : [pageSize(page.bytes)]),
  ]);
