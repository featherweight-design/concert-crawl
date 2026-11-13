import type { VenueLastFullRun } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  LAST_RUNS,
  isUnchanged,
  runOutcome,
  runReasonLine,
  shortDate,
} from '@/components/admin/venues/overview/overview-rules';
import type { RunRow } from './run-data';

const COPY = ADMIN_COPY.venueRuns;

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

/**
 * Each run's last full run: the next older `success` in the list (newest
 * first). It names the date an Unchanged run kept. One pass, oldest to
 * newest; a run with none loaded behind it is absent from the map.
 */
export const lastFullRuns = (
  runs: readonly RunRow[],
): Map<string, VenueLastFullRun> => {
  const byId = new Map<string, VenueLastFullRun>();
  let previous: VenueLastFullRun | null = null;
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const run = runs[i]!;
    if (previous !== null) byId.set(run.id, previous);
    if (run.status === 'success') {
      previous = { at: run.createdAt, eventsFound: run.eventsFound };
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
