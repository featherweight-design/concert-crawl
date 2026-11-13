import type {
  NeedsYouItem,
  Venue,
  VenueLatestRun,
  VenueWithEventCount,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { deriveVenueStatusChips } from '@/lib/admin/venue-status';
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time';

const COPY = ADMIN_COPY.venuesList;

/**
 * Filter chips that ship now, in the board's order (`04/venues-desktop`).
 * "Needs a look" counts venues with a Needs you dot (ruling 17); 2a has
 * landed, so it ships. Drafts wait on 3e, and "robots.txt changed" on its
 * storage. Disallowed is ruling 16's addition, last.
 */
export const VENUE_FILTERS = [
  'all',
  'needsLook',
  'paused',
  'hidden',
  'disallowed',
] as const;
export type VenueFilter = (typeof VENUE_FILTERS)[number];

/**
 * A venue row the rules read: the API's row, plus whether it has an item
 * waiting in Needs you (the pink dot). `needsLook` is unset when the Needs you
 * list didn't load.
 */
export type RankedVenue = VenueWithEventCount & { needsLook?: boolean };

/**
 * Open Needs you items per venue, for the dot and the "Needs a look" chip.
 * Every item with a venue counts, whatever its kind: the board's note is
 * "Pink dot: something in Needs you" (`04/venues-desktop`), and a venue's
 * dropped show or price check is as much a look as its failing crawl.
 *
 * This groups the full list from `GET /v1/admin/needs-you`, which relies on
 * that list being uncapped (it returns every open item). If it is ever paged,
 * this must switch to a per-venue count from `/needs-you/count`.
 */
/**
 * The boundary check on `GET /v1/admin/needs-you`: the list reads only each
 * item's `venueId`, so that is what must hold. Anything else (not an array,
 * an item without a string-or-null `venueId`) is null, the "no dots, no chip"
 * path, rather than a wrong dot.
 */
export const parseNeedsYou = (
  raw: unknown,
): Pick<NeedsYouItem, 'venueId'>[] | null => {
  if (!Array.isArray(raw)) return null;
  const items: Pick<NeedsYouItem, 'venueId'>[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || !('venueId' in item)) {
      return null;
    }
    const { venueId } = item;
    if (venueId !== null && typeof venueId !== 'string') return null;
    items.push({ venueId });
  }
  return items;
};

export const needsByVenue = (
  items: readonly Pick<NeedsYouItem, 'venueId'>[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.venueId === null) continue;
    counts.set(item.venueId, (counts.get(item.venueId) ?? 0) + 1);
  }
  return counts;
};

/** OK rows shown before the rest fold into "{N} more, all OK" (ruling 21). */
export const VISIBLE_ROWS = 10;

/**
 * A row as `GET /v1/admin/venues` sends it since #242, which leaves taken-down
 * venues out and adds the latest run. `VenueWithEventCount` in
 * packages/types doesn't carry `latestRun` yet, so the list names it here.
 */
export interface VenueListRow extends VenueWithEventCount {
  latestRun: VenueLatestRun | null;
  needsLook?: boolean;
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
  // A run that read shows is its outcome, whatever reason rode along (a
  // partial run can carry `no_events_found` for one of its pages).
  if (run.status === 'success') return joined(RUN.success, when, added);
  if (run.status === 'partial') return joined(RUN.partial, when, added);
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
  return run.status === 'failed' ? errorLine(run) : joined(RUN.skipped, when);
};

/**
 * The latest-run cell (`04/venues-desktop`): "OK · 3:04 AM · 2 new",
 * "Failed: calendar block not found". A hand-paused venue reads its pause
 * instead, "Paused · Oct 28", and so does an auto-paused one once its nightly
 * runs are skips for the pause: the failure that paused it is no longer the
 * latest run, and names who paused it when someone did: "Paused by Hugh ·
 * Oct 28" (`A3/03/venues-select-d`). HOLD: the auto-paused row's failure reason,
 * "since Nov 10" on Unchanged and "off-season until Apr 1" have no data yet.
 */
export const latestRunLine = (
  venue: VenueListRow,
  now: Date = new Date(),
): string => {
  const chips = deriveVenueStatusChips(venue);
  const pauseSkip = venue.latestRun?.reason === 'crawl_paused';
  if (
    chips.onSite === 'live' &&
    venue.crawlPausedAt !== null &&
    (chips.crawling === 'paused' ||
      (chips.crawling === 'auto_paused' && pauseSkip))
  ) {
    const date = formatISODate(venue.crawlPausedAt, DENVER_TIME_ZONE, {
      month: 'short',
      day: 'numeric',
    });
    return venue.crawlPausedByName
      ? RUN.pausedBy(venue.crawlPausedByName, date)
      : RUN.pausedOn(date);
  }
  return venue.latestRun === null ? RUN.never : runLine(venue.latestRun, now);
};

/**
 * "Paused: {reason}" (row 5); the Other reason shows its note. The venue
 * page's header chip says it the same way (one `VenueStatus` everywhere).
 */
export const crawlingLabel = (venue: Venue): string | undefined => {
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
  venue: RankedVenue,
  filter: VenueFilter,
): boolean => {
  const chips = deriveVenueStatusChips(venue);
  switch (filter) {
    case 'all':
      return true;
    case 'needsLook':
      return venue.needsLook === true;
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
 * Worst first (ruling 19): blocked, auto-paused, failing, the Needs you dot,
 * paused, then OK by name. A dot outranks paused, so a paused venue with an
 * item waiting rises to rank 3. A hidden venue isn't crawled, so it reads as
 * not OK and sorts after paused, before OK.
 */
export const worstRank = (venue: RankedVenue): number => {
  const { onSite, crawling } = deriveVenueStatusChips(venue);
  // Something waiting in Needs you outranks a quiet hidden venue: the chip
  // counts it, so the list mustn't bury it among the hidden ones.
  if (onSite === 'hidden') return venue.needsLook === true ? 3 : 5;
  if (crawling === 'blocked') return 0;
  if (crawling === 'auto_paused') return 1;
  if (crawling === 'crawling' && isFailing(venue)) return 2;
  if (venue.needsLook === true) return 3;
  if (crawling === 'paused' || crawling === 'robots_disallowed') return 4;
  return OK_RANK;
};

const isFailing = (venue: VenueWithEventCount): boolean =>
  venue.consecutiveFailures > 0 || venue.lastRunStatus === 'failed';

export const isOk = (venue: RankedVenue): boolean =>
  worstRank(venue) === OK_RANK;

export const sortWorstFirst = <T extends RankedVenue>(
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
export const foldOk = <T extends RankedVenue>(
  sorted: readonly T[],
): { shown: T[]; folded: T[] } => {
  const firstOk = sorted.findIndex(isOk);
  const keep = firstOk === -1 ? sorted.length : Math.max(firstOk, VISIBLE_ROWS);
  if (sorted.length - keep <= 1) return { shown: [...sorted], folded: [] };
  return { shown: sorted.slice(0, keep), folded: sorted.slice(keep) };
};
