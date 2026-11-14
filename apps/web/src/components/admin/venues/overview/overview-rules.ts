import {
  FORMER_ADMIN_NAME,
  type CrawlRun,
  type CrawlStatus,
  type NeedsYouKind,
  type NeedsYouNotUsefulSnooze,
  type VenueLastFullRun,
  type VenueLatestRun,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { Kind } from '@/components/admin/primitives';
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time';

const COPY = ADMIN_COPY.venueOverview;
const RUN = ADMIN_COPY.venuesList.latestRun;

/** How many runs the Last 14 runs card draws. */
export const LAST_RUNS = 14;

/** "Nov 10", Mountain Time. */
export const shortDate = (iso: string): string =>
  formatISODate(iso, DENVER_TIME_ZONE, { month: 'short', day: 'numeric' });

/**
 * "3:02 AM", Mountain Time. Newer ICU builds put a narrow no-break space
 * (U+202F) before AM/PM; it is folded to a plain space so the time reads the
 * same on every Node and browser.
 */
export const shortTime = (iso: string): string =>
  formatISODate(iso, DENVER_TIME_ZONE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(/ /g, ' ');

/** "Nov 11 · 3:02 AM", Mountain Time (`04/venue-overview`). */
export const runWhen = (iso: string): string =>
  COPY.latestRun.when(shortDate(iso), shortTime(iso));

/** The run the Latest run card reads: the venue's, or the list's newest. */
type LatestRun = Pick<
  VenueLatestRun,
  'status' | 'reason' | 'eventsFound' | 'eventsInserted' | 'errorMessage'
>;

/**
 * A run's result chip (`A3/09/run-result-chips`, `B+/A5/14/run-chips-partial`).
 * Low and Quiet are HOLD (they need What's normal), so a low run reads OK.
 */
export type RunOutcomeKey =
  | 'success'
  | 'unchanged'
  | 'partial'
  | 'failed'
  | 'blocked'
  | 'skipped'
  | 'robots'
  | 'notRun';

/**
 * Which chip a run reads. The reason wins over the status: a 403 or 429 is
 * Blocked, any robots.txt stop is robots.txt, and the account-wide LLM refusal
 * is Not run (not a venue failure), whatever status the run was stored with.
 */
export const runOutcomeKey = (
  run: Pick<LatestRun, 'status' | 'reason'>,
): RunOutcomeKey => {
  switch (run.reason) {
    case 'blocked_http':
      return 'blocked';
    case 'robots_disallowed':
    case 'robots_unreachable':
    case 'robots_crawl_delay':
      return 'robots';
    case 'llm_account':
      return 'notRun';
    default:
      break;
  }
  if (run.status === 'success') return 'success';
  if (run.status === 'partial') return 'partial';
  if (run.status === 'failed') return 'failed';
  return run.reason === 'page_unchanged' ? 'unchanged' : 'skipped';
};

/**
 * The big outcome word: OK, Unchanged, Partial, Failed, Blocked, Skipped,
 * robots.txt or Not run, in `venuesList.latestRun`'s words.
 */
export const runOutcome = (run: Pick<LatestRun, 'status' | 'reason'>): string =>
  RUN[runOutcomeKey(run)];

/** True for the one run Re-crawl anyway is offered on. */
export const isUnchanged = (run: Pick<LatestRun, 'status' | 'reason'>) =>
  run.status === 'skipped' && run.reason === 'page_unchanged';

/**
 * The reason sentence under the outcome. Unchanged names the last full run
 * (1d ruling 8); a run that read shows says how many; anything else reads
 * the list's reason line as a sentence ("Failed: timed out."). Null when
 * there is nothing to add (a skip with no recorded reason).
 */
export const runSentence = (
  run: LatestRun,
  lastFullRun: VenueLastFullRun | null,
): string | null => {
  if (run.status === 'success' || run.status === 'partial') {
    return COPY.latestRun.found(run.eventsFound, run.eventsInserted);
  }
  if (run.reason === 'page_unchanged') {
    return lastFullRun
      ? COPY.latestRun.unchanged(
          shortDate(lastFullRun.at),
          lastFullRun.eventsFound,
        )
      : COPY.latestRun.unchangedNoFullRun;
  }
  const line = runReasonLine(run);
  return line === null ? null : COPY.latestRun.sentence(line);
};

/**
 * The list's reason line for a run that read no shows ("Failed: timed out",
 * "robots.txt: disallowed"). A failed run with no known reason reads its
 * error's first line. Null when there is nothing to add (a skip with no
 * recorded reason). Shared with the Runs tab's rows.
 */
export const runReasonLine = (
  run: Pick<LatestRun, 'status' | 'reason' | 'errorMessage'>,
): string | null => {
  switch (run.reason) {
    case 'page_unchanged':
      return RUN.unchanged;
    case 'crawl_paused':
      return RUN.withReason(RUN.skipped, RUN.reasons.crawl_paused);
    case 'robots_disallowed':
    case 'robots_unreachable':
    case 'robots_crawl_delay':
      return RUN.withReason(RUN.robots, RUN.reasons[run.reason]);
    case 'blocked_http':
      return RUN.blocked;
    case 'llm_account':
      return RUN.withReason(RUN.notRun, RUN.reasons.llm_account);
    case 'calendar_not_found':
    case 'no_events_found':
    case 'timeout':
      return RUN.withReason(RUN.failed, RUN.reasons[run.reason]);
    case 'error':
    case null:
      break;
  }
  if (run.status !== 'failed') return null;
  const first = run.errorMessage?.split('\n')[0]?.trim();
  return first ? RUN.withReason(RUN.failed, first) : null;
};

/** The five drawn bar kinds (`A3/03/last-14-runs-legend`); Low is HOLD. */
export const BAR_KINDS = [
  'found',
  'unchanged',
  'partial',
  'failed',
  'paused',
] as const;
export type BarKind = (typeof BAR_KINDS)[number];

/** A stored run: only settled runs are persisted, never `in_progress`. */
type StoredRun = Pick<CrawlRun, 'reason'> & { status: CrawlStatus };

/**
 * A run's bar. A low run draws as Shows found until What's normal lands.
 * Every skip that isn't Unchanged (paused, robots, an LLM refusal, or one
 * with no reason) is Paused or not crawled.
 */
export const barKind = (run: StoredRun): BarKind => {
  switch (run.status) {
    case 'success':
      return 'found';
    case 'partial':
      return 'partial';
    case 'failed':
      return 'failed';
    case 'skipped':
      return run.reason === 'page_unchanged' ? 'unchanged' : 'paused';
  }
};

export interface Bar {
  id: string;
  kind: BarKind;
  label: string;
}

/**
 * The newest 14 runs, oldest first, each with its "{date}: {kind}" label.
 * The API sends runs newest first.
 */
export const runBars = (
  runs: readonly (StoredRun & Pick<CrawlRun, 'id' | 'createdAt'>)[],
): Bar[] =>
  runs
    .slice(0, LAST_RUNS)
    .map((run) => {
      const kind = barKind(run);
      return {
        id: run.id,
        kind,
        label: COPY.lastRuns.bar(
          shortDate(run.createdAt),
          COPY.lastRuns.kinds[kind],
        ),
      };
    })
    .reverse();

/** The legend lists only the kinds drawn, in the legend board's order. */
export const legendKinds = (bars: readonly Bar[]): BarKind[] =>
  BAR_KINDS.filter((kind) => bars.some((bar) => bar.kind === kind));

/** A Needs you item's kind label (rule 8). */
export const NEEDS_YOU_KIND_LABEL: Record<NeedsYouKind, Kind> = {
  'show-dropped': 'show',
  'show-moved': 'show',
  'venue-failing': 'venue',
  'venue-blocked': 'venue',
  'event-low-confidence': 'event',
  artist: 'artist',
  'price-batch': 'prices',
  'price-check': 'priceCheck',
  bug: 'bug',
};

/**
 * "Off since Nov 3, by @hugh · “It’s normal for this venue”"
 * (`A3/01/warnings-off-overview-d`). A former admin has no handle to tag.
 */
export const offSinceLine = (
  snooze: Pick<
    NeedsYouNotUsefulSnooze,
    'createdAt' | 'createdByName' | 'reason'
  >,
): string => {
  const by =
    snooze.createdByName === FORMER_ADMIN_NAME
      ? snooze.createdByName
      : COPY.needsYou.handle(snooze.createdByName);
  const reason = snooze.reason?.trim() || null;
  return COPY.needsYou.offSince(shortDate(snooze.createdAt), by, reason);
};
