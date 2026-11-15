import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ApiError } from '@/lib/api';

/**
 * The refusals `POST /v1/admin/crawl/:id` sends a test re-crawl
 * (`{ trial: true }`). The 409s carry a code: one is already queued, the
 * venue is blocked, its crawl isn't paused any more, or robots.txt disallows
 * the page. The 400 (`not_crawlable`: hidden or unverified) carries none, so
 * it is told by its status.
 */
const CODED_REFUSALS = [
  'trial_pending',
  'blocked',
  'not_paused',
  'robots_disallowed',
] as const;
export const TRIAL_REFUSALS = [...CODED_REFUSALS, 'not_crawlable'] as const;
export type TrialRefusal = (typeof TRIAL_REFUSALS)[number];

export type TrialOutcome = { ok: true } | { ok: false; code: TrialRefusal };

const isCodedRefusal = (
  code: unknown,
): code is (typeof CODED_REFUSALS)[number] =>
  CODED_REFUSALS.some((known) => known === code);

/** A trial's refusal, or null for any other failure. */
export const trialRefusalOf = (err: unknown): TrialRefusal | null => {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 409 && isCodedRefusal(err.code)) return err.code;
  if (err.status === 400) return 'not_crawlable';
  return null;
};

/**
 * Whether the ⋯ menu offers Try a re-crawl: the API's own gates for a trial
 * (`queueVenueTrial`), read from the page's venue. Paused, not blocked, on
 * the site and verified, and robots.txt not disallowing it. Taken down is
 * `active` false, so it is covered too.
 */
export const canTryRecrawl = (
  venue: Pick<
    VenueWithCrawlHealth,
    'crawlPausedAt' | 'blockedAt' | 'active' | 'verified' | 'robotsTxtAllowed'
  >,
): boolean =>
  venue.crawlPausedAt !== null &&
  venue.blockedAt === null &&
  venue.active &&
  venue.verified &&
  venue.robotsTxtAllowed !== false;
