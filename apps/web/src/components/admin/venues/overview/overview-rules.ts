import type {
  CrawlRun,
  NeedsYouKind,
  NeedsYouNotUsefulSnooze,
  VenueLastFullRun,
  VenueLatestRun,
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

/** "Nov 11 · 3:02 AM", Mountain Time (`04/venue-overview`). */
export const runWhen = (iso: string): string =>
  COPY.latestRun.when(
    shortDate(iso),
    formatISODate(iso, DENVER_TIME_ZONE, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  );

/** The run the Latest run card reads: the venue's, or the list's newest. */
type LatestRun = Pick<
  VenueLatestRun,
  'status' | 'reason' | 'eventsFound' | 'eventsInserted' | 'errorMessage'
>;

/**
 * The big outcome word (`run-result-chips`): OK, Unchanged, Partial, Failed or
 * Skipped, in `venuesList.latestRun`'s words. Low is HOLD (it needs What's
 * normal), so a low run reads OK.
 */
export const runOutcome = (
  run: Pick<LatestRun, 'status' | 'reason'>,
): string => {
  if (run.status === 'success') return RUN.success;
  if (run.status === 'partial') return RUN.partial;
  if (run.status === 'failed') return RUN.failed;
  return run.reason === 'page_unchanged' ? RUN.unchanged : RUN.skipped;
};

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
  const say = COPY.latestRun.sentence;
  switch (run.reason) {
    case 'page_unchanged':
      return lastFullRun
        ? COPY.latestRun.unchanged(
            shortDate(lastFullRun.at),
            lastFullRun.eventsFound,
          )
        : COPY.latestRun.unchangedNoFullRun;
    case 'crawl_paused':
      return say(RUN.withReason(RUN.skipped, RUN.reasons.crawl_paused));
    case 'robots_disallowed':
    case 'robots_unreachable':
    case 'robots_crawl_delay':
      return say(RUN.withReason(RUN.robots, RUN.reasons[run.reason]));
    case 'blocked_http':
      return say(RUN.blocked);
    case 'llm_account':
      return say(RUN.withReason(RUN.notRun, RUN.reasons.llm_account));
    case 'calendar_not_found':
    case 'no_events_found':
    case 'timeout':
      return say(RUN.withReason(RUN.failed, RUN.reasons[run.reason]));
    case 'error':
    case null:
      break;
  }
  if (run.status !== 'failed') return null;
  const first = run.errorMessage?.split('\n')[0]?.trim();
  return first ? say(RUN.withReason(RUN.failed, first)) : null;
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

/**
 * A run's bar. A low run draws as Shows found until What's normal lands.
 * Every skip that isn't Unchanged (paused, robots, an LLM refusal, or one
 * with no reason) is Paused or not crawled. Null for a run still going.
 */
export const barKind = (
  run: Pick<CrawlRun, 'status' | 'reason'>,
): BarKind | null => {
  switch (run.status) {
    case 'success':
      return 'found';
    case 'partial':
      return 'partial';
    case 'failed':
      return 'failed';
    case 'skipped':
      return run.reason === 'page_unchanged' ? 'unchanged' : 'paused';
    case 'in_progress':
      return null;
  }
};

export interface Bar {
  id: string;
  kind: BarKind;
  label: string;
}

/**
 * The newest 14 settled runs, oldest first, each with its "{date}: {kind}"
 * label. The API sends runs newest first.
 */
export const runBars = (
  runs: readonly Pick<CrawlRun, 'id' | 'status' | 'reason' | 'createdAt'>[],
): Bar[] => {
  const bars: Bar[] = [];
  for (const run of runs) {
    const kind = barKind(run);
    if (kind === null) continue;
    bars.push({
      id: run.id,
      kind,
      label: COPY.lastRuns.bar(
        shortDate(run.createdAt),
        COPY.lastRuns.kinds[kind],
      ),
    });
    if (bars.length === LAST_RUNS) break;
  }
  return bars.reverse();
};

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

/** What the API names an admin who has no handle. */
export const FORMER_ADMIN = 'a former admin';

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
    snooze.createdByName === FORMER_ADMIN
      ? snooze.createdByName
      : COPY.needsYou.handle(snooze.createdByName);
  const reason = snooze.reason?.trim() || null;
  return COPY.needsYou.offSince(shortDate(snooze.createdAt), by, reason);
};
