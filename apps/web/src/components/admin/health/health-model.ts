import {
  scheduledCrawlAt,
  type CrawlRun,
  type DailyCost,
  type Venue,
} from '@concert-crawl/types';
import { deriveVenueStatusChips } from '@/lib/admin/venue-status';
import { formatCost } from '@/components/admin/primitives/utils';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

// Pure derivations for the Health page (admin 1c). No React, no fetches:
// the page loads, these decide.

const MT = 'America/Denver';
const HOUR_MS = 3_600_000;
/**
 * The daily crawl's cron fires at 09:07 UTC (`apps/api/vercel.json`): 3:07 AM
 * MDT but 2:07 AM MST. Anchoring on a fixed MT hour would miss the first hour
 * of every winter crawl, so the boundary is the cron's UTC hour.
 */
const CRAWL_HOUR_UTC = 9;

/** One row of `GET /v1/admin/crawl/status`: a venue and its newest run. */
export interface HealthStatusRow {
  id: string;
  name: string;
  lastRun: Pick<
    CrawlRun,
    'status' | 'reason' | 'createdAt' | 'eventsFound' | 'eventsInserted'
  > | null;
}

export type GridVenue = Pick<
  Venue,
  | 'id'
  | 'active'
  | 'crawlPausedAt'
  | 'blockedAt'
  | 'consecutiveFailures'
  | 'robotsTxtAllowed'
>;

interface MtParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export const mtParts = (at: Date): MtParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  };
};

/**
 * The UTC instant of 00:00 MT on a calendar date (day may overflow, as with
 * `Date.UTC`). DST switches at 2 AM, so 07:00Z, which is midnight MST or 1 AM
 * MDT, always reads that midnight's offset.
 */
const mtMidnight = (year: number, month: number, day: number): number => {
  const probe = Date.UTC(year, month - 1, day, 7);
  return probe - mtParts(new Date(probe)).hour * HOUR_MS;
};

export interface Window {
  start: number;
  end: number;
}

/**
 * "Last night": the MT calendar day of the newest daily crawl that has
 * started. Before the cron hour (2 AM MST, 3 AM MDT) that is yesterday. MT day
 * D's 09:00Z always falls inside D (its midnight is 06:00Z or 07:00Z). A
 * by-hand run later the same day falls inside it too (gap G2).
 */
export const lastNightWindow = (now: Date): Window => {
  const parts = mtParts(now);
  const cronAt = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    CRAWL_HOUR_UTC,
  );
  const day = now.getTime() < cronAt ? parts.day - 1 : parts.day;
  return {
    start: mtMidnight(parts.year, parts.month, day),
    end: mtMidnight(parts.year, parts.month, day + 1),
  };
};

const inWindow = (iso: string, window: Window): boolean => {
  const at = Date.parse(iso);
  return at >= window.start && at < window.end;
};

const runLastNight = (row: HealthStatusRow, window: Window) =>
  row.lastRun &&
  row.lastRun.status !== 'in_progress' &&
  inWindow(row.lastRun.createdAt, window)
    ? row.lastRun
    : null;

export interface CrawlSummary {
  ok: number;
  total: number;
  failed: number;
  finishedAt: string | null;
  shows: number;
  added: number;
}

export const summarizeCrawl = (
  rows: HealthStatusRow[],
  window: Window,
): CrawlSummary => {
  const summary: CrawlSummary = {
    ok: 0,
    total: 0,
    failed: 0,
    finishedAt: null,
    shows: 0,
    added: 0,
  };
  for (const row of rows) {
    const run = runLastNight(row, window);
    if (!run) continue;
    summary.total += 1;
    if (run.status === 'failed') summary.failed += 1;
    else summary.ok += 1;
    summary.shows += run.eventsFound;
    summary.added += run.eventsInserted;
    if (!summary.finishedAt || run.createdAt > summary.finishedAt) {
      summary.finishedAt = run.createdAt;
    }
  }
  return summary;
};

/**
 * Built states only: "Running" waits on 1d, and off-season "Quiet" is open.
 * Any failure reads "N failed" (gap G1 asks where the line is). `missed` is
 * the nightly that never started (`03/tiles-in-each-state`, "Didn't run"); it
 * outranks by-hand runs in the same window, since the job itself did not run.
 */
export type CrawlTileState = 'onTime' | 'failed' | 'noRuns' | 'missed';

export const crawlTileState = (
  summary: CrawlSummary,
  missedAt: string | null = null,
): CrawlTileState => {
  if (missedAt !== null) return 'missed';
  if (summary.total === 0) return 'noRuns';
  return summary.failed > 0 ? 'failed' : 'onTime';
};

/** The Mountain Time date (`YYYY-MM-DD`) a last-night window covers. */
export const windowNight = (window: Window): string => {
  const { year, month, day } = mtParts(new Date(window.start));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
};

/** The newest nightly batch, as `/v1/admin/crawl/batches` reports it. */
export interface NightlyBatch {
  night: string | null;
  didntStart: boolean;
}

/**
 * When last night's crawl was due, ISO, if it never started; else null. Only
 * the batch for the window's own night counts: an older miss is not "last
 * night", and before the API's deadline tonight is not due yet.
 */
export const missedCrawlAt = (
  newest: NightlyBatch | null,
  window: Window,
): string | null =>
  newest?.didntStart === true &&
  newest.night !== null &&
  newest.night === windowNight(window)
    ? scheduledCrawlAt(newest.night)
    : null;

/**
 * Last night's failed venues that have an open Needs you item (venue-failing
 * or venue-blocked): the crawl tile's "The {m} new failures are in Needs you"
 * (1c Q5). It reads the footer's set, so the two never disagree.
 */
export const newFailuresInNeedsYou = (
  failed: GridCell[],
  venueIds: ReadonlySet<string>,
): number => failed.filter((cell) => venueIds.has(cell.id)).length;

/**
 * The grid's Failed and Paused venues that are in Needs you (failing or
 * blocked), worst group first: the footer's "Only {name} is in Needs you."
 */
export const gridVenuesInNeedsYou = (
  groups: Record<GridGroup, GridCell[]>,
  venueIds: ReadonlySet<string>,
): string[] =>
  [...groups.failed, ...groups.paused]
    .filter((cell) => venueIds.has(cell.id))
    .map((cell) => cell.name);

export interface MonthToDate {
  year: number;
  month: number;
  dayOfMonth: number;
  daysInMonth: number;
}

export const monthToDate = (now: Date): MonthToDate => {
  const parts = mtParts(now);
  return {
    year: parts.year,
    month: parts.month,
    dayOfMonth: parts.day,
    daysInMonth: new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate(),
  };
};

/** The month before, as a whole month (its "day of month" is its last day). */
export const previousMonth = (month: MonthToDate): MonthToDate => {
  const year = month.month === 1 ? month.year - 1 : month.year;
  const number = month.month === 1 ? 12 : month.month - 1;
  const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { year, month: number, dayOfMonth: daysInMonth, daysInMonth };
};

/** What the days of `month` add up to, a day with no spend counting as $0. */
export const monthTotal = (days: DailyCost[], month: MonthToDate): number =>
  monthSeries(days, month).reduce((sum, day) => sum + (day.costUsd ?? 0), 0);

/** `noBudget` is gap G5: no budget set, so no pill and no budget line. */
export type CostTileState = 'under' | 'willGoOver' | 'over' | 'noBudget';

export const costTile = (
  mtdUsd: number,
  budgetUsd: number | null,
  month: MonthToDate,
): { state: CostTileState; paceUsd: number } => {
  const paceUsd = (mtdUsd / month.dayOfMonth) * month.daysInMonth;
  if (budgetUsd === null) return { state: 'noBudget', paceUsd };
  if (mtdUsd > budgetUsd) return { state: 'over', paceUsd };
  return { state: paceUsd > budgetUsd ? 'willGoOver' : 'under', paceUsd };
};

/** Every day of the month; days still to come carry `costUsd: null`. */
export const monthSeries = (
  days: DailyCost[],
  month: MonthToDate,
): Array<{ date: string; costUsd: number | null }> => {
  const byDate = new Map(days.map((day) => [day.date, day.costUsd]));
  const prefix = `${month.year}-${String(month.month).padStart(2, '0')}`;
  return Array.from({ length: month.daysInMonth }, (_, i) => {
    const date = `${prefix}-${String(i + 1).padStart(2, '0')}`;
    return {
      date,
      costUsd: i < month.dayOfMonth ? (byDate.get(date) ?? 0) : null,
    };
  });
};

export interface ArtistCounts {
  matched: number;
  auto_matched: number;
  /** The Artists To check tab's own count, and its "shows soon" chip. */
  to_check: number;
  to_check_soon: number;
  /** To check with a show later than the soon window, and with no show. */
  to_check_later: number;
  to_check_none: number;
  no_match: number;
}

/** Artist sync's four rows, in the board's order. */
export const artistSyncRows = (counts: ArtistCounts) =>
  [
    {
      key: 'matched',
      label: ADMIN_COPY.health.artistSync.matched,
      count: counts.matched + counts.auto_matched,
    },
    {
      key: 'soon',
      label: ADMIN_COPY.health.artistSync.unsureSoon,
      count: counts.to_check_soon,
    },
    {
      key: 'later',
      label: ADMIN_COPY.health.artistSync.unsureLater,
      count: counts.to_check_later + counts.to_check_none,
    },
    {
      key: 'none',
      label: ADMIN_COPY.health.artistSync.noMatch,
      count: counts.no_match,
    },
  ] as const;

export const artistsTile = (counts: ArtistCounts) => ({
  matched: counts.matched + counts.auto_matched,
  // With nothing unsure and soon, the tile reads the plain To check line.
  soon: counts.to_check_soon > 0 ? counts.to_check_soon : null,
  toCheck: counts.to_check,
});

export type GridGroup = 'failed' | 'paused' | 'quiet' | 'ok';
export const GRID_GROUPS: GridGroup[] = ['failed', 'paused', 'quiet', 'ok'];

export interface GridCell {
  id: string;
  name: string;
  failures: number;
  autoPaused: boolean;
}

/**
 * Last night's venues, worst group first and by name within a group. A failed
 * run outranks a pause, so the venue its 3rd failure just paused reads Failed.
 * Quiet on purpose is "Page unchanged" only (gap G7).
 */
export const groupVenues = (
  rows: HealthStatusRow[],
  venues: GridVenue[],
  window: Window,
): Record<GridGroup, GridCell[]> => {
  const groups: Record<GridGroup, GridCell[]> = {
    failed: [],
    paused: [],
    quiet: [],
    ok: [],
  };
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  for (const row of rows) {
    const venue = venuesById.get(row.id);
    if (!venue) continue;
    const { onSite, crawling } = deriveVenueStatusChips(venue);
    const run = runLastNight(row, window);
    const cell: GridCell = {
      id: row.id,
      name: row.name,
      // A failed run last night is at least the 1st failure, whatever the
      // counter says (a 403 blocks without waiting for three).
      failures:
        run?.status === 'failed'
          ? Math.max(1, venue.consecutiveFailures)
          : venue.consecutiveFailures,
      autoPaused: crawling === 'auto_paused',
    };
    // Every failure the Crawl tile counts is listed, a blocked venue's
    // included, so the tile's "N failed" and the Failed group agree.
    if (run?.status === 'failed') {
      groups.failed.push(cell);
      continue;
    }
    // GAP G6: hidden, blocked and robots.txt venues have no drawn group, so
    // otherwise they stay off the grid until Design draws one.
    if (
      onSite === 'hidden' ||
      crawling === 'blocked' ||
      crawling === 'robots_disallowed'
    ) {
      continue;
    }
    if (crawling === 'paused' || crawling === 'auto_paused') {
      groups.paused.push(cell);
    } else if (!run) {
      // No run last night and not paused is "Didn't run", which waits on 1d.
      continue;
    } else if (run.reason === 'page_unchanged') groups.quiet.push(cell);
    else groups.ok.push(cell);
  }
  for (const key of GRID_GROUPS) {
    groups[key].sort((left, right) => left.name.localeCompare(right.name));
  }
  return groups;
};

/**
 * Board money: "$15", "$4.12", "$0.37". Real spend under a cent falls back to
 * the admin `formatCost` ("$0.0042") so it never reads as "$0.00" (#874).
 */
export const formatUsd = (value: number): string => {
  if (Number.isInteger(value)) return `$${value}`;
  if (value > 0 && value < 0.005) return formatCost(value);
  return `$${value.toFixed(2)}`;
};

export const formatMtTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: MT,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

/** "Nov" for a 1-based month. */
export const formatMonth = (month: number): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
