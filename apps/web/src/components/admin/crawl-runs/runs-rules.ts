import type { VenueLastFullRun } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  LAST_RUNS,
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

/** Runs per Load more. */
export const RUNS_STEP = 20;
/**
 * The page's one runs fetch: Overview's last 14 and the Runs tab's first
 * page. The page asks for it and the Runs tab counts from it.
 */
export const RUNS_FIRST_PAGE = Math.max(LAST_RUNS, RUNS_STEP);
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

/** A last full run, with its id: Compare opens Inspect on it. */
export type LastFullRun = VenueLastFullRun & { id: string };

/**
 * Each run's last full run: the next older `success` in the list (newest
 * first). It names the date an Unchanged run kept, and is the run Compare
 * targets. One pass, oldest to newest; a run with none loaded behind it is
 * absent from the map.
 */
export const lastFullRuns = (
  runs: readonly RunRow[],
): Map<string, LastFullRun> => {
  const byId = new Map<string, LastFullRun>();
  let previous: LastFullRun | null = null;
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const run = runs[i]!;
    if (previous !== null) byId.set(run.id, previous);
    if (run.status === 'success') {
      previous = {
        id: run.id,
        at: run.createdAt,
        eventsFound: run.eventsFound,
      };
    }
  }
  return byId;
};

/**
 * Fresh rows from a refresh laid over the loaded list: a fresh row replaces
 * the loaded one with its id, the loaded rows past the fresh page stay, and
 * the whole reads newest first.
 */
export const mergeRuns = (
  loaded: readonly RunRow[],
  fresh: readonly RunRow[],
): RunRow[] => {
  const freshIds = new Set(fresh.map((run) => run.id));
  return [...fresh, ...loaded.filter((run) => !freshIds.has(run.id))].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt),
  );
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
): { title: string; body: string | null } => ({
  title: runLine(run, lastFullRun),
  body: isUnchanged(run) ? runSentence(run, lastFullRun) : null,
});

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

/**
 * A page that failed: an error status (4xx, 5xx) or no response at all.
 * 2xx and 3xx (a redirect, a 304 Not Modified) are not failures.
 */
export const isFailedPage = (page: Pick<RunPage, 'httpStatus'>): boolean =>
  page.httpStatus === null || page.httpStatus >= 400;

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
