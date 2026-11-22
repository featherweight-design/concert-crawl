import type { CrawlTrigger, VenueWithCrawlHealth } from '@concert-crawl/types';
import { z } from 'zod';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortTime } from './overview/overview-rules';

const COPY = ADMIN_COPY.venueHeader;

/** What the header's rules read from the venue. */
export type HeaderVenue = Pick<
  VenueWithCrawlHealth,
  | 'active'
  | 'verified'
  | 'robotsTxtAllowed'
  | 'crawlPausedAt'
  | 'neighborhood'
  | 'slug'
> & {
  deleteBlockers?: VenueWithCrawlHealth['deleteBlockers'];
  removedAt?: VenueWithCrawlHealth['removedAt'];
};

/** Off the site: hidden, or taken down (`removedAt`) whatever `active` says. */
const offSite = (venue: HeaderVenue): boolean =>
  !venue.active || (venue.removedAt ?? null) !== null;

/** Why Re-crawl is off, or null when it can run (`A3/03/re-crawl-states`). */
export type RecrawlOff = keyof typeof COPY.recrawlOff;

/**
 * The API refuses all four (`queueVenueCrawl`): a hidden or unverified venue
 * (400), a robots.txt disallow (409, never overridden) and a paused crawl
 * (409).
 */
export const recrawlOff = (venue: HeaderVenue): RecrawlOff | null => {
  // Taken down is never crawled again, so it never says "Show it on the site":
  // the API refuses Show on it too (409 venue_removed).
  if ((venue.removedAt ?? null) !== null) return 'removed';
  if (offSite(venue)) return 'hidden';
  if (!venue.verified) return 'unverified';
  if (venue.robotsTxtAllowed === false) return 'robots';
  // Paused and auto-paused alike (orchestrator ruling): resume first.
  if (venue.crawlPausedAt !== null) return 'paused';
  return null;
};

/**
 * On Concert Crawl opens our public venue page. A hidden or taken-down venue
 * has none (the page 404s), so it gets no link; the venue's own site still
 * shows for every venue (`venueSiteLink`). `08/venue-header-links`.
 */
export const concertCrawlHref = (venue: HeaderVenue): string | null =>
  offSite(venue) ? null : `/venues/${encodeURIComponent(venue.slug)}`;

/** On the venue's site: where it opens, and the phone link's text. */
export interface VenueSiteLink {
  href: string;
  /** The bare host, "ballarena.com" on the board. */
  host: string;
}

/**
 * The venue's own site, from the origin of the URL we crawl (Hugh,
 * 2026-11-22: no new field), so a calendar or feed path never opens. Null
 * when the URL isn't a full http(s) one: "No website, no link".
 */
export const venueSiteLink = (
  venue: Pick<VenueWithCrawlHealth, 'websiteUrl'>,
): VenueSiteLink | null => {
  if (!URL.canParse(venue.websiteUrl)) return null;
  const url = new URL(venue.websiteUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return { href: url.origin, host: url.hostname.replace(/^www\./, '') };
};

const startedAtSchema = z.iso.datetime({ offset: true });

/**
 * When a running re-crawl started, once the trigger reads `processing`: its
 * `startedAt`, stamped as the crawler claims it (migration 0121). A row that
 * predates it falls back to `updatedAt`, which the claim also stamps, but
 * only before the first progress write (`progressAt` null): each progress
 * write moves `updatedAt` on, so after one it no longer says when the crawl
 * started and the start reads as unknown. Null for any other status or a
 * time that won't parse.
 */
export const runningSince = (
  trigger: Pick<
    CrawlTrigger,
    'status' | 'startedAt' | 'updatedAt' | 'progressAt'
  >,
): string | null => {
  if (trigger.status !== 'processing') return null;
  const claimedAt =
    trigger.startedAt ??
    ((trigger.progressAt ?? null) === null ? trigger.updatedAt : null);
  if (claimedAt === null) return null;
  const parsed = startedAtSchema.safeParse(claimedAt);
  return parsed.success ? parsed.data : null;
};

/** A count the crawler wrote, or null when it is missing or isn't one. */
const pageCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

/**
 * Where a re-crawl in flight stands, from the latest polled trigger
 * (`GET /v1/admin/crawl/triggers/:id`): what the header line reads while it
 * is Queued or Crawling now (`A3/03/re-crawl-states`).
 */
export interface RecrawlProgress {
  /** When the crawler claimed it (ISO); null until it is `processing`. */
  startedAt: string | null;
  /** Pages crawled so far; null before the first. */
  pagesDone: number | null;
  /** Pages this crawl will read; null until the crawler knows. */
  pagesTotal: number | null;
  /**
   * Another trigger is being crawled right now. The API sets it whatever the
   * trigger's status; the header reads it only while Queued.
   */
  runningAhead: boolean;
  /** Pending only: about how long until it starts; null when unknown. */
  waitMs: number | null;
}

export const recrawlProgress = (
  trigger: Pick<
    CrawlTrigger,
    | 'status'
    | 'startedAt'
    | 'updatedAt'
    | 'progressAt'
    | 'pagesDone'
    | 'pagesTotal'
    | 'progress'
  >,
): RecrawlProgress => {
  const waitMs = trigger.progress?.waitMs;
  return {
    startedAt: runningSince(trigger),
    pagesDone: pageCount(trigger.pagesDone),
    pagesTotal: pageCount(trigger.pagesTotal),
    runningAhead: trigger.progress?.runningAhead === true,
    waitMs:
      typeof waitMs === 'number' && Number.isFinite(waitMs) && waitMs >= 0
        ? waitMs
        : null,
  };
};

/** A re-crawl in flight, as the header line reads it. */
export interface RecrawlLine {
  state: 'queued' | 'running';
  progress: RecrawlProgress | null;
}

/** Whole minutes, never under one: "about 2 min" (`A3/03/re-crawl-states`). */
const waitMinutes = (waitMs: number): number =>
  Math.max(1, Math.round(waitMs / 60_000));

/**
 * The desktop line while a re-crawl is in flight, or null for the venue's
 * own line. Queued behind another crawl: "Starts after the run in progress
 * · about 2 min", the wait left off when unknown. Crawling now: "Page 2 of
 * 4 · started 3:41 PM", or "Started 3:41 PM" until the page count is known.
 * Queued with nothing running ahead isn't drawn, so it keeps the venue's
 * line.
 */
const recrawlLine = (recrawl: RecrawlLine): string | null => {
  const { progress } = recrawl;
  if (progress === null) return null;
  if (recrawl.state === 'queued') {
    if (!progress.runningAhead) return null;
    return progress.waitMs === null
      ? COPY.startsAfterRun
      : [
          COPY.startsAfterRun,
          COPY.aboutMinutes(waitMinutes(progress.waitMs)),
        ].join(' · ');
  }
  if (progress.startedAt === null) return null;
  const time = shortTime(progress.startedAt);
  const total = progress.pagesTotal;
  if (total === null || total === 0) return COPY.startedAt(time);
  const done = Math.min(progress.pagesDone ?? 0, total);
  return COPY.pageProgress(done, total, time);
};

/**
 * The line beside the chips: "Central Platte Valley · 235 upcoming", or why
 * Re-crawl is off. The phone keeps the neighbourhood under the name instead
 * (`A3/03/venue-overview-m`), so its line is only the reason. While a
 * re-crawl is queued or running, the desktop line reads where it stands
 * (`recrawlLine`, `A3/03/re-crawl-states`). Those states are drawn for
 * desktop only, so the phone line doesn't add them.
 */
export const headerLine = (
  venue: HeaderVenue,
  isPhone: boolean,
  recrawl: RecrawlLine | null = null,
): string => {
  const off = recrawlOff(venue);
  if (off !== null) return COPY.recrawlOff[off];
  if (isPhone) return '';
  const inFlight = recrawl === null ? null : recrawlLine(recrawl);
  if (inFlight !== null) return inFlight;
  const shows = venue.deleteBlockers?.upcomingShows ?? null;
  return [venue.neighborhood, shows === null ? null : COPY.upcoming(shows)]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
};
