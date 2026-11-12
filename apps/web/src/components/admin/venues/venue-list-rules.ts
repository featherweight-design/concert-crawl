import type { VenueWithEventCount } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { deriveVenueStatusChips } from '@/lib/admin/venue-status';

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
 * HOLD, #242 resolves: a taken-down venue is gone from the list (row 11). The
 * API still returns them until #242 filters them server-side; then this goes.
 */
export const withoutTakenDown = (
  venues: readonly VenueWithEventCount[],
): VenueWithEventCount[] => venues.filter((venue) => venue.removedAt === null);

/**
 * The latest-run cell. HOLD, #242 resolves: today the API returns only the
 * run's status, so the time, the new-show count, the failure reason and
 * "Paused by" wait for `latestRun` and `crawlPausedBy`.
 */
export const latestRunLine = (venue: VenueWithEventCount): string =>
  venue.lastRunStatus === null
    ? COPY.latestRun.never
    : COPY.latestRun[venue.lastRunStatus];

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

export const sortWorstFirst = (
  venues: readonly VenueWithEventCount[],
): VenueWithEventCount[] =>
  [...venues].sort(
    (left, right) =>
      worstRank(left) - worstRank(right) || left.name.localeCompare(right.name),
  );

/**
 * Splits a worst-first list at the fold: every venue that isn't OK stays, and
 * OK venues fill up to `VISIBLE_ROWS`. OK venues sort last, so the fold is
 * always the tail. A fold of one row would hide nothing worth hiding.
 */
export const foldOk = (
  sorted: readonly VenueWithEventCount[],
): { shown: VenueWithEventCount[]; folded: VenueWithEventCount[] } => {
  const firstOk = sorted.findIndex(isOk);
  const keep = firstOk === -1 ? sorted.length : Math.max(firstOk, VISIBLE_ROWS);
  if (sorted.length - keep <= 1) return { shown: [...sorted], folded: [] };
  return { shown: sorted.slice(0, keep), folded: sorted.slice(keep) };
};
