import type { VenueLatestRun, VenueWithEventCount } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { deriveVenueStatusChips } from '@/lib/admin/venue-status';
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time';

const COPY = ADMIN_COPY.venuesList;

/**
 * Filter chips that ship now. "Needs a look" counts venues with a Needs you
 * dot (ruling 17), and the dot waits on 2a (ruling 18), so both are held.
 * Drafts wait on 3e, and "robots.txt changed" on its storage.
 */
export const VENUE_FILTERS = ['all', 'paused', 'hidden', 'disallowed'] as const;
export type VenueFilter = (typeof VENUE_FILTERS)[number];

/** OK rows shown before the rest fold into "{N} more, all OK" (ruling 21). */
export const VISIBLE_ROWS = 10;

/**
 * A row as `GET /v1/admin/venues` sends it since #242, which leaves taken-down
 * venues out and adds the latest run. `VenueWithEventCount` in
 * packages/types doesn't carry `latestRun` yet, so the list names it here.
 */
export interface VenueListRow extends VenueWithEventCount {
  latestRun: VenueLatestRun | null;
}

const RUN = COPY.latestRun;

/** Today's runs read as a time ("3:04 AM"), older ones as a date ("Nov 10"). */
const runWhen = (iso: string, now: Date): string => {
  const day = (date: Date) =>
    formatISODate(date.toISOString(), DENVER_TIME_ZONE, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  const at = new Date(iso);
  return day(at) === day(now)
    ? formatISODate(iso, DENVER_TIME_ZONE, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : formatISODate(iso, DENVER_TIME_ZONE, { month: 'short', day: 'numeric' });
};

const joined = (...parts: Array<string | null>): string =>
  parts.filter((part): part is string => part !== null).join(' · ');

/** A failed run without a known reason reads its error's first line. */
const errorLine = (run: VenueLatestRun): string => {
  const first = run.errorMessage?.split('\n')[0]?.trim();
  return first ? RUN.withReason(RUN.failed, first) : RUN.failed;
};

const runLine = (run: VenueLatestRun, now: Date): string => {
  const when = runWhen(run.at, now);
  const added =
    run.eventsInserted > 0 ? RUN.newShows(run.eventsInserted) : null;
  switch (run.reason) {
    case 'page_unchanged':
      return joined(RUN.unchanged, when);
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
  switch (run.status) {
    case 'success':
      return joined(RUN.success, when, added);
    case 'partial':
      return joined(RUN.partial, when, added);
    case 'failed':
      return errorLine(run);
    case 'skipped':
      return joined(RUN.skipped, when);
  }
};

/**
 * The latest-run cell (`04/venues-desktop`): "OK · 3:04 AM · 2 new",
 * "Failed: calendar block not found". A hand-paused venue reads its pause
 * instead, "Paused · Oct 28". HOLD: the board's "Paused by Hugh" needs a name,
 * and the API sends `crawlPausedBy` as a user id; "since Nov 10" on Unchanged
 * and "off-season until Apr 1" have no data yet.
 */
export const latestRunLine = (
  venue: VenueListRow,
  now: Date = new Date(),
): string => {
  const chips = deriveVenueStatusChips(venue);
  if (
    chips.onSite === 'live' &&
    chips.crawling === 'paused' &&
    venue.crawlPausedAt !== null
  ) {
    return RUN.pausedOn(
      formatISODate(venue.crawlPausedAt, DENVER_TIME_ZONE, {
        month: 'short',
        day: 'numeric',
      }),
    );
  }
  return venue.latestRun === null ? RUN.never : runLine(venue.latestRun, now);
};

/** "Paused: {reason}" (row 5); the Other reason shows its note. */
export const crawlingLabel = (
  venue: VenueWithEventCount,
): string | undefined => {
  const chips = deriveVenueStatusChips(venue);
  if (chips.onSite === 'hidden' || chips.crawling !== 'paused') {
    return undefined;
  }
  const reason = venue.crawlPauseReason;
  if (reason === 'other') {
    const note = venue.crawlPauseNote?.trim();
    return note ? COPY.pausedWith(note) : undefined;
  }
  return reason ? COPY.pausedWith(COPY.pauseReason[reason]) : undefined;
};

export const matchesFilter = (
  venue: VenueWithEventCount,
  filter: VenueFilter,
): boolean => {
  const chips = deriveVenueStatusChips(venue);
  switch (filter) {
    case 'all':
      return true;
    case 'paused':
      return chips.onSite === 'live' && chips.crawling === 'paused';
    case 'hidden':
      return chips.onSite === 'hidden';
    case 'disallowed':
      return venue.robotsTxtAllowed === false;
  }
};

export const matchesSearch = (
  venue: VenueWithEventCount,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [venue.name, venue.neighborhood ?? ''].some((text) =>
    text.toLowerCase().includes(needle),
  );
};

const OK_RANK = 6;

/**
 * Worst first (ruling 19): blocked, auto-paused, failing, paused, then OK by
 * name. Rank 3 is the Needs you dot, held until 2a. A hidden venue isn't
 * crawled, so it reads as not OK and sorts after paused, before OK.
 */
export const worstRank = (venue: VenueWithEventCount): number => {
  const { onSite, crawling } = deriveVenueStatusChips(venue);
  if (onSite === 'hidden') return 5;
  if (crawling === 'blocked') return 0;
  if (crawling === 'auto_paused') return 1;
  if (crawling === 'crawling' && isFailing(venue)) return 2;
  if (crawling === 'paused' || crawling === 'robots_disallowed') return 4;
  return OK_RANK;
};

const isFailing = (venue: VenueWithEventCount): boolean =>
  venue.consecutiveFailures > 0 || venue.lastRunStatus === 'failed';

export const isOk = (venue: VenueWithEventCount): boolean =>
  worstRank(venue) === OK_RANK;

export const sortWorstFirst = <T extends VenueWithEventCount>(
  venues: readonly T[],
): T[] =>
  [...venues].sort(
    (left, right) =>
      worstRank(left) - worstRank(right) || left.name.localeCompare(right.name),
  );

/**
 * Splits a worst-first list at the fold: every venue that isn't OK stays, and
 * OK venues fill up to `VISIBLE_ROWS`. OK venues sort last, so the fold is
 * always the tail. A fold of one row would hide nothing worth hiding.
 */
export const foldOk = <T extends VenueWithEventCount>(
  sorted: readonly T[],
): { shown: T[]; folded: T[] } => {
  const firstOk = sorted.findIndex(isOk);
  const keep = firstOk === -1 ? sorted.length : Math.max(firstOk, VISIBLE_ROWS);
  if (sorted.length - keep <= 1) return { shown: [...sorted], folded: [] };
  return { shown: sorted.slice(0, keep), folded: sorted.slice(keep) };
};
